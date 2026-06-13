"""Pydantic validation for certification content packs.

These models validate the structure of a pack *before* anything is written to
the database. The importer (``PackImportService.import_pack``) loads every YAML
file, builds a :class:`PackSpec` from it, and runs both per-file (Pydantic) and
cross-file (referential integrity) validation. If anything fails it raises
:class:`PackValidationError` with a human-readable list of problems and never
touches the DB — a malformed pack can no longer corrupt the database.

The enums here intentionally mirror the database models so the validator stays
in sync with what the importer actually persists:
  * difficulty for *questions* is the strict ``easy|medium|hard`` set used by the
    adaptive engine.
  * learning-bit ``type`` mirrors ``models.LearningBitType``; learning-bit
    ``difficulty`` is deliberately left free-form because existing content uses
    pedagogical levels (``beginner``/``intermediate``) rather than the question
    difficulty scale.
"""

import os
from enum import Enum

import yaml
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator, model_validator


class QuestionDifficulty(str, Enum):
    """Difficulty levels understood by the adaptive engine."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class LearningBitType(str, Enum):
    """Mirror of ``app.database.models.LearningBitType``."""

    CONCEPT = "concept"
    ANALOGY = "analogy"
    EXAMPLE = "example"
    COMMON_MISTAKE = "common_mistake"
    BEST_PRACTICE = "best_practice"
    EXAM_TRAP = "exam_trap"
    COMPARISON = "comparison"
    MEMORY_RULE = "memory_rule"
    NON_TECHNICAL_EXPLANATION = "non_technical_explanation"
    TECHNICAL_EXPLANATION = "technical_explanation"


class PackValidationError(ValueError):
    """Raised when a pack fails structural or referential validation.

    ``errors`` is the full list of problems found (one human-readable string per
    problem). ``str(exc)`` renders them as a single multi-line message so the
    importer can surface a useful error to the caller / audit log.
    """

    def __init__(self, errors: list[str]):
        self.errors = errors
        message = "Pack validation failed with {} error(s):\n  - {}".format(
            len(errors), "\n  - ".join(errors)
        )
        super().__init__(message)


class PackManifest(BaseModel):
    """``pack.yml`` — the pack manifest."""

    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    version: str
    provider: str
    certification_id: str | None = None
    description: str | None = None

    @field_validator("id", "name", "version", "provider")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value or not str(value).strip():
            raise ValueError("must not be blank")
        return value


class CertificationSpec(BaseModel):
    """``certification.yml`` — certification metadata."""

    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    provider: str
    version: str
    description: str | None = None


class DomainSpec(BaseModel):
    """An entry in ``domains.yml``."""

    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    weight: float

    @field_validator("weight")
    @classmethod
    def _weight_in_range(cls, value: float) -> float:
        if value < 0 or value > 100:
            raise ValueError(f"weight must be between 0 and 100, got {value}")
        return value


class SkillSpec(BaseModel):
    """An entry in ``skills.yml``."""

    model_config = ConfigDict(extra="allow")

    id: str
    domain_id: str
    name: str
    level: str | None = None
    description: str | None = None


class QuestionSpec(BaseModel):
    """An entry in ``questions.yml``.

    Validates that there are at least two options and that ``correct_answer`` is
    one of them — the single most important content invariant for the engine.
    """

    model_config = ConfigDict(extra="allow")

    skill_id: str
    prompt: str
    options: list[str]
    correct_answer: str
    difficulty: QuestionDifficulty = QuestionDifficulty.MEDIUM
    explanation: str | None = None
    id: str | None = None
    status: str | None = None

    @field_validator("options")
    @classmethod
    def _at_least_two_distinct_options(cls, value: list[str]) -> list[str]:
        if len(value) < 2:
            raise ValueError(f"must have at least 2 options, got {len(value)}")
        if len(set(value)) != len(value):
            raise ValueError("options must be unique")
        return value

    @model_validator(mode="after")
    def _correct_answer_in_options(self) -> "QuestionSpec":
        if self.correct_answer not in self.options:
            raise ValueError(
                f"correct_answer {self.correct_answer!r} is not one of the options "
                f"{self.options!r}"
            )
        return self


class LearningBitSpec(BaseModel):
    """An entry in ``learning_bits.yml``."""

    model_config = ConfigDict(extra="allow")

    type: LearningBitType
    title: str
    content: str
    skill_id: str | None = None
    id: str | None = None
    # Learning-bit difficulty uses pedagogical levels (beginner/intermediate),
    # not the question difficulty scale, so it is left free-form here.
    difficulty: str | None = None


class PackSpec(BaseModel):
    """Aggregate of an entire validated pack.

    Per-item (Pydantic) validation happens on the individual specs. Cross-file
    referential integrity is checked by :func:`check_referential_integrity`,
    which is invoked by :func:`load_and_validate_pack` so it can raise a clean
    :class:`PackValidationError` (Pydantic would otherwise re-wrap it and hide
    the structured ``errors`` list).
    """

    manifest: PackManifest
    certification: CertificationSpec
    domains: list[DomainSpec]
    skills: list[SkillSpec]
    questions: list[QuestionSpec] = []
    learning_bits: list[LearningBitSpec] = []


def check_referential_integrity(spec: PackSpec) -> list[str]:
    """Return a list of cross-file referential problems (empty when sound)."""
    errors: list[str] = []

    domain_ids = {d.id for d in spec.domains}
    skill_ids = {s.id for s in spec.skills}

    # Each skill must point at a domain that exists.
    for i, skill in enumerate(spec.skills):
        if skill.domain_id not in domain_ids:
            errors.append(
                f"skills.yml[{i}] skill {skill.id!r}: domain_id "
                f"{skill.domain_id!r} does not exist in domains.yml"
            )

    # Each question must point at a skill that exists.
    for i, question in enumerate(spec.questions):
        if question.skill_id not in skill_ids:
            qref = question.id or f"index {i}"
            errors.append(
                f"questions.yml[{i}] question {qref!r}: skill_id "
                f"{question.skill_id!r} does not exist in skills.yml"
            )

    # Learning bits may reference a skill; if they do it must exist.
    for i, bit in enumerate(spec.learning_bits):
        if bit.skill_id is not None and bit.skill_id not in skill_ids:
            bref = bit.id or f"index {i}"
            errors.append(
                f"learning_bits.yml[{i}] bit {bref!r}: skill_id "
                f"{bit.skill_id!r} does not exist in skills.yml"
            )

    return errors


def _format_pydantic_errors(filename: str, item_ref: str, exc: ValidationError) -> list[str]:
    """Turn a pydantic ValidationError into per-field readable messages."""
    messages = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err["loc"]) or "<root>"
        messages.append(f"{filename} ({item_ref}): field '{loc}': {err['msg']}")
    return messages


def _load_yaml(pack_path: str, filename: str, *, required: bool):
    """Load a YAML file, returning (data, error_or_None).

    A missing required file or a YAML syntax error is reported as a validation
    error rather than raising, so all problems can be collected together.
    """
    full_path = os.path.join(pack_path, filename)
    if not os.path.exists(full_path):
        if required:
            return None, f"{filename}: required file is missing"
        return None, None
    try:
        with open(full_path) as f:
            return yaml.safe_load(f), None
    except yaml.YAMLError as exc:
        return None, f"{filename}: invalid YAML: {exc}"


def load_and_validate_pack(pack_path: str) -> PackSpec:
    """Load every YAML in a pack and validate it, failing fast on any problem.

    Raises :class:`PackValidationError` listing *all* problems found (missing
    files, malformed YAML, per-item schema violations and cross-file referential
    integrity). On success returns the validated :class:`PackSpec`. This function
    never touches the database.
    """
    errors: list[str] = []

    manifest_data, err = _load_yaml(pack_path, "pack.yml", required=True)
    if err:
        errors.append(err)
    cert_data, err = _load_yaml(pack_path, "certification.yml", required=True)
    if err:
        errors.append(err)
    domains_data, err = _load_yaml(pack_path, "domains.yml", required=True)
    if err:
        errors.append(err)
    skills_data, err = _load_yaml(pack_path, "skills.yml", required=True)
    if err:
        errors.append(err)
    questions_data, err = _load_yaml(pack_path, "questions.yml", required=False)
    if err:
        errors.append(err)
    bits_data, err = _load_yaml(pack_path, "learning_bits.yml", required=False)
    if err:
        errors.append(err)

    # If core files could not even be read there is nothing more to validate.
    if errors:
        raise PackValidationError(errors)

    manifest = None
    try:
        manifest = PackManifest.model_validate(manifest_data)
    except ValidationError as exc:
        errors.extend(_format_pydantic_errors("pack.yml", "manifest", exc))

    certification = None
    try:
        certification = CertificationSpec.model_validate(cert_data)
    except ValidationError as exc:
        errors.extend(_format_pydantic_errors("certification.yml", "certification", exc))

    domains = _validate_list(domains_data, DomainSpec, "domains.yml", "id", errors)
    skills = _validate_list(skills_data, SkillSpec, "skills.yml", "id", errors)
    questions = _validate_list(questions_data or [], QuestionSpec, "questions.yml", "skill_id", errors)
    bits = _validate_list(bits_data or [], LearningBitSpec, "learning_bits.yml", "id", errors)

    if errors:
        raise PackValidationError(errors)

    # Everything parsed individually: assemble and run cross-file checks.
    spec = PackSpec(
        manifest=manifest,
        certification=certification,
        domains=domains,
        skills=skills,
        questions=questions,
        learning_bits=bits,
    )
    referential_errors = check_referential_integrity(spec)
    if referential_errors:
        raise PackValidationError(referential_errors)
    return spec


def _validate_list(data, model, filename: str, ref_field: str, errors: list[str]):
    """Validate every item of a YAML list, accumulating readable errors."""
    validated = []
    if data is None:
        return validated
    if not isinstance(data, list):
        errors.append(f"{filename}: expected a list of items, got {type(data).__name__}")
        return validated
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            errors.append(f"{filename}[{i}]: expected a mapping, got {type(item).__name__}")
            continue
        ref = item.get(ref_field, f"index {i}")
        try:
            validated.append(model.model_validate(item))
        except ValidationError as exc:
            errors.extend(_format_pydantic_errors(filename, f"{ref_field}={ref!r}", exc))
    return validated
