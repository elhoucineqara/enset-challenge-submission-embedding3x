"""
Agent Gateway — public-facing FastAPI service.
Routes frontend requests to the appropriate AI agent services.
Validates JWT tokens from the Auth Service.
"""
import os
import json
import uuid
import shutil
from typing import Any
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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


class GenerateTPRequest(BaseModel):
    prompt: str
    difficulty: str = "intermediate"
    step_count: int = 4
    language: str = "fr"
    file_names: list[str] = []
    course_ids: list[str] = []
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



@app.post("/api/agents/generate-tp")
async def generate_tp(req: GenerateTPRequest):
    """
    Ask the Orchestrator (DeepSeek v3) to generate a full TP environment.
    The prompt and any indexed course context are forwarded; the orchestrator
    returns a structured TP object ready to be saved by tpService.
    """
    context = {
        "prompt": req.prompt,
        "difficulty": req.difficulty,
        "step_count": req.step_count,
        "language": req.language,
        "file_names": req.file_names,
        "course_ids": req.course_ids,
    }
    courses_store = _load_courses()
    if req.course_ids:
        indexed = [c for c in courses_store if c.get("id") in req.course_ids and c.get("status") == "indexed"]
        if indexed:
            context["rag_context"] = [{"name": c["name"], "excerpt": c.get("excerpt", "")} for c in indexed]

    action = (
        f"Generate a complete HTML TP (Travaux Pratiques) environment in language '{req.language}'. "
        f"Difficulty: {req.difficulty}. Number of steps: {req.step_count}. "
        f"Teacher prompt: {req.prompt or '(none)'}. "
        f"Return a JSON object with: title, description, difficulty, estimatedMinutes, starterHTML, "
        f"and steps array (each step: id, title, instructions, requiredTags[], quiz[])."
    )
    result = _proxy("post", f"{ORCHESTRATOR_URL}/orchestrate", {"action": action, "context": context, "session_id": req.session_id})
    return {"tp": result.get("result", result), "agent": "orchestrator", "model": "deepseek-v3", "used_rag": bool(context.get("rag_context"))}



COURSES_FILE = os.path.join(os.path.dirname(__file__), "courses_store.json")
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")


def _load_courses() -> list[dict]:
    if not os.path.exists(COURSES_FILE):
        return []
    with open(COURSES_FILE) as f:
        try:
            return json.load(f)
        except (json.JSONDecodeError, ValueError):
            return []


def _save_courses(courses: list[dict]) -> None:
    with open(COURSES_FILE, "w") as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)


@app.get("/api/agents/courses")
def list_courses():
    """List all uploaded course documents."""
    return {"courses": _load_courses()}


@app.post("/api/agents/courses/upload")
async def upload_course(
    file: UploadFile = File(...),
    course_id: str = Form(default=""),
):
    """
    Accept a PDF/DOCX/TXT course file, save it locally, and register it
    in the course store for RAG retrieval.
    """
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    cid = course_id or str(uuid.uuid4())
    safe_name = file.filename or f"document-{cid}"
    dest = os.path.join(UPLOADS_DIR, f"{cid}_{safe_name}")

    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)

    file_size = os.path.getsize(dest)

    excerpt = ""
    if safe_name.lower().endswith(".txt") or safe_name.lower().endswith(".md"):
        try:
            with open(dest, encoding="utf-8", errors="ignore") as tf:
                excerpt = tf.read(2000)
        except Exception:
            pass

    record = {
        "id": cid,
        "name": safe_name,
        "path": dest,
        "size": file_size,
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "status": "indexed",
        "chunks": max(1, file_size // 512),
        "excerpt": excerpt[:500] if excerpt else "",
    }

    courses = _load_courses()
    existing = next((i for i, c in enumerate(courses) if c.get("id") == cid), None)
    if existing is not None:
        courses[existing] = record
    else:
        courses.append(record)
    _save_courses(courses)

    return {"course": record, "message": "Document indexed successfully"}


@app.delete("/api/agents/courses/{course_id}")
def delete_course(course_id: str):
    """Remove a course document from the store."""
    courses = _load_courses()
    record = next((c for c in courses if c.get("id") == course_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Course not found")
    if record.get("path") and os.path.exists(record["path"]):
        os.remove(record["path"])
    _save_courses([c for c in courses if c.get("id") != course_id])
    return {"deleted": course_id}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AGENT_GATEWAY_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
