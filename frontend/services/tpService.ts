import { TP, TPProgress, Assignment, StepProgress, Evaluation } from "@/types";
import { mockTPs } from "@/data/mockTPs";
import { mockAssignments } from "@/data/mockAssignments";

const PROGRESS_KEY = "agentic_tp_progress";
const ASSIGNMENTS_KEY = "agentic_tp_assignments";
const TPS_KEY = "agentic_tp_tps";

// ─── TP CRUD ──────────────────────────────────────────────────────────────────
export const tpService = {
  getAllTPs(): TP[] {
    if (typeof window === "undefined") return mockTPs;
    const raw = localStorage.getItem(TPS_KEY);
    if (!raw) return mockTPs;
    try {
      return JSON.parse(raw) as TP[];
    } catch {
      return mockTPs;
    }
  },

  getTPById(id: string): TP | null {
    return this.getAllTPs().find((tp) => tp.id === id) ?? null;
  },

  saveTP(tp: TP): void {
    const tps = this.getAllTPs();
    const idx = tps.findIndex((t) => t.id === tp.id);
    if (idx >= 0) {
      tps[idx] = tp;
    } else {
      tps.push(tp);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(TPS_KEY, JSON.stringify(tps));
    }
  },

  deleteTP(id: string): void {
    const tps = this.getAllTPs().filter((t) => t.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(TPS_KEY, JSON.stringify(tps));
    }
  },

  // ─── Assignments ────────────────────────────────────────────────────────────
  getAllAssignments(): Assignment[] {
    if (typeof window === "undefined") return mockAssignments;
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!raw) return mockAssignments;
    try {
      return JSON.parse(raw) as Assignment[];
    } catch {
      return mockAssignments;
    }
  },

  getAssignmentsForStudent(studentId: string): Assignment[] {
    return this.getAllAssignments().filter((a) =>
      a.studentIds.includes(studentId)
    );
  },

  getAssignmentsForTeacher(teacherId: string): Assignment[] {
    return this.getAllAssignments().filter((a) => a.assignedBy === teacherId);
  },

  saveAssignment(assignment: Assignment): void {
    const assignments = this.getAllAssignments();
    const idx = assignments.findIndex((a) => a.id === assignment.id);
    if (idx >= 0) {
      assignments[idx] = assignment;
    } else {
      assignments.push(assignment);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    }
  },

  // ─── Progress ───────────────────────────────────────────────────────────────
  getAllProgress(): TPProgress[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as TPProgress[];
    } catch {
      return [];
    }
  },

  getProgress(studentId: string, tpId: string): TPProgress | null {
    return (
      this.getAllProgress().find(
        (p) => p.studentId === studentId && p.tpId === tpId
      ) ?? null
    );
  },

  saveProgress(progress: TPProgress): void {
    const all = this.getAllProgress();
    const idx = all.findIndex((p) => p.id === progress.id);
    if (idx >= 0) {
      all[idx] = progress;
    } else {
      all.push(progress);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    }
  },

  createProgress(
    studentId: string,
    tpId: string,
    assignmentId: string,
    steps: { id: string }[]
  ): TPProgress {
    const progress: TPProgress = {
      id: `prog-${Date.now()}`,
      studentId,
      tpId,
      assignmentId,
      currentStepIndex: 0,
      steps: steps.map(
        (s): StepProgress => ({
          stepId: s.id,
          code: "",
          timeSpentSeconds: 0,
          hintsUsed: 0,
          hintHistory: [],
          validationErrors: [],
          completed: false,
        })
      ),
      quizAnswers: {},
      totalTimeSeconds: 0,
      status: "in_progress",
      startedAt: new Date().toISOString(),
    };
    this.saveProgress(progress);
    return progress;
  },

    ONLINE_WINDOW_SECONDS: 120,

  
  touchActivity(studentId: string, tpId: string, stepIndex?: number, code?: string): void {
    const prog = this.getProgress(studentId, tpId);
    if (!prog) return;
    const updated: TPProgress = {
      ...prog,
      lastActiveAt: new Date().toISOString(),
      steps:
        stepIndex !== undefined && code !== undefined
          ? prog.steps.map((s, i) => (i === stepIndex ? { ...s, code } : s))
          : prog.steps,
    };
    this.saveProgress(updated);
  },

  isOnline(progress: TPProgress | null | undefined): boolean {
    if (!progress?.lastActiveAt) return false;
    const last = new Date(progress.lastActiveAt).getTime();
    return Date.now() - last <= this.ONLINE_WINDOW_SECONDS * 1000;
  },

 
  getBestCode(progress: TPProgress | null | undefined): string {
    if (!progress) return "";
    for (let i = progress.steps.length - 1; i >= 0; i--) {
      const c = progress.steps[i]?.code?.trim();
      if (c) return progress.steps[i].code;
    }
    return "";
  },

  
  evaluateStudent(progress: TPProgress | null | undefined, tp: TP): Evaluation {
    if (!progress || progress.status === "not_started") {
      return {
        points: 0,
        grade: "—",
        factors: [
          { label: "Time", score: 0, max: 30, detail: "Not started" },
          { label: "Hints", score: 0, max: 30, detail: "Not started" },
          { label: "Code format", score: 0, max: 40, detail: "No code submitted" },
        ],
      };
    }

    const estimateSec = Math.max(60, tp.estimatedMinutes * 60);
    const actualSec = Math.max(1, progress.totalTimeSeconds);
    const timeScore = Math.round(30 * Math.min(1, estimateSec / actualSec));
    const overBy = Math.max(0, actualSec - estimateSec);
    const timeDetail =
      overBy === 0
        ? `${Math.round(actualSec / 60)}m — within the ${tp.estimatedMinutes}m estimate`
        : `${Math.round(actualSec / 60)}m — ${Math.round(overBy / 60)}m over the ${tp.estimatedMinutes}m estimate`;

    const hintsUsed = progress.steps.reduce((s, st) => s + (st.hintsUsed ?? 0), 0);
    const allowed = Math.max(1, progress.steps.length * 2);
    const hintScore = Math.round(30 * Math.max(0, 1 - hintsUsed / allowed));
    const hintDetail = `${hintsUsed} hint${hintsUsed === 1 ? "" : "s"} used`;

    const code = this.getBestCode(progress);
    const requiredTags = Array.from(
      new Set(tp.steps.flatMap((s) => s.requiredTags ?? []))
    );
    const present = requiredTags.filter((t) =>
      new RegExp(`<${t}[\\s>/]`, "i").test(code)
    );
    const coverage = requiredTags.length
      ? present.length / requiredTags.length
      : code.trim()
      ? 1
      : 0;
    const coverageScore = Math.round(20 * coverage);

    let formatScore = 0;
    if (/<!doctype html>/i.test(code)) formatScore += 4;
    if (/\n[ \t]+\S/.test(code)) formatScore += 4; // some indentation
    const opens = (code.match(/<[a-zA-Z][^>]*[^/]>/g) ?? []).length;
    const closes = (code.match(/<\/[a-zA-Z]+>/g) ?? []).length;
    if (opens > 0 && closes > 0 && Math.abs(opens - closes) <= 2) formatScore += 6; // roughly balanced
    if (code.trim().length > 80) formatScore += 6; // not just the empty starter
    formatScore = Math.min(20, formatScore);

    const codeScore = coverageScore + formatScore;
    const codeDetail = requiredTags.length
      ? `${present.length}/${requiredTags.length} required tags · formatting ${formatScore}/20`
      : code.trim()
      ? `formatting ${formatScore}/20`
      : "No code submitted";

    const points = Math.min(100, timeScore + hintScore + codeScore);
    const grade =
      points >= 90 ? "A" : points >= 75 ? "B" : points >= 60 ? "C" : points >= 45 ? "D" : "F";

    return {
      points,
      grade,
      factors: [
        { label: "Time", score: timeScore, max: 30, detail: timeDetail },
        { label: "Hints", score: hintScore, max: 30, detail: hintDetail },
        { label: "Code format", score: codeScore, max: 40, detail: codeDetail },
      ],
    };
  },

  // ─── AI Explanation ─────────────────────────────────────────────────────────
  generateExplanation(tp: TP, stepIndex: number): string {
    const step = tp.steps[stepIndex];
    if (!step) return "No explanation available.";

    const tagList = step.requiredTags.map((t) => `<${t}>`).join(", ");

    return `
# 📚 ${step.title}

## What you need to do
${step.instructions}

## Key concept
In this step, you'll be working with the following HTML element(s): **${tagList}**.

## Why it matters
HTML elements are the building blocks of every web page. 
Each tag has a specific purpose: some display content, some organize structure, and some allow user interaction.

## How to approach it
1. Read the instructions carefully.
2. Look at the starter code and understand what's already there.
3. Add only the required elements — don't delete what exists.
4. Click **Run** to preview your result in real-time.
5. When you're happy, click **Validate** to check your work.

## 💡 Remember
- HTML tags always come in pairs: an opening tag \`<tag>\` and a closing tag \`</tag>\`.
- Nesting matters! Make sure your elements are properly nested inside \`<body>\`.

Good luck! You can do this. 🚀
    `.trim();
  },

  generateClarification(question: string, tp: TP): string {
    const lower = question.toLowerCase();

    if (lower.includes("what") && lower.includes("tag")) {
      return "Every HTML element is defined by a tag. Tags are written in angle brackets like <tagname>. They tell the browser what kind of content to display.";
    }
    if (lower.includes("where") || lower.includes("place")) {
      return "All visible content goes inside the <body> tag. Metadata and styles go inside <head>.";
    }
    if (lower.includes("how")) {
      return "Start by typing the opening tag, then your content, then the closing tag. For example: <h1>My Heading</h1>.";
    }
    if (lower.includes("error") || lower.includes("wrong")) {
      return "Don't worry! Check that you've spelled the tag correctly and that it's inside <body>. Use the validator to see exactly what's missing.";
    }

    return `Great question about "${tp.title}"! The key is to focus on the required HTML elements. Re-read the instructions carefully and try typing the code yourself — no copy-paste allowed. You've got this!`;
  },

  // ─── Teacher Dashboard stats ─────────────────────────────────────────────
  getStudentStatsForTP(tpId: string) {
    const allProgress = this.getAllProgress().filter((p) => p.tpId === tpId);
    return allProgress.map((p) => ({
      studentId: p.studentId,
      status: p.status,
      currentStep: p.currentStepIndex + 1,
      totalSteps: p.steps.length,
      totalTimeSeconds: p.totalTimeSeconds,
      hintsUsed: p.steps.reduce((sum, s) => sum + s.hintsUsed, 0),
      quizScore: p.quizScore ?? null,
    }));
  },
};
