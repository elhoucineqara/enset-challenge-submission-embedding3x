"""Evaluation Agent — gemma4:31b-cloud via Ollama, generates and evaluates QCM quizzes."""
import os
import json
import re
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

from tools.qcm_generator import build_quiz_generation_prompt, validate_quiz_structure
from tools.evaluate_qcm import calculate_quiz_score, generate_feedback_summary

app = FastAPI(title="Evaluation Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

QUIZ_GENERATION_PROMPT = """You are an expert educational assessment designer for a web development platform.

Generate thoughtful multiple-choice questions that test COMPREHENSION, not memorization.
Questions must be grounded in what the student actually coded.

QUIZ FORMAT — return a raw JSON array ONLY, no markdown, no explanation:
[
  {
    "question": "...",
    "options": ["option A", "option B", "option C", "option D"],
    "correctIndex": 0,
    "explanation": "..."
  }
]

RULES:
- Exactly 4 options per question
- Wrong answers must be plausible (common misconceptions)
- Test understanding of WHY, not just WHAT
- Return ONLY the JSON array"""

EVALUATION_PROMPT = """You are an educational evaluator providing personalized feedback.
Use the score calculation tools to compute the exact score.
Generate specific, constructive feedback for wrong answers.
Be encouraging — focus on what they learned."""

tools_quiz = [build_quiz_generation_prompt, validate_quiz_structure]
tools_eval = [calculate_quiz_score, generate_feedback_summary]


def get_llm():
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("EVALUATION_AGENT_MODEL", "gemma4:31b-cloud")
    return ChatOllama(model=model, base_url=base_url, temperature=0.4)


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


class GenerateQuizResponse(BaseModel):
    questions: list[QuizQuestion]
    agent: str = "evaluation-agent"
    model: str


class EvaluateAnswersRequest(BaseModel):
    tp_id: str
    tp_title: str
    questions: list[QuizQuestion]
    student_answers: list[int]
    student_code: str
    session_id: str | None = None


class EvaluateAnswersResponse(BaseModel):
    score: int
    correct: int
    total: int
    grade: str
    feedback: str
    breakdown: list[dict]
    agent: str = "evaluation-agent"
    model: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "agent": "evaluation-agent",
        "model": os.getenv("EVALUATION_AGENT_MODEL", "gemma4:31b-cloud"),
        "ollama_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
    }


@app.post("/generate-quiz", response_model=GenerateQuizResponse)
async def generate_quiz(req: GenerateQuizRequest):
    try:
        llm = get_llm()
        agent = create_react_agent(llm, tools_quiz, state_modifier=QUIZ_GENERATION_PROMPT)

        user_message = (
            f"Generate {req.num_questions} quiz questions for:\n"
            f"TP: '{req.tp_title}'\n"
            f"Description: {req.tp_description}\n"
            f"Steps covered: {', '.join(req.step_titles)}\n"
            f"Student's code:\n```html\n{req.student_code[:600]}\n```\n\n"
            f"Use build_quiz_generation_prompt first, then return a pure JSON array of {req.num_questions} questions."
        )

        result = agent.invoke({"messages": [HumanMessage(content=user_message)]})
        last_msg = result["messages"][-1]
        raw = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

        # Extract JSON array from response
        raw = raw.strip()
        # Remove markdown code fences
        raw = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
        # Find JSON array
        match = re.search(r"\[[\s\S]*\]", raw)
        if match:
            raw = match.group()

        questions_data = json.loads(raw)
        questions = [QuizQuestion(**q) for q in questions_data]

        return GenerateQuizResponse(
            questions=questions,
            model=os.getenv("EVALUATION_AGENT_MODEL", "gemma4:31b-cloud"),
        )
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse quiz JSON: {e}\nRaw: {raw[:300]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate", response_model=EvaluateAnswersResponse)
async def evaluate_answers(req: EvaluateAnswersRequest):
    try:
        questions_json = json.dumps([q.model_dump() for q in req.questions])
        answers_json = json.dumps(req.student_answers)

        # Direct calculation — reliable and fast
        from tools.evaluate_qcm import calculate_quiz_score as calc_score
        score_raw = calc_score.invoke({
            "questions_json": questions_json,
            "student_answers_json": answers_json,
        })
        score_data = json.loads(score_raw)

        # Generate feedback with LLM
        try:
            llm = get_llm()
            agent = create_react_agent(llm, tools_eval, state_modifier=EVALUATION_PROMPT)
            wrong = [b for b in score_data.get("breakdown", []) if not b["is_correct"]]
            feedback_result = agent.invoke({"messages": [HumanMessage(
                content=(
                    f"Score: {score_data['score']}% on '{req.tp_title}'. "
                    f"Wrong answers: {json.dumps(wrong[:2])}. "
                    f"Use generate_feedback_summary then return short encouraging feedback."
                )
            )]})
            feedback_msg = feedback_result["messages"][-1]
            feedback = feedback_msg.content if hasattr(feedback_msg, "content") else str(feedback_msg)
        except Exception:
            score = score_data.get("score", 0)
            feedback = (
                f"Score: {score}% on '{req.tp_title}'. "
                + ("Excellent work!" if score >= 80 else "Good effort! Review the incorrect answers above." if score >= 60 else "Keep studying the concepts.")
            )

        return EvaluateAnswersResponse(
            score=score_data.get("score", 0),
            correct=score_data.get("correct", 0),
            total=score_data.get("total", len(req.questions)),
            grade=score_data.get("grade", "Unknown"),
            feedback=feedback,
            breakdown=score_data.get("breakdown", []),
            model=os.getenv("EVALUATION_AGENT_MODEL", "gemma4:31b-cloud"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("EVALUATION_AGENT_PORT", 8003))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
