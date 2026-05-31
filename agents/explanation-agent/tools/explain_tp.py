from langchain_core.tools import tool


@tool
def explain_tp_step(step_title: str, step_instructions: str, required_tags: str) -> str:
    """
    Structures a pedagogical explanation guide for a TP step.
    Returns teaching context. NEVER includes code solutions.

    Args:
        step_title: The title of the TP step
        step_instructions: Full instructions for the step
        required_tags: Comma-separated HTML tags the student must use
    """
    tags_list = [t.strip() for t in required_tags.split(",") if t.strip()]
    tags_formatted = ", ".join(f"<{tag}>" for tag in tags_list)
    return (
        f"STEP TEACHING CONTEXT:\n"
        f"Title: {step_title}\n"
        f"Instructions: {step_instructions}\n"
        f"Required HTML elements: {tags_formatted}\n\n"
        f"APPROACH: Explain WHAT each element does, WHY we use it, "
        f"and HOW they relate. Ask guiding questions. No code examples."
    )


@tool
def get_learning_objectives(tp_title: str, step_instructions: str) -> str:
    """
    Extracts learning objectives from a TP step to frame the explanation.

    Args:
        tp_title: The title of the overall TP assignment
        step_instructions: The instructions for the current step
    """
    return (
        f"LEARNING OBJECTIVES for '{tp_title}':\n"
        f"Step: {step_instructions}\n\n"
        f"Help the student understand:\n"
        f"1. The conceptual purpose of this step\n"
        f"2. How it fits the overall TP goal\n"
        f"3. What they will have mastered after completing it\n"
        f"4. Common misunderstandings to address proactively"
    )
