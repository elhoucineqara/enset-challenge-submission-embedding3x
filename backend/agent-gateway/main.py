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
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

import rag

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

RAG_READY = False


@app.on_event("startup")
def _init_rag() -> None:
    """Create the pgvector extension + table on boot. RAG degrades gracefully if down."""
    global RAG_READY
    try:
        rag.ensure_schema()
        RAG_READY = True
        print("[agent-gateway] RAG vector store ready")
    except Exception as e:  # noqa: BLE001
        RAG_READY = False
        print(f"[agent-gateway] RAG vector store unavailable: {e}")


# ─── Real-time progress broadcasting (WebSocket) ─────────────────────────────

class ConnectionManager:
    """Tracks connected dashboards and fan-outs student progress events to them."""

    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict) -> None:
        stale: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)


manager = ConnectionManager()


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
    if req.course_ids and RAG_READY:
        try:
            hits = rag.search(req.prompt or "course content", course_ids=req.course_ids, k=6)
            if hits:
                context["rag_context"] = [
                    {"name": h["course_name"], "excerpt": h["content"], "score": h["score"]}
                    for h in hits
                ]
        except Exception as e:  # noqa: BLE001
            print(f"[agent-gateway] RAG retrieval failed: {e}")

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


def _upsert_course(record: dict) -> None:
    courses = _load_courses()
    existing = next((i for i, c in enumerate(courses) if c.get("id") == record["id"]), None)
    if existing is not None:
        courses[existing] = record
    else:
        courses.append(record)
    _save_courses(courses)


def _index_document(cid: str, name: str, path: str, size: int) -> dict:
    """Run the real RAG pipeline and return the updated course record."""
    record = {
        "id": cid,
        "name": name,
        "path": path,
        "size": size,
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "status": "indexing",
        "chunks": 0,
        "excerpt": "",
    }
    if not RAG_READY:
        record["status"] = "error"
        record["error"] = "Vector store unavailable"
        _upsert_course(record)
        return record

    try:
        chunk_count = rag.ingest(cid, name, path)
        excerpt = rag.extract_text(path, name).strip()
        record["status"] = "indexed" if chunk_count > 0 else "error"
        record["chunks"] = chunk_count
        record["excerpt"] = excerpt[:500]
        if chunk_count == 0:
            record["error"] = "No extractable text found"
    except rag.RagUnavailable as e:
        record["status"] = "error"
        record["error"] = str(e)
    except Exception as e:  # noqa: BLE001
        record["status"] = "error"
        record["error"] = str(e)

    _upsert_course(record)
    return record


@app.post("/api/agents/courses/upload")
async def upload_course(
    file: UploadFile = File(...),
    course_id: str = Form(default=""),
):
    """
    Accept a PDF/DOCX/TXT/MD course file, persist it, then embed + store its
    chunks in the pgvector store so the agents can retrieve from it.
    """
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    cid = course_id or str(uuid.uuid4())
    safe_name = file.filename or f"document-{cid}"
    dest = os.path.join(UPLOADS_DIR, f"{cid}_{safe_name}")

    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)

    file_size = os.path.getsize(dest)
    record = _index_document(cid, safe_name, dest, file_size)

    if record["status"] == "error":
        return {"course": record, "message": f"Indexing failed: {record.get('error', 'unknown error')}"}
    return {"course": record, "message": f"Document indexed: {record['chunks']} chunks embedded"}


@app.post("/api/agents/courses/{course_id}/reindex")
def reindex_course(course_id: str):
    """Re-run the embedding pipeline on an already uploaded document."""
    record = next((c for c in _load_courses() if c.get("id") == course_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Course not found")
    path = record.get("path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=410, detail="Source file no longer available")
    updated = _index_document(course_id, record["name"], path, record.get("size", os.path.getsize(path)))
    return {"course": updated}


class CourseSearchRequest(BaseModel):
    query: str
    course_ids: list[str] = []
    k: int = 5


@app.post("/api/agents/courses/search")
def search_courses(req: CourseSearchRequest):
    """Vector similarity search across indexed course chunks."""
    if not RAG_READY:
        raise HTTPException(status_code=503, detail="Vector store unavailable")
    try:
        results = rag.search(req.query, course_ids=req.course_ids or None, k=req.k)
    except rag.RagUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"results": results}


@app.delete("/api/agents/courses/{course_id}")
def delete_course(course_id: str):
    """Remove a course document and its vectors from the store."""
    courses = _load_courses()
    record = next((c for c in courses if c.get("id") == course_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Course not found")
    if record.get("path") and os.path.exists(record["path"]):
        os.remove(record["path"])
    if RAG_READY:
        try:
            rag.delete(course_id)
        except Exception as e:  # noqa: BLE001
            print(f"[agent-gateway] failed to drop vectors for {course_id}: {e}")
    _save_courses([c for c in courses if c.get("id") != course_id])
    return {"deleted": course_id}


# ─── Real-time progress endpoints ────────────────────────────────────────────

class ProgressEvent(BaseModel):
    type: str = "progress"
    progress: dict[str, Any]


@app.post("/api/agents/progress")
async def publish_progress(event: ProgressEvent):
    """Students POST a progress snapshot here; it is fanned out to dashboards."""
    payload = {"type": event.type, "progress": event.progress,
               "at": datetime.now(timezone.utc).isoformat()}
    await manager.broadcast(payload)
    return {"delivered": len(manager.active)}


@app.websocket("/ws/progress")
async def progress_socket(ws: WebSocket):
    """Dashboards subscribe here to receive live student progress updates."""
    await manager.connect(ws)
    try:
        while True:
            # Clients may also push snapshots over the socket; relay them too.
            data = await ws.receive_json()
            data.setdefault("at", datetime.now(timezone.utc).isoformat())
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:  # noqa: BLE001
        manager.disconnect(ws)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AGENT_GATEWAY_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
