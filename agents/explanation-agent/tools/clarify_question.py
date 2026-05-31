from langchain_core.tools import tool


@tool
def structure_clarification(
    student_question: str,
    tp_context: str,
    step_context: str,
) -> str:
    """
    Structures context to answer a student's clarification question pedagogically.
    Guides thinking rather than giving away solutions.

    Args:
        student_question: The question the student is asking
        tp_context: The overall TP description and goal
        step_context: The current step's instructions
    """
    return (
        f"CLARIFICATION REQUEST:\n"
        f"Student question: {student_question}\n\n"
        f"TP context: {tp_context}\n"
        f"Current step: {step_context}\n\n"
        f"RESPONSE GUIDELINES:\n"
        f"- Answer the conceptual question clearly using analogies\n"
        f"- DO NOT provide code examples or snippets\n"
        f"- End with a guiding question to move them forward\n"
        f"- Be concise (2-4 sentences for the core answer)"
    )


@tool
def detect_misconception(student_question: str) -> str:
    """
    Identifies if a student question reveals a common HTML misconception
    and provides context to address it properly.

    Args:
        student_question: The student's question text
    """
    common = (
        "Common HTML misconceptions: "
        "tags vs attributes confusion, "
        "thinking HTML is a programming language, "
        "confusing block vs inline elements, "
        "forgetting closing tags, "
        "misunderstanding nesting rules"
    )
    return (
        f"Check if this question reveals a misconception:\n"
        f"Question: {student_question}\n"
        f"{common}\n\n"
        f"If yes: correct the underlying misunderstanding gently, "
        f"then answer the actual question and reinforce the correct model."
    )
