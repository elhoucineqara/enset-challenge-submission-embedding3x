from langchain_core.tools import tool

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False


def _parse_html(code: str) -> dict:
    """Parse HTML and return found tags."""
    if BS4_AVAILABLE:
        soup = BeautifulSoup(code, "html.parser")
        return {tag.name for tag in soup.find_all()}
    # Fallback: simple regex-based detection
    import re
    return set(re.findall(r"<\s*([a-zA-Z][a-zA-Z0-9]*)", code))


@tool
def validate_html_tags(student_code: str, required_tags: str) -> str:
    """
    Validates whether the student's HTML code contains all required tags.
    Returns a structured validation report without revealing the solution.

    Args:
        student_code: The student's current HTML code
        required_tags: Comma-separated list of required HTML tag names (e.g., 'h1,p,div')
    """
    required = [t.strip().lower().strip("<>") for t in required_tags.split(",") if t.strip()]
    found_tags = _parse_html(student_code)
    found_lower = {t.lower() for t in found_tags}

    present = [t for t in required if t in found_lower]
    missing = [t for t in required if t not in found_lower]

    result = f"VALIDATION RESULT:\n"
    result += f"Required: {', '.join(f'<{t}>' for t in required)}\n"
    result += f"Present: {', '.join(f'<{t}>' for t in present) if present else 'none'}\n"
    result += f"Missing: {', '.join(f'<{t}>' for t in missing) if missing else 'none'}\n"
    result += f"Valid: {'YES' if not missing else 'NO'}\n"

    if missing:
        result += f"\nHINT DIRECTION: The student still needs to add {len(missing)} element(s). "
        result += f"Focus hint on the FIRST missing element: <{missing[0]}>."

    return result


@tool
def analyze_html_structure(student_code: str) -> str:
    """
    Analyzes the structure of student HTML code and reports issues
    (nesting, unclosed tags, common errors) without giving the solution.

    Args:
        student_code: The student's current HTML code
    """
    issues = []

    if not student_code.strip():
        return "CODE STATUS: Empty — student has not written any code yet."

    code_lower = student_code.lower()

    # Check for common structural issues
    if "<html>" not in code_lower and "<!doctype" not in code_lower:
        issues.append("Missing proper HTML document structure")

    # Check for unclosed common tags
    for tag in ["div", "p", "ul", "ol", "table", "section", "article"]:
        opens = code_lower.count(f"<{tag}")
        closes = code_lower.count(f"</{tag}>")
        if opens > closes:
            issues.append(f"Unclosed <{tag}> tag detected ({opens} opened, {closes} closed)")

    # Check for content
    if len(student_code.strip()) < 10:
        issues.append("Code is very short — likely incomplete")

    summary = f"HTML ANALYSIS:\n"
    summary += f"Code length: {len(student_code)} characters\n"
    summary += f"Line count: {len(student_code.splitlines())}\n"

    if issues:
        summary += f"Issues found:\n"
        for i, issue in enumerate(issues, 1):
            summary += f"  {i}. {issue}\n"
    else:
        summary += "Structure: No major structural issues detected\n"

    return summary
