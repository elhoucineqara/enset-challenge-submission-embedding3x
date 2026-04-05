"""Agent Gateway - FastAPI service to route requests to AI agents."""
from fastapi import FastAPI

app = FastAPI(title="Agent Gateway")


@app.get("/health")
def health():
    return {"status": "ok"}
