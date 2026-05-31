"""Explanation Agent — Mistral via Ollama, explains TP content, never gives code."""
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

from tools.explain_tp import explain_tp_step, get_learning_objectives
from tools.clarify_question import structure_clarification, detect_misconception

app = FastAPI(title="Explanation Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are an expert educational assistant for a web development TP (Practical Work) platform.

YOUR ROLE:
- Explain TP steps, HTML concepts, and web development fundamentals to students
- Answer clarification questions in a Socratic, guiding style
- Help students UNDERSTAND, not just complete their work

STRICT RULES:
1. NEVER write, suggest, or complete HTML/CSS/JS code for the student
2. NEVER show code snippets, even as examples
3. NEVER reveal which exact tags or attributes to use directly — guide them to discover it
4. ALWAYS ask at least one guiding question to move the student forward
5. Keep responses concise (3-6 sentences) and encouraging

YOUR STYLE:
- Use the Socratic method: answer questions with questions that guide thinking
- Use real-world analogies to explain technical concepts
- Be encouraging and patient — mistakes are part of learning

If a student asks for code or the answer directly, remind them kindly that figuring it out themselves is the goal, and redirect to a helpful conceptual question."""

tools = [explain_tp_step, get_learning_objectives, structure_clarification, detect_misconception]


def get_llm():
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("EXPLANATION_AGENT_MODEL", "mistral")
    return ChatOllama(model=model, base_url=base_url, temperature=0.7)


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


class ExplainResponse(BaseModel):
    explanation: str
    type: str
    agent: str = "explanation-agent"
    model: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "agent": "explanation-agent",
        "model": os.getenv("EXPLANATION_AGENT_MODEL", "mistral"),
        "ollama_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
    }


@app.post("/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    try:
        llm = get_llm()
        agent = create_react_agent(llm, tools, state_modifier=SYSTEM_PROMPT)

        if req.question:
            user_message = (
                f"Student is working on TP: '{req.tp_title}'\n"
                f"Step: '{req.step_title}'\n"
                f"Instructions: {req.step_instructions}\n"
                f"Required elements: {', '.join(req.required_tags)}\n\n"
                f"Student's question: {req.question}\n\n"
                f"Use the clarification tools to structure your response, then answer the student."
            )
            response_type = "clarification"
        else:
            user_message = (
                f"Student is starting TP: '{req.tp_title}'\n"
                f"Description: {req.tp_description}\n\n"
                f"Step: '{req.step_title}'\n"
                f"Instructions: {req.step_instructions}\n"
                f"Required elements: {', '.join(req.required_tags)}\n\n"
                f"Use the explanation tools to structure your teaching, then provide a clear, engaging explanation."
            )
            response_type = "explanation"

        result = agent.invoke({"messages": [HumanMessage(content=user_message)]})
        last_message = result["messages"][-1]
        text = last_message.content if hasattr(last_message, "content") else str(last_message)

        return ExplainResponse(
            explanation=text,
            type=response_type,
            model=os.getenv("EXPLANATION_AGENT_MODEL", "mistral"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("EXPLANATION_AGENT_PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
