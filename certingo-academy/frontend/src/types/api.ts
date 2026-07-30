// API response/request domain types — Phase 4.
//
// These interfaces describe every payload the frontend consumes or sends.
// They are intentionally permissive where the backend contract is still
// evolving (optional fields, index signatures) so that real responses with
// extra keys do not break typing, while the fields the UI actually reads stay
// strongly typed.

/* -------------------------------------------------------------------------- */
/* Shared primitives                                                          */
/* -------------------------------------------------------------------------- */

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Standard FastAPI error body: `{ "detail": "..." }` (or a validation list). */
export interface ApiErrorBody {
  detail?: string | { msg: string; [key: string]: unknown }[];
}

/* -------------------------------------------------------------------------- */
/* Student — questions, lessons, practice, exam                               */
/* -------------------------------------------------------------------------- */

/** A practice/exam question as rendered by the learner-facing pages. */
export interface PracticeQuestion {
  id: string;
  prompt: string;
  options: string[];
  difficulty: Difficulty;
  /** Present once the question has been answered/revealed. */
  correct_answer?: string;
  explanation?: string;
  skill_id?: string;
  source?: string;
}

export interface AnswerFeedback {
  message: string;
  technical_note?: string;
  [key: string]: unknown;
}

/** Response of POST /api/academy/practice/submit/{userId}. */
export interface PracticeResult {
  is_correct: boolean;
  feedback: AnswerFeedback;
  correct_answer?: string;
  [key: string]: unknown;
}

/** Body of POST /api/academy/practice/submit/{userId}. */
export interface PracticeSubmission {
  question_id: string;
  selected_answer: string;
}

/** Response of GET /api/academy/practice/next/{userId}. */
export interface NextPracticeResponse {
  question: PracticeQuestion;
  [key: string]: unknown;
}

/** A generated lesson, as returned by GET /api/academy/lesson/next/{userId}. */
export interface Lesson {
  skill_id: string;
  title: string;
  analogy?: string;
  simple_explanation: string;
  example?: string;
  common_mistake?: string;
  exam_tip?: string;
  question: PracticeQuestion;
  [key: string]: unknown;
}

/**
 * Marker returned (with HTTP 200) when the knowledge base holds too little
 * verified content to generate for a skill. See `AIService.generate_lesson`.
 */
export interface InsufficientContext {
  status: 'insufficient_context';
  message?: string;
  skill_id?: string;
  [key: string]: unknown;
}

/**
 * Response of GET /api/academy/lesson/next/{userId}: either a lesson or the
 * `insufficient_context` marker. Narrow with {@link isInsufficientContext}
 * before touching lesson fields.
 */
export type NextLessonResponse = Lesson | InsufficientContext;

export function isInsufficientContext(
  res: NextLessonResponse | null | undefined
): res is InsufficientContext {
  return !!res && (res as InsufficientContext).status === 'insufficient_context';
}

/** Body of POST /api/academy/lesson/submit/{userId}. */
export interface LessonSubmission {
  question_id: string;
  selected_answer: string;
  skill_id: string;
}

/**
 * A single exam question as returned by the exam *start* endpoint.
 *
 * Unlike {@link PracticeQuestion}, this shape intentionally omits
 * `correct_answer` and `explanation`: grading happens on the server, and the
 * start payload never reveals the answer key to the client.
 */
export interface ExamQuestion {
  id: string;
  prompt: string;
  options: string[];
  difficulty: Difficulty;
  domain_id: string;
}

/** Response of POST /api/academy/exam/start/{userId}. */
export interface ExamStartResponse {
  exam_id: string;
  questions: ExamQuestion[];
  total: number;
  duration_minutes: number;
}

/** A single answer submitted for grading (POST /api/academy/exam/submit). */
export interface ExamAnswer {
  question_id: string;
  selected_answer: string;
}

/** Body of POST /api/academy/exam/submit/{userId}. */
export interface ExamSubmission {
  exam_id: string;
  answers: ExamAnswer[];
}

/** Per-domain score breakdown returned alongside the exam result. */
export interface DomainBreakdown {
  domain_id: string;
  name: string;
  /** Domain score as a 0-1 fraction. */
  score: number;
}

/** Server-graded outcome for a single question, revealed after submit. */
export interface ExamQuestionResult {
  question_id: string;
  selected_answer: string;
  correct: boolean;
  correct_answer: string;
  explanation: string;
}

/**
 * Response of POST /api/academy/exam/submit/{userId}.
 *
 * Everything here is computed server-side — the client renders it verbatim and
 * never re-derives the score.
 */
