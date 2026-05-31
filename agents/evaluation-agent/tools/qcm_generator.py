from langchain_core.tools import tool


@tool
def build_quiz_generation_prompt(
    tp_title: str,
    step_titles: str,
    student_code: str,
    num_questions: int = 4,
) -> str:
    """
    Builds a structured prompt for generating MCQ questions about a completed TP.
    Questions test comprehension, not memorization.

    Args:
        tp_title: Title of the TP the student completed
        step_titles: Comma-separated titles of the steps completed
        student_code: The final HTML code the student produced
        num_questions: Number of questions to generate (3-5)
    """
    n = max(3, min(5, num_questions))
    steps = [s.strip() for s in step_titles.split(",") if s.strip()]

    prompt = (
        f"QUIZ GENERATION TASK:\n"
        f"TP: '{tp_title}'\n"
        f"Steps covered: {', '.join(steps)}\n"
        f"Student's code:\n```html\n{student_code[:800]}\n```\n\n"
        f"Generate exactly {n} multiple-choice questions that test:\n"
        f"1. Understanding of WHY each HTML element was used (not just what)\n"
        f"2. Semantic meaning of the elements chosen\n"
        f"3. Consequences of using wrong/missing elements\n"
        f"4. How the elements relate to web standards and best practices\n\n"
        f"FORMAT (JSON array, each item has):\n"
        f"- question: string (clear, specific question)\n"
        f"- options: array of 4 strings (A, B, C, D)\n"
        f"- correctIndex: number (0-3, index of correct option)\n"
        f"- explanation: string (why the answer is correct, 1-2 sentences)\n\n"
        f"RULES:\n"
        f"- Base questions on what the student ACTUALLY coded\n"
        f"- Make wrong answers plausible (common misconceptions)\n"
        f"- Avoid trivial 'what tag does X' — test deeper understanding\n"
        f"- Use the student's actual code as evidence in questions\n\n"
        f"Return ONLY valid JSON array, no markdown fences."
    )
    return prompt


@tool
def validate_quiz_structure(quiz_json: str) -> str:
    """
    Validates that a generated quiz JSON has the correct structure.
    Returns validation status and any issues found.

    Args:
        quiz_json: The JSON string of the generated quiz
    """
    import json
    try:
        questions = json.loads(quiz_json)
        if not isinstance(questions, list):
            return "INVALID: Root must be a JSON array"

        errors = []
        for i, q in enumerate(questions):
            required_fields = ["question", "options", "correctIndex", "explanation"]
            for field in required_fields:
                if field not in q:
                    errors.append(f"Q{i+1}: missing field '{field}'")

            if "options" in q and len(q["options"]) != 4:
                errors.append(f"Q{i+1}: must have exactly 4 options, got {len(q.get('options', []))}")

            if "correctIndex" in q and q["correctIndex"] not in [0, 1, 2, 3]:
                errors.append(f"Q{i+1}: correctIndex must be 0-3")

        if errors:
            return f"VALIDATION FAILED:\n" + "\n".join(errors)

        return f"VALID: {len(questions)} questions, all fields present and correct"

    except json.JSONDecodeError as e:
        return f"INVALID JSON: {str(e)}"
