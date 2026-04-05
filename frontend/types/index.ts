// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = "teacher" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // plain-text for mock only
  role: UserRole;
  avatarInitials: string;
}

// ─── TP (Practical Work) ─────────────────────────────────────────────────────
export interface TPStep {
  id: string;
  title: string;
  instructions: string;
  requiredTags: string[]; // e.g. ["h1", "p", "button"]
  quiz: QuizQuestion[];
}

export interface TP {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  starterHTML: string;
  steps: TPStep[];
  createdBy: string; // teacher id
  createdAt: string;
}

// ─── Assignment ───────────────────────────────────────────────────────────────
export interface Assignment {
  id: string;
  tpId: string;
  studentIds: string[];
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
}

// ─── Student Progress ─────────────────────────────────────────────────────────
export interface StepProgress {
  stepId: string;
  code: string;
  timeSpentSeconds: number;
  hintsUsed: number;
  validationErrors: string[];
  completed: boolean;
  completedAt?: string;
}

export interface TPProgress {
  id: string;
  studentId: string;
  tpId: string;
  assignmentId: string;
  currentStepIndex: number;
  steps: StepProgress[];
  quizAnswers: Record<string, string>; // questionId -> answerId
  quizScore?: number;
  totalTimeSeconds: number;
  status: "not_started" | "in_progress" | "completed";
  startedAt?: string;
  completedAt?: string;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctId: string;
  explanation: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  hints: string[];
}
