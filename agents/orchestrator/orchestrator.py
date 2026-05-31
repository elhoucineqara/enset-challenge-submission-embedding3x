"""
Orchestrator — uses deepseek-v3.2:cloud via Ollama to route complex multi-agent requests.
For simple requests the gateway routes directly. This handles ambiguous/multi-phase ones.
"""
import os
import json
import httpx
from langchain_community.chat_models import ChatOllama
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent

EXPLANATION_AGENT_URL = os.getenv("EXPLANATION_AGENT_URL", "http://localhost:8001")
HINT_AGENT_URL = os.getenv("HINT_AGENT_URL", "http://localhost:8002")
EVALUATION_AGENT_URL = os.getenv("EVALUATION_AGENT_URL", "http://localhost:8003")


def get_orchestrator_llm():
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("ORCHESTRATOR_MODEL", "deepseek-v3.2:cloud")
    return ChatOllama(model=model, base_url=base_url, temperature=0.2)


@tool
def call_explanation_agent(payload_json: str) -> str:
    """
    Routes to the Explanation Agent (Mistral via Ollama).
    Use for: explaining TP steps, answering conceptual questions.
    Args:
        payload_json: JSON with tp_id, tp_title, tp_description, step_id, step_title,
                      step_instructions, required_tags (list), question (optional)
    """
    try:
        payload = json.loads(payload_json)
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(f"{EXPLANATION_AGENT_URL}/explain", json=payload)
            resp.raise_for_status()
            return json.dumps(resp.json())
    except httpx.ConnectError:
        return json.dumps({"error": "Explanation agent unavailable"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def call_hint_agent(payload_json: str) -> str:
    """
    Routes to the Hint Agent (deepseek-coder:6.7b via Ollama).
    Use for: generating coding hints, validating student HTML.
    Args:
        payload_json: JSON with step_id, step_title, step_instructions,
                      student_code, required_tags (list), hints_already_given, previous_hints (list)
    """
    try:
        payload = json.loads(payload_json)
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(f"{HINT_AGENT_URL}/hint", json=payload)
            resp.raise_for_status()
            return json.dumps(resp.json())
    except httpx.ConnectError:
        return json.dumps({"error": "Hint agent unavailable"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def call_evaluation_agent_quiz(payload_json: str) -> str:
    """
    Routes to the Evaluation Agent to GENERATE a quiz.
    Use for: creating MCQ questions after a student completes a TP step.
    Args:
        payload_json: JSON with tp_id, tp_title, tp_description,
                      step_titles (list), student_code, num_questions (optional)
    """
    try:
        payload = json.loads(payload_json)
        with httpx.Client(timeout=180.0) as client:
            resp = client.post(f"{EVALUATION_AGENT_URL}/generate-quiz", json=payload)
            resp.raise_for_status()
            return json.dumps(resp.json())
    except httpx.ConnectError:
        return json.dumps({"error": "Evaluation agent unavailable"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def call_evaluation_agent_score(payload_json: str) -> str:
    """
    Routes to the Evaluation Agent to EVALUATE student quiz answers.
    Use for: scoring a completed quiz and generating personalized feedback.
    Args:
        payload_json: JSON with tp_id, tp_title, questions (list),
                      student_answers (list of int), student_code
    """
    try:
        payload = json.loads(payload_json)
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(f"{EVALUATION_AGENT_URL}/evaluate", json=payload)
            resp.raise_for_status()
            return json.dumps(resp.json())
    except httpx.ConnectError:
        return json.dumps({"error": "Evaluation agent unavailable"})
    except Exception as e:
        return json.dumps({"error": str(e)})


ORCHESTRATOR_SYSTEM_PROMPT = """You are the master orchestrator for an AI-powered educational TP platform.

You have 4 specialized agents:
1. call_explanation_agent — Mistral — Explains TP concepts (no code)
2. call_hint_agent — deepseek-coder:6.7b — Analyzes HTML, gives progressive hints
3. call_evaluation_agent_quiz — Gemma 4 31B — Generates MCQ quiz questions
4. call_evaluation_agent_score — Gemma 4 31B — Evaluates answers, gives feedback

ROUTING:
- "explain" / "clarify" / "what is" → call_explanation_agent
- "hint" / "stuck" / "help with code" → call_hint_agent
- "generate quiz" / "create questions" → call_evaluation_agent_quiz
- "evaluate" / "score" / "check answers" → call_evaluation_agent_score

Always delegate to the appropriate agent. Return the agent's response directly."""

orchestrator_tools = [
    call_explanation_agent,
    call_hint_agent,
    call_evaluation_agent_quiz,
    call_evaluation_agent_score,
]


def create_orchestrator():
    llm = get_orchestrator_llm()
    return create_react_agent(llm, orchestrator_tools, state_modifier=ORCHESTRATOR_SYSTEM_PROMPT)


def run_orchestration(request_description: str, context: dict) -> dict:
    agent = create_orchestrator()
    context_str = json.dumps(context, ensure_ascii=False, indent=2)
    message = f"{request_description}\n\nContext:\n{context_str}"
    result = agent.invoke({"messages": [HumanMessage(content=message)]})
    last_msg = result["messages"][-1]
    content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)
    try:
        return json.loads(content)
    except (json.JSONDecodeError, ValueError):
        return {"response": content, "orchestrated": True}
