import { TP, TPProgress, Assignment, StepProgress } from "@/types";
import { mockTPs } from "@/data/mockTPs";
import { mockAssignments } from "@/data/mockAssignments";
import {
  legacyAssignmentIdToUuid,
  legacyTpIdToUuid,
  legacyUserIdToUuid,
} from "@/data/mockIds";

const PROGRESS_KEY = "agentic_tp_progress";
const ASSIGNMENTS_KEY = "agentic_tp_assignments";
const TPS_KEY = "agentic_tp_tps";

const mapId = (id: string, mapper: Record<string, string>): string => mapper[id] ?? id;

const migrateTp = (tp: TP): TP => {
  const newId = mapId(tp.id, legacyTpIdToUuid);
  const newCreatedBy = mapId(tp.createdBy, legacyUserIdToUuid);
  if (newId === tp.id && newCreatedBy === tp.createdBy) return tp;
  return { ...tp, id: newId, createdBy: newCreatedBy };
};

const migrateAssignment = (a: Assignment): Assignment => {
  const newId = mapId(a.id, legacyAssignmentIdToUuid);
  const newTpId = mapId(a.tpId, legacyTpIdToUuid);
  const newAssignedBy = mapId(a.assignedBy, legacyUserIdToUuid);
  const newStudentIds = a.studentIds.map((sid) => mapId(sid, legacyUserIdToUuid));
  if (
    newId === a.id &&
    newTpId === a.tpId &&
    newAssignedBy === a.assignedBy &&
    newStudentIds.every((v, i) => v === a.studentIds[i])
  ) {
    return a;
  }
  return {
    ...a,
    id: newId,
    tpId: newTpId,
    assignedBy: newAssignedBy,
    studentIds: newStudentIds,
  };
};

const migrateProgress = (p: TPProgress): TPProgress => {
  const newStudentId = mapId(p.studentId, legacyUserIdToUuid);
  const newTpId = mapId(p.tpId, legacyTpIdToUuid);
  const newAssignmentId = mapId(p.assignmentId, legacyAssignmentIdToUuid);

  if (
    newStudentId === p.studentId &&
    newTpId === p.tpId &&
    newAssignmentId === p.assignmentId
  ) {
    return p;
  }

  return {
    ...p,
    studentId: newStudentId,
    tpId: newTpId,
    assignmentId: newAssignmentId,
  };
};

// ─── TP CRUD ──────────────────────────────────────────────────────────────────
export const tpService = {
  getAllTPs(): TP[] {
    if (typeof window === "undefined") return mockTPs;
    const raw = localStorage.getItem(TPS_KEY);
    if (!raw) return mockTPs;
    try {
      const parsed = JSON.parse(raw) as TP[];
      const migrated = parsed.map(migrateTp);
      const changed = migrated.some((t, i) => t !== parsed[i]);
      if (changed) {
        localStorage.setItem(TPS_KEY, JSON.stringify(migrated));
      }
      return migrated;
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
      const parsed = JSON.parse(raw) as Assignment[];
      const migrated = parsed.map(migrateAssignment);
      const changed = migrated.some((a, i) => a !== parsed[i]);
      if (changed) {
        localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(migrated));
      }
      return migrated;
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
      const parsed = JSON.parse(raw) as TPProgress[];
      const migrated = parsed.map(migrateProgress);
      const changed = migrated.some((p, i) => p !== parsed[i]);
      if (changed) {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(migrated));
      }
      return migrated;
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
