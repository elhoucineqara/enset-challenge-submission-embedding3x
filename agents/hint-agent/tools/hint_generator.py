from langchain_core.tools import tool


HINT_LEVELS = {
    1: "ABSTRACT",
    2: "CONCEPTUAL",
    3: "STRUCTURAL",
    4: "SPECIFIC",
}

HINT_TEMPLATES = {
    "h1": {
        1: "Think about how web pages show their most important title to visitors.",
        2: "HTML has a specific element designed for the main heading of a page.",
        3: "The element for the main heading uses the number 1 to indicate it's the highest level.",
        4: "You need an element that starts with 'h' followed by '1'. It wraps text that is the primary title.",
    },
    "h2": {
        1: "Think about sub-sections that need their own titles within a page.",
        2: "HTML heading elements are numbered 1-6 by importance. What comes after h1?",
        3: "A second-level heading element would be the 'h' element with number 2.",
        4: "You need <h2>...</h2> to mark a secondary heading.",
    },
    "p": {
        1: "Think about how you organize text into readable chunks or paragraphs.",
        2: "HTML has a dedicated element for paragraph text — it's one of the most fundamental.",
        3: "The paragraph element uses a single letter to represent 'paragraph'.",
        4: "Wrap your text content in an element that starts with 'p'.",
    },
    "ul": {
        1: "Think about how you'd display a list of items where order doesn't matter.",
        2: "HTML has two main list types: one where order matters and one where it doesn't.",
        3: "An unordered list (bullet points) uses two letters: 'u' and 'l'.",
        4: "Use <ul>...</ul> to wrap your list items. Each item goes inside an <li> element.",
    },
    "ol": {
        1: "Think about a numbered list — like a recipe or instructions.",
        2: "HTML supports ordered (numbered) lists with a specific element.",
        3: "An ordered list uses 'o' and 'l' — for 'ordered list'.",
        4: "Wrap your items in <ol>...</ol> with each item in an <li> element.",
    },
    "li": {
        1: "Think about individual items within a list.",
        2: "Each item in a list needs its own container element.",
        3: "List items use a two-letter element meaning 'list item'.",
        4: "Wrap each list item in <li>...</li> inside your list element.",
    },
    "img": {
        1: "Think about displaying a picture or photo on the page.",
        2: "HTML has a self-closing element specifically for embedding images.",
        3: "Images require a source attribute to know which image to display.",
        4: "Use <img src='path/to/image.jpg' alt='description'> — it doesn't need a closing tag.",
    },
    "a": {
        1: "Think about making clickable links that take users to other pages.",
        2: "HTML has a dedicated element for hyperlinks.",
        3: "The anchor element uses a single letter 'a' and needs an 'href' attribute.",
        4: "Use <a href='url'>link text</a> to create a clickable link.",
    },
}


@tool
def generate_progressive_hint(missing_tag: str, hint_level: int, step_instructions: str) -> str:
    """
    Generates a progressive hint for a missing HTML tag at the appropriate level.
    Level 1 = most abstract, Level 4 = most specific (but never the actual code).

    Args:
        missing_tag: The HTML tag name the student is missing (e.g., 'h1', 'p')
        hint_level: Hint specificity level 1-4 (1=abstract, 4=specific)
        step_instructions: The step instructions for additional context
    """
    level = max(1, min(4, hint_level))
    level_name = HINT_LEVELS.get(level, "SPECIFIC")

    tag_clean = missing_tag.strip().lower().strip("<>")
    hint_text = HINT_TEMPLATES.get(tag_clean, {}).get(
        level,
        f"Think about what HTML element would achieve the goal described in: '{step_instructions[:100]}'"
    )

    return (
        f"HINT GENERATION [Level {level} - {level_name}]:\n"
        f"Target element: <{tag_clean}>\n"
        f"Hint to deliver: {hint_text}\n\n"
        f"DELIVERY RULES:\n"
        f"- Present this hint conversationally, not as a technical fact\n"
        f"- Do NOT show the actual HTML tag name directly\n"
        f"- Ask a follow-up question to encourage the student to figure it out\n"
        f"- If level >= 3, you may mention the element name but not the full syntax"
    )


@tool
def assess_hint_level(hints_already_given: int, student_attempts: int) -> str:
    """
    Determines the appropriate hint level based on student's progress.

    Args:
        hints_already_given: Number of hints already provided for this element
        student_attempts: Number of times the student has tried to submit
    """
    recommended_level = min(4, max(1, hints_already_given + 1))

    if hints_already_given == 0:
        strategy = "Start abstract — let the student think first"
    elif hints_already_given == 1:
        strategy = "Add conceptual clarity — name the concept without naming the element"
    elif hints_already_given == 2:
        strategy = "Be structural — describe the shape/structure of the solution"
    else:
        strategy = "Be specific — the student needs direct guidance, mention the element name"

    return (
        f"HINT LEVEL ASSESSMENT:\n"
        f"Hints given: {hints_already_given}\n"
        f"Student attempts: {student_attempts}\n"
        f"Recommended level: {recommended_level}\n"
        f"Strategy: {strategy}"
    )
