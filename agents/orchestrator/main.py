"""
Orchestrator Service — DeepSeek v3 powered routing orchestrator.
Handles complex multi-agent requests that can't be statically routed.
"""
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

from orchestrator import run_orchestration

app = FastAPI(title="Agent Orchestrator", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class OrchestrateRequest(BaseModel):
    action: str
    context: dict[str, Any]
    session_id: str | None = None


class OrchestrateResponse(BaseModel):
    result: Any
    orchestrated: bool = True
    session_id: str | None = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "orchestrator",
        "model": os.getenv("ORCHESTRATOR_MODEL", "deepseek-chat"),
    }


@app.post("/orchestrate", response_model=OrchestrateResponse)
async def orchestrate(req: OrchestrateRequest):
    try:
        result = run_orchestration(req.action, req.context)
        return OrchestrateResponse(
            result=result,
            orchestrated=True,
            session_id=req.session_id,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Orchestration failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ORCHESTRATOR_PORT", 8004))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
