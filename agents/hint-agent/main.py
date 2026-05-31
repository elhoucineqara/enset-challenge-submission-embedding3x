"""Hint Agent — deepseek-coder:6.7b via Ollama, provides progressive coding hints."""
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

from tools.html_validator import validate_html_tags, analyze_html_structure
from tools.hint_generator import generate_progressive_hint, assess_hint_level

app = FastAPI(title="Hint Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are a coding mentor for an HTML learning platform.

YOUR ROLE:
- Analyze the student's current HTML code
- Identify what elements are missing or incorrect
- Provide ONE progressive hint per request — never multiple at once
- Guide the student toward the solution without solving it for them

STRICT RULES:
1. NEVER write complete HTML elements or code for the student
2. NEVER show the exact syntax (e.g., never show <h1>...</h1>)
3. ONLY give ONE hint per response — the most important missing piece
4. Start abstract, get more specific only if the student has already received hints
5. If the student's code is correct and complete, praise them specifically

HINT PROGRESSION:
Level 1 (first hint): Conceptual — what does this element DO in the real world?
Level 2 (second hint): Structural — how does it fit in HTML document structure?
Level 3 (third hint): Naming — mention the element category/name without full syntax
Level 4 (fourth+ hint): Specific — describe exactly what to type in plain English

YOUR STYLE:
- Be encouraging and specific to THEIR code
- Reference what they've already written correctly
- Ask ONE question at the end of each hint to prompt thinking
- Never make the student feel stupid for their mistakes"""

tools = [validate_html_tags, analyze_html_structure, generate_progressive_hint, assess_hint_level]


def get_llm():
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("HINT_AGENT_MODEL", "deepseek-coder:6.7b")
    return ChatOllama(model=model, base_url=base_url, temperature=0.3)


class HintRequest(BaseModel):
    step_id: str
    step_title: str
    step_instructions: str
    student_code: str
    required_tags: list[str] = []
    hints_already_given: int = 0
    previous_hints: list[str] = []
    session_id: str | None = None


class HintResponse(BaseModel):
    hint: str
    hint_level: int
    validation_passed: bool
    missing_tags: list[str]
    agent: str = "hint-agent"
    model: str


@app.get("/health")
def health():
    return {"status": "ok", "agent": "hint-agent", "model": os.getenv("HINT_AGENT_MODEL")}


@app.post("/hint", response_model=HintResponse)
async def get_hint(req: HintRequest):
    try:
        llm = get_llm()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama not available: {str(e)}")

    agent = create_react_agent(llm, tools, state_modifier=SYSTEM_PROMPT)

    tags_str = ", ".join(req.required_tags)
    prev_hints_str = "\n".join(f"- {h}" for h in req.previous_hints) if req.previous_hints else "None yet"

    user_message = (
        f"STUDENT HINT REQUEST:\n"
        f"Step: '{req.step_title}'\n"
        f"Instructions: {req.step_instructions}\n"
        f"Required HTML tags: {tags_str}\n\n"
        f"Student's current code:\n```html\n{req.student_code}\n```\n\n"
        f"Hints already given ({req.hints_already_given} total):\n{prev_hints_str}\n\n"
        f"TASK:\n"
        f"1. Use validate_html_tags to check what's missing\n"
        f"2. Use analyze_html_structure to identify issues\n"
        f"3. Use assess_hint_level to determine the right hint level\n"
        f"4. Use generate_progressive_hint for the first missing tag\n"
        f"5. Deliver the hint conversationally to the student — do NOT show actual HTML syntax"
    )

    result = agent.invoke({"messages": [HumanMessage(content=user_message)]})
    last_message = result["messages"][-1]
    hint_text = last_message.content if hasattr(last_message, "content") else str(last_message)

    # Determine validation status from code
    from tools.html_validator import _parse_html
    found = _parse_html(req.student_code)
    found_lower = {t.lower() for t in found}
    missing = [t for t in req.required_tags if t.lower() not in found_lower]

    return HintResponse(
        hint=hint_text,
        hint_level=min(4, req.hints_already_given + 1),
        validation_passed=len(missing) == 0,
        missing_tags=missing,
        model=os.getenv("HINT_AGENT_MODEL", "deepseek-coder:6.7b"),
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("HINT_AGENT_PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
