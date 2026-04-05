"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { tpService } from "@/services/tpService";
import { TP, TPProgress } from "@/types";
import TPExplanation from "@/components/TPExplanation/TPExplanation";
import IDELayout from "@/components/IDELayout/IDELayout";
import Quiz from "@/components/Quiz/Quiz";
import Link from "next/link";

// ─── Phase types ──────────────────────────────────────────────────────────────
type Phase = "explanation" | "coding" | "quiz" | "done";

export default function StudentTPPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignmentId") ?? "";
  const router = useRouter();
  const { user, isStudent } = useAuth();

  const [tp, setTP] = useState<TP | null>(null);
  const [progress, setProgress] = useState<TPProgress | null>(null);
  const [phase, setPhase] = useState<Phase>("explanation");
  const [loading, setLoading] = useState(true);

  // Derived
  const stepIndex = progress?.currentStepIndex ?? 0;
  const currentStep = tp?.steps[stepIndex] ?? null;
  const allSteps = tp?.steps ?? [];
  const allQuestions = allSteps.flatMap((s) => s.quiz);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isStudent || !user) { router.push("/login"); return; }

    const found = tpService.getTPById(id);
    if (!found) { router.push("/student/dashboard"); return; }
    setTP(found);

    let prog = tpService.getProgress(user.id, id);
    if (!prog) {
      prog = tpService.createProgress(user.id, id, assignmentId, found.steps);
    }
    setProgress(prog);

    // Resume phase
    if (prog.status === "completed") setPhase("done");
    else if (prog.currentStepIndex >= found.steps.length) setPhase("quiz");
    else setPhase("explanation");

    setLoading(false);
  }, [id, assignmentId, isStudent, user, router]);

  // ── Student starts coding (skips explanation) ─────────────────────────────
  const handleStartCoding = useCallback(() => setPhase("coding"), []);

  // ── Student finishes a step ───────────────────────────────────────────────
  const handleStepComplete = useCallback(
    (code: string, timeSeconds: number, hintsUsed: number) => {
      if (!progress || !tp) return;

      const updated: TPProgress = {
        ...progress,
        steps: progress.steps.map((s, i) =>
          i === stepIndex
            ? {
                ...s,
                code,
                timeSpentSeconds: timeSeconds,
                hintsUsed,
                completed: true,
                completedAt: new Date().toISOString(),
              }
            : s
        ),
        totalTimeSeconds: progress.totalTimeSeconds + timeSeconds,
      };

      const nextStep = stepIndex + 1;
      if (nextStep >= tp.steps.length) {
        // All steps done → quiz
        updated.currentStepIndex = nextStep;
        updated.status = "in_progress";
        setProgress(updated);
        tpService.saveProgress(updated);
        setPhase("quiz");
      } else {
        // Move to next step explanation
        updated.currentStepIndex = nextStep;
        setProgress(updated);
        tpService.saveProgress(updated);
        setPhase("explanation");
      }
    },
    [progress, tp, stepIndex]
  );

  // ── Quiz submitted ─────────────────────────────────────────────────────────
  const handleQuizSubmit = useCallback(
    (answers: Record<string, string>, score: number) => {
      if (!progress) return;
      const updated: TPProgress = {
        ...progress,
        quizAnswers: answers,
        quizScore: score,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
      setProgress(updated);
      tpService.saveProgress(updated);
      setPhase("done");
    },
    [progress]
  );

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading || !tp || !progress) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#cba6f7] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#6c7086] text-sm">Loading TP...</p>
        </div>
      </div>
    );
  }

  // ─── Done screen ──────────────────────────────────────────────────────────
  if (phase === "done") {
    const totalHints = progress.steps.reduce((s, st) => s + st.hintsUsed, 0);
    const totalMins = Math.floor(progress.totalTimeSeconds / 60);

    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-2">TP Complete!</h1>
          <p className="text-[#6c7086] mb-8">{tp.title}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Quiz Score", value: `${progress.quizScore ?? "—"}%`, color: "text-[#a6e3a1]" },
              { label: "Time spent", value: `${totalMins}m`, color: "text-[#89b4fa]" },
              { label: "Hints used", value: String(totalHints), color: "text-[#f9e2af]" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#181825] rounded-2xl border border-[#313244] p-4"
              >
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-[#6c7086] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/student/dashboard"
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] font-bold hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─── Quiz screen ──────────────────────────────────────────────────────────
  if (phase === "quiz") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] overflow-y-auto">
        <nav className="bg-[#181825] border-b border-[#313244] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href="/student/dashboard" className="text-[#6c7086] hover:text-white text-sm">
              ← Dashboard
            </Link>
            <span className="text-[#313244]">/</span>
            <span className="text-white text-sm font-medium">{tp.title}</span>
          </div>
          <span className="text-xs text-[#f9e2af] bg-[#f9e2af]/10 px-2 py-1 rounded-full">
            Final Quiz
          </span>
        </nav>
        <Quiz questions={allQuestions} onSubmit={handleQuizSubmit} />
      </div>
    );
  }

  // ─── Explanation screen ────────────────────────────────────────────────────
  if (phase === "explanation") {
    return (
      <div className="h-screen flex flex-col bg-[#1a1a2e]">
        {/* Top nav */}
        <nav className="bg-[#181825] border-b border-[#313244] px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/student/dashboard" className="text-[#6c7086] hover:text-white text-sm">
              ← Dashboard
            </Link>
            <span className="text-[#313244]">/</span>
            <span className="text-white text-sm font-medium">{tp.title}</span>
          </div>

          {/* Step progress pills */}
          <div className="hidden sm:flex items-center gap-1.5">
            {tp.steps.map((s, i) => (
              <div
                key={s.id}
                className={`h-2 rounded-full transition-all ${
                  i < stepIndex
                    ? "w-6 bg-[#a6e3a1]"
                    : i === stepIndex
                    ? "w-8 bg-[#cba6f7]"
                    : "w-4 bg-[#313244]"
                }`}
              />
            ))}
          </div>

          <span className="text-xs text-[#6c7086]">
            Step {stepIndex + 1} / {tp.steps.length}
          </span>
        </nav>

        {/* Explanation */}
        <div className="flex-1 overflow-hidden">
          <TPExplanation
            tp={tp}
            stepIndex={stepIndex}
            onStart={handleStartCoding}
          />
        </div>
      </div>
    );
  }

  // ─── Coding screen (IDE) ──────────────────────────────────────────────────
  if (phase === "coding" && currentStep) {
    return (
      <div className="h-screen flex flex-col bg-[#1a1a2e]">
        {/* Top nav */}
        <nav className="bg-[#181825] border-b border-[#313244] px-6 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPhase("explanation")}
              className="text-[#6c7086] hover:text-white text-sm transition-colors"
            >
              ← Instructions
            </button>
            <span className="text-[#313244]">/</span>
            <span className="text-white text-sm font-medium truncate max-w-[200px]">
              {tp.title}
            </span>
          </div>

          {/* Step progress */}
          <div className="hidden sm:flex items-center gap-1.5">
            {tp.steps.map((s, i) => (
              <div
                key={s.id}
                className={`h-2 rounded-full transition-all ${
                  i < stepIndex
                    ? "w-6 bg-[#a6e3a1]"
                    : i === stepIndex
                    ? "w-8 bg-[#e94560]"
                    : "w-4 bg-[#313244]"
                }`}
              />
            ))}
          </div>
        </nav>

        {/* IDE */}
        <div className="flex-1 overflow-hidden">
          <IDELayout
            step={currentStep}
            stepIndex={stepIndex}
            totalSteps={tp.steps.length}
            progress={progress}
            starterHTML={tp.starterHTML}
            onStepComplete={handleStepComplete}
          />
        </div>
      </div>
    );
  }

  return null;
}
