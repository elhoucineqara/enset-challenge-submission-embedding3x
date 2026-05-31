from langchain_core.tools import tool
import json


@tool
def calculate_quiz_score(
    questions_json: str,
    student_answers_json: str,
) -> str:
    """
    Calculates the student's quiz score and identifies which questions were wrong.

    Args:
        questions_json: JSON array of quiz questions with correctIndex
        student_answers_json: JSON array of student's selected option indices (0-3)
    """
    try:
        questions = json.loads(questions_json)
        answers = json.loads(student_answers_json)
    except json.JSONDecodeError as e:
        return f"ERROR: Invalid JSON input — {e}"

    if len(answers) != len(questions):
        return f"ERROR: {len(answers)} answers for {len(questions)} questions"

    total = len(questions)
    correct = 0
    breakdown = []

    for i, (q, student_idx) in enumerate(zip(questions, answers)):
        correct_idx = q.get("correctIndex", -1)
        is_correct = student_idx == correct_idx
        if is_correct:
            correct += 1

        breakdown.append({
            "question_num": i + 1,
            "question": q.get("question", ""),
            "student_answer": q.get("options", [])[student_idx] if 0 <= student_idx < 4 else "Invalid",
            "correct_answer": q.get("options", [])[correct_idx] if 0 <= correct_idx < 4 else "Unknown",
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
        })

    score_pct = round((correct / total) * 100)
    grade = "Excellent" if score_pct >= 80 else "Good" if score_pct >= 60 else "Needs Review"

    return json.dumps({
        "score": score_pct,
        "correct": correct,
        "total": total,
        "grade": grade,
        "breakdown": breakdown,
    }, ensure_ascii=False, indent=2)


@tool
def generate_feedback_summary(
    score: int,
    wrong_questions_json: str,
    tp_title: str,
) -> str:
    """
    Generates personalized feedback text based on quiz performance.

    Args:
        score: Percentage score (0-100)
        wrong_questions_json: JSON array of incorrectly answered questions
        tp_title: Title of the completed TP
    """
    try:
        wrong = json.loads(wrong_questions_json)
    except Exception:
        wrong = []

    if score >= 80:
        opening = (
            f"Excellent work on '{tp_title}'! "
            f"You've demonstrated a strong understanding of the concepts covered."
        )
    elif score >= 60:
        opening = (
            f"Good progress on '{tp_title}'! "
            f"You have a solid grasp of the basics with a few areas to reinforce."
        )
    else:
        opening = (
            f"You've completed '{tp_title}' — well done for finishing! "
            f"Let's review the key concepts to strengthen your understanding."
        )

    if not wrong:
        return opening + " All answers were correct — great comprehension!"

    focus_areas = []
    for q in wrong[:3]:
        focus_areas.append(f"- {q.get('question', '')[:80]}: {q.get('explanation', '')}")

    feedback = opening + "\n\nAreas to review:\n" + "\n".join(focus_areas)
    return feedback
