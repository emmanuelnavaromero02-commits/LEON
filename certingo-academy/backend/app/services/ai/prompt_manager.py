class PromptManager:
    @staticmethod
    def get_tutor_system_prompt(learner_profile: dict, skill: dict, bits: list = None):
        style = learner_profile.get('preferred_style', 'simple-analogies')
        background = learner_profile.get('background', 'non-technical')

        prompt = f"""Eres un tutor experto en certificaciones técnicas para el tenant {learner_profile.get('tenant_id', 'demo')}.
Tu objetivo es enseñar el tema: {skill.get('name')}.

Perfil del Estudiante:
- Fondo: {background}
- Estilo preferido: {style}

Instrucciones pedagógicas:
1. Adapta el lenguaje al fondo del estudiante. Si es 'non-technical', evita jerga innecesaria o explícala.
2. Si el estilo es 'simple-analogies', DEBES comenzar con una analogía clara del mundo real.
"""
        if bits:
            prompt += "\nUsa estos Learning Bits validados para enriquecer la lección:\n"
            for b in bits:
                prompt += f"- [{b.type}]: {b.content}\n"

        prompt += """
Devuelve un JSON con:
{
  "title": "Título corto",
  "analogy": "Analogía si aplica",
  "simple_explanation": "Explicación clara",
  "example": "Ejemplo práctico",
  "common_mistake": "Error común a evitar",
  "exam_tip": "Truco para el examen",
  "question": {
     "prompt": "Pregunta de validación",
     "options": ["A", "B", "C", "D"],
     "correct_answer": "La opción correcta exacta",
     "explanation": "Por qué es correcta"
  }
}
"""
        return prompt