export interface ExamResult {
  /** Overall score as a 0-1 fraction (multiply by 100 for a percentage). */
  score: number;
  total: number;
  correct: number;
  passed: boolean;
  domain_breakdown: DomainBreakdown[];
  results: ExamQuestionResult[];
}

/** A single diagnostic answer (POST /api/academy/diagnostic/submit/{userId}). */
export interface DiagnosticAnswer {
  question_id: string;
  selected_answer: string;
}

/**
 * A diagnostic question (POST /api/academy/diagnostic/start/{userId}).
 * Shares the practice-question shape; `correct_answer`/`explanation` are not
 * revealed during the diagnostic, so they stay optional.
 */
export interface DiagnosticQuestion {
  id: string;
  prompt: string;
  options: string[];
  difficulty: Difficulty;
  skill_id?: string;
  source?: string;
  [key: string]: unknown;
}

/** Response of POST /api/academy/diagnostic/start/{userId}. */
export interface DiagnosticStartResponse {
  questions: DiagnosticQuestion[];
  [key: string]: unknown;
}

/**
 * Result of POST /api/academy/diagnostic/submit/{userId}. The backend may return
 * a richer summary than practice submissions; the UI reads only the optional
 * fields it knows about and degrades gracefully otherwise.
 */
export interface DiagnosticResult {
  /** Number of correct answers, when reported. */
  score?: number;
  /** Total questions, when reported. */
  total?: number;
  /** Overall mastery/accuracy as a 0-1 fraction, when reported. */
  accuracy?: number;
  /** Per-domain mastery breakdown, when reported. */
  domain_breakdown?: Record<string, number>;
  /** A starting recommendation/skill the path will begin from. */
  recommended_skill_id?: string;
  message?: string;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Student — onboarding, dashboard, stats                                     */
/* -------------------------------------------------------------------------- */

/** Response of POST /api/academy/onboarding. */
export interface OnboardingResponse {
  user_id: string;
  [key: string]: unknown;
}

/** Lifecycle of a skill node in the learner's tree. */
export type SkillStatus = 'locked' | 'in_progress' | 'mastered';

/** A node in the learner's skill tree (GET dashboard → `skill_tree`). */
export interface SkillNode {
  skill_id: string;
  name: string;
  domain_id: string;
  /** Mastery as a 0-1 fraction. */
  mastery: number;
  status: SkillStatus;
  [key: string]: unknown;
}

/** Response of GET /api/academy/dashboard/{userId}. */
export interface DashboardData {
  user_name: string;
  certification: string;
  progress: number;
  streak: number;
  xp: number;
  recommendation?: Recommendation;
  /** The learner's skill tree, rendered as the dashboard's main column. */
  skill_tree?: SkillNode[];
  [key: string]: unknown;
}

/** "Next best action" recommendation surfaced on the dashboard. */
export interface Recommendation {
  title?: string;
  message?: string;
  skill_id?: string;
  action?: string;
  [key: string]: unknown;
}

/** Response of GET /api/academy/learning-stats/readiness/{userId}. */
export interface ReadinessStats {
  overall: number;
  pass_probability: number;
  status: string;
  domain_breakdown: Record<string, number>;
  [key: string]: unknown;
}

/** Response of GET /api/academy/learning-stats/missions/{userId}. */
export interface Mission {
  id: string;
  title: string;
  description?: string;
  progress?: number;
  target?: number;
  completed?: boolean;
  reward_xp?: number;
  [key: string]: unknown;
}

/** A single entry of GET /api/academy/learning-stats/notebook/{userId}. */
export interface NotebookEntry {
  skill_id: string;
  fail_count: number;
  last_question: string;
  review_hints: string[];
  [key: string]: unknown;
}

/** A single entry of GET /api/academy/learning-stats/weak-topics/{userId}. */
export interface WeakTopic {
  skill_id: string;
  name?: string;
  score?: number;
  fail_count?: number;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Admin — control room                                                       */
/* -------------------------------------------------------------------------- */

/** Response of GET /api/admin/control-room/status. */
export interface SystemStatus {
  health?: string;
  tenants?: number;
  active_users?: number;
  mcp_servers?: number;
  ai_provider?: string;
  content_drafts?: number;
  questions_pending?: number;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Admin — marketplace                                                        */
/* -------------------------------------------------------------------------- */

export type PackStatus = 'installed' | 'available' | string;

/** A certification pack (GET /api/admin/marketplace/packs). */
export interface MarketplacePack {
  id: string;
  name: string;
  provider: string;
  version?: string;
  status?: PackStatus;
  description?: string;
  [key: string]: unknown;
}

/** Response of POST /api/admin/marketplace/packs/import. */
export interface ImportPackResponse {
  id?: string;
  status?: string;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Admin — secrets vault                                                      */
/* -------------------------------------------------------------------------- */

/** A vault secret. Values are never returned — only a masked preview. */
export interface Secret {
  id: string;
  key: string;
  /** Masked preview such as `sk-proj...4f2a`. Never the plaintext value. */
  masked_preview?: string;
  provider?: string;
  updated_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

/** Body of POST /api/admin/secrets. */
export interface CreateSecretPayload {
  key: string;
  value: string;
  provider?: string;
}

/* -------------------------------------------------------------------------- */
/* Admin — audit log                                                          */
/* -------------------------------------------------------------------------- */

export type AuditStatus = 'success' | 'failure' | string;

/** A single audit event (GET /api/admin/audit/events). */
export interface AuditEvent {
  id: string;
  action: string;
  actor?: string;
  user?: string;
  resource?: string;
  status?: AuditStatus;
  ip_address?: string;
  ip?: string;
  request_id?: string;
  created_at?: string;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Admin — MCP registry                                                       */
/* -------------------------------------------------------------------------- */

export type MCPServerStatus = 'online' | 'offline' | string;

/** A registered MCP server (GET /api/admin/mcp/servers). */
export interface MCPServer {
  id: string;
  name: string;
  url: string;
  status?: MCPServerStatus;
  category?: string;
  /** Either a tool count or a list of tools, depending on the endpoint. */
  tools?: number;
  [key: string]: unknown;
}

/** Body of POST /api/admin/mcp/servers. */
export interface CreateMCPServerPayload {
  name: string;
  url: string;
  category?: string;
}

/** A tool exposed by an MCP server (GET /api/admin/mcp/servers/{id}/tools). */
export interface MCPTool {
  name: string;
  description?: string;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Admin — knowledge base                                                     */
/* -------------------------------------------------------------------------- */

/** A RAG document (GET /api/admin/knowledge-base/documents). */
export interface KnowledgeDocument {
  id: string;
  title: string;
  skill_id?: string;
  certification_id?: string;
  status?: string;
  chunks?: number;
  created_at?: string;
  [key: string]: unknown;
}

/** Body of POST /api/admin/knowledge-base/documents. */
export interface CreateKnowledgeDocumentPayload {
  title: string;
  content: string;
  skill_id?: string;
}

/* -------------------------------------------------------------------------- */
/* Admin — content studio (question review queue)                            */
/* -------------------------------------------------------------------------- */

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | string;

/** A question in the review queue (GET /api/admin/content-studio/questions). */
export interface ReviewQuestion {
  id: string;
  prompt: string;
  options?: string[];
  correct_answer?: string;
  skill_id?: string;
  difficulty?: Difficulty | string;
  status?: ReviewStatus;
  source?: string;
  [key: string]: unknown;
}

/** Response of POST approve / reject in content-studio. */
export interface ReviewActionResponse {
  id: string;
  status: ReviewStatus;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Admin — AI studio                                                          */
/* -------------------------------------------------------------------------- */

/** Body of POST /api/admin/ai-studio/generate-test. */
export interface AIGenerationPayload {
  skill_id: string;
  prompt_type: 'lesson' | 'question';
}

/** A generated question fragment embedded in a lesson preview. */
export interface GeneratedQuestion {
  prompt?: string;
  options?: string[];
  correct_answer?: string;
  difficulty?: Difficulty | string;
  [key: string]: unknown;
}

/**
 * The `output` field of an AI generation. It can be a lesson, a standalone
 * question, or an `insufficient_context` marker — the AI Studio page narrows
 * on the present fields.
 */
export interface AIGenerationOutput {
  // Lesson-shaped
  title?: string;
  analogy?: string;
  question?: GeneratedQuestion;
  // Question-shaped
  prompt?: string;
  options?: string[];
  correct_answer?: string;
  difficulty?: Difficulty | string;
  // Marker
  status?: string;
  message?: string;
  [key: string]: unknown;
}

/** Response of POST /api/admin/ai-studio/generate-test. */
export interface AIGenerationResponse {
  provider?: string;
  model?: string;
  output: AIGenerationOutput;
  [key: string]: unknown;
}
