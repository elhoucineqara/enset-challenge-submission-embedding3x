"""
Agent Gateway — public-facing FastAPI service.
Routes frontend requests to the appropriate AI agent services.
Validates JWT tokens from the Auth Service.
"""
import os
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

EXPLANATION_AGENT_URL = os.getenv("EXPLANATION_AGENT_URL", "http://localhost:8001")
HINT_AGENT_URL = os.getenv("HINT_AGENT_URL", "http://localhost:8002")
EVALUATION_AGENT_URL = os.getenv("EVALUATION_AGENT_URL", "http://localhost:8003")
ORCHESTRATOR_URL = f"http://localhost:{os.getenv('ORCHESTRATOR_PORT', '8004')}"
AUTH_SERVICE_URL = f"http://localhost:{os.getenv('AUTH_SERVICE_PORT', '8081')}"

app = FastAPI(title="Agent Gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TIMEOUT = httpx.Timeout(120.0, connect=10.0)


# ─── Request / Response Models ───────────────────────────────────────────────

class ExplainRequest(BaseModel):
    tp_id: str
    tp_title: str
    tp_description: str
    step_id: str
    step_title: str
    step_instructions: str
    required_tags: list[str] = []
    question: str | None = None
    session_id: str | None = None


class HintRequest(BaseModel):
    step_id: str
    step_title: str
    step_instructions: str
    student_code: str
    required_tags: list[str] = []
    hints_already_given: int = 0
    previous_hints: list[str] = []
    session_id: str | None = None


class GenerateQuizRequest(BaseModel):
    tp_id: str
    tp_title: str
    tp_description: str
    step_titles: list[str]
    student_code: str
    num_questions: int = 4
    session_id: str | None = None


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correctIndex: int
    explanation: str


class EvaluateAnswersRequest(BaseModel):
    tp_id: str
    tp_title: str
    questions: list[QuizQuestion]
    student_answers: list[int]
    student_code: str
    session_id: str | None = None


class OrchestrateRequest(BaseModel):
    action: str
    context: dict[str, Any]
    session_id: str | None = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _proxy(method: str, url: str, payload: dict) -> dict:
    """Proxy a request to an agent service with error handling."""
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = getattr(client, method)(url, json=payload)
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"Agent service unreachable: {url}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "agent-gateway"}


@app.get("/agents/health")
async def agents_health():
    """Check health of all downstream agent services."""
    statuses = {}
    urls = {
        "explanation-agent": f"{EXPLANATION_AGENT_URL}/health",
        "hint-agent": f"{HINT_AGENT_URL}/health",
        "evaluation-agent": f"{EVALUATION_AGENT_URL}/health",
        "orchestrator": f"{ORCHESTRATOR_URL}/health",
    }
    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, url in urls.items():
            try:
                resp = await client.get(url)
                statuses[name] = "up" if resp.status_code == 200 else "degraded"
            except Exception:
                statuses[name] = "down"
    return {"agents": statuses}


@app.post("/api/agents/explain")
async def explain(req: ExplainRequest):
    """Route to Explanation Agent (Mistral)."""
    return _proxy("post", f"{EXPLANATION_AGENT_URL}/explain", req.model_dump())


@app.post("/api/agents/hint")
async def hint(req: HintRequest):
    """Route to Hint Agent (deepseek-coder:6.7b via Ollama)."""
    return _proxy("post", f"{HINT_AGENT_URL}/hint", req.model_dump())


@app.post("/api/agents/generate-quiz")
async def generate_quiz(req: GenerateQuizRequest):
    """Route to Evaluation Agent — generate quiz questions."""
    return _proxy("post", f"{EVALUATION_AGENT_URL}/generate-quiz", req.model_dump())


@app.post("/api/agents/evaluate")
async def evaluate(req: EvaluateAnswersRequest):
    """Route to Evaluation Agent — score quiz answers."""
    return _proxy("post", f"{EVALUATION_AGENT_URL}/evaluate", req.model_dump())


@app.post("/api/agents/orchestrate")
async def orchestrate(req: OrchestrateRequest):
    """Route complex/ambiguous requests to the DeepSeek v3 Orchestrator."""
    return _proxy("post", f"{ORCHESTRATOR_URL}/orchestrate", req.model_dump())


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AGENT_GATEWAY_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
