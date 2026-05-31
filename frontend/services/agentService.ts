/**
 * Agent Service — connects the frontend to the AI agent gateway.
 *
 * Routes:
 *   POST /api/agents/explain       → Explanation Agent (Mistral)
 *   POST /api/agents/hint          → Hint Agent (deepseek-coder:6.7b via Ollama)
 *   POST /api/agents/generate-quiz → Evaluation Agent (Gemma 3 27B)
 *   POST /api/agents/evaluate      → Evaluation Agent scoring
 *
 * Falls back gracefully when the backend is unavailable.
 */

const AGENT_BASE =
  process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL ?? "http://localhost:8000";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem("agentic_tp_session");
  if (!raw) return {};
  try {
    const session = JSON.parse(raw);
    const token = session.token ?? session.jwt ?? null;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // ignore
  }
  return {};
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AGENT_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Agent request failed [${res.status}]: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExplainRequest {
  tp_id: string;
  tp_title: string;
  tp_description: string;
  step_id: string;
  step_title: string;
  step_instructions: string;
  required_tags: string[];
  question?: string;
  session_id?: string;
}

export interface ExplainResponse {
  explanation: string;
  type: "explanation" | "clarification" | "guidance";
  agent: string;
  model: string;
}

export interface HintRequest {
  step_id: string;
  step_title: string;
  step_instructions: string;
  student_code: string;
  required_tags: string[];
  hints_already_given: number;
  previous_hints: string[];
  session_id?: string;
}

export interface HintResponse {
  hint: string;
  hint_level: number;
  validation_passed: boolean;
  missing_tags: string[];
  agent: string;
  model: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GenerateQuizRequest {
  tp_id: string;
  tp_title: string;
  tp_description: string;
  step_titles: string[];
  student_code: string;
  num_questions?: number;
}

export interface GenerateQuizResponse {
  questions: QuizQuestion[];
  agent: string;
  model: string;
}

export interface EvaluateAnswersRequest {
  tp_id: string;
  tp_title: string;
  questions: QuizQuestion[];
  student_answers: number[];
  student_code: string;
}

export interface EvaluateAnswersResponse {
  score: number;
  correct: number;
  total: number;
  grade: string;
  feedback: string;
  breakdown: Array<{
    question_num: number;
    question: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
  }>;
  agent: string;
  model: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const agentService = {
  /**
   * Get an AI explanation of a TP step (or answer a clarification question).
   * Uses Mistral via the Explanation Agent.
   */
  async explain(req: ExplainRequest): Promise<ExplainResponse> {
    return post<ExplainResponse>("/api/agents/explain", req);
  },

  /**
   * Get a progressive hint for the student's current code.
   * Uses deepseek-coder:6.7b via the Hint Agent (Ollama).
   */
  async getHint(req: HintRequest): Promise<HintResponse> {
    return post<HintResponse>("/api/agents/hint", req);
  },

  /**
   * Generate AI quiz questions based on the student's completed TP.
   * Uses Gemma 3 27B via the Evaluation Agent.
   */
  async generateQuiz(req: GenerateQuizRequest): Promise<GenerateQuizResponse> {
    return post<GenerateQuizResponse>("/api/agents/generate-quiz", req);
  },

  /**
   * Evaluate the student's quiz answers and generate feedback.
   * Uses Gemma 3 27B via the Evaluation Agent.
   */
  async evaluate(req: EvaluateAnswersRequest): Promise<EvaluateAnswersResponse> {
    return post<EvaluateAnswersResponse>("/api/agents/evaluate", req);
  },

  /**
   * Check if the agent gateway is reachable.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${AGENT_BASE}/health`, { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  },
};
