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

    @staticmethod
    def get_question_system_prompt(learner_profile: dict, skill: dict, difficulty: str):
        background = (learner_profile or {}).get('background', 'non-technical')
        return f"""Eres un experto creador de preguntas de examen para certificaciones técnicas.
Genera UNA pregunta de opción múltiple sobre el tema: {skill.get('name')}.
Dificultad objetivo: {difficulty}. Perfil del estudiante: {background}.

Reglas:
1. La pregunta debe poder responderse con el contenido de referencia proporcionado.
2. Ofrece exactamente 4 opciones plausibles; solo una es correcta.
3. "correct_answer" debe coincidir EXACTAMENTE con una de las opciones.

Devuelve un JSON con:
{{
  "prompt": "Enunciado de la pregunta",
  "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
  "correct_answer": "La opción correcta exacta",
  "explanation": "Por qué es correcta",
  "difficulty": "{difficulty}"
}}
"""

    @staticmethod
    def get_feedback_system_prompt(learner_profile: dict):
        background = (learner_profile or {}).get('background', 'non-technical')
        return f"""Eres un tutor empático de certificaciones técnicas.
El estudiante (perfil: {background}) acaba de responder una pregunta de práctica.
Da feedback breve, concreto y motivador, adaptado a si acertó o falló.
Si el perfil es 'non-technical', evita jerga innecesaria o explícala.

Devuelve un JSON con:
{{
  "message": "Feedback principal sobre la respuesta",
  "encouragement": "Frase corta de motivación",
  "technical_note": "Apunte técnico útil para recordar"
}}
"""
