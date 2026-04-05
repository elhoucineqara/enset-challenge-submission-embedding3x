"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { tpService } from "@/services/tpService";
import { TP, Assignment, TPProgress } from "@/types";

interface TPCard {
  tp: TP;
  assignment: Assignment;
  progress: TPProgress | null;
}

export default function StudentDashboardPage() {
  const { user, logout, isStudent } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<TPCard[]>([]);

  useEffect(() => {
    if (!isStudent) { router.push("/login"); return; }

    const assignments = tpService.getAssignmentsForStudent(user!.id);
    const allTPs = tpService.getAllTPs();

    const data: TPCard[] = assignments.flatMap((a) => {
      const tp = allTPs.find((t) => t.id === a.tpId);
      if (!tp) return [];
      const progress = tpService.getProgress(user!.id, tp.id);
      return [{ tp, assignment: a, progress }];
    });

    setCards(data);
  }, [isStudent, user, router]);

  const getStatusLabel = (p: TPProgress | null) => {
    if (!p || p.status === "not_started")
      return { text: "Not started", color: "text-[#45475a]", bg: "bg-[#45475a]/10" };
    if (p.status === "in_progress")
      return { text: "In progress", color: "text-[#f9e2af]", bg: "bg-[#f9e2af]/10" };
    return { text: "Completed", color: "text-[#a6e3a1]", bg: "bg-[#a6e3a1]/10" };
  };

  const getProgressPct = (p: TPProgress | null, tp: TP) => {
    if (!p) return 0;
    return Math.round((p.currentStepIndex / tp.steps.length) * 100);
  };

  const stats = {
    total: cards.length,
    done: cards.filter((c) => c.progress?.status === "completed").length,
    inProgress: cards.filter((c) => c.progress?.status === "in_progress").length,
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* Nav */}
      <nav className="bg-[#181825] border-b border-[#313244] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <span className="text-lg font-bold text-white">Agentic TP</span>
          <span className="text-xs text-[#89b4fa] bg-[#89b4fa]/10 px-2 py-0.5 rounded-full">
            Student
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#a6adc8]">{user?.name}</span>
          <button
            onClick={logout}
            className="text-sm text-[#6c7086] hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Hi {user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-[#6c7086] mt-1">Here are your assigned TPs.</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total TPs", value: stats.total, color: "text-[#cba6f7]" },
            { label: "In Progress", value: stats.inProgress, color: "text-[#f9e2af]" },
            { label: "Completed", value: stats.done, color: "text-[#a6e3a1]" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#181825] rounded-2xl border border-[#313244] px-5 py-4"
            >
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-[#6c7086] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* TP Cards */}
        {cards.length === 0 ? (
          <div className="bg-[#181825] rounded-2xl border border-dashed border-[#313244] p-16 text-center">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-[#6c7086] text-lg">No TPs assigned yet.</p>
            <p className="text-[#45475a] text-sm mt-1">
              Check back with your teacher.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map(({ tp, assignment, progress }) => {
              const status = getStatusLabel(progress);
              const pct = getProgressPct(progress, tp);

              return (
                <Link
                  key={`${tp.id}-${assignment.id}`}
                  href={`/student/tp/${tp.id}?assignmentId=${assignment.id}`}
                  className="group block"
                >
                  <div className="bg-[#181825] rounded-2xl border border-[#313244] p-5 hover:border-[#89b4fa] transition-all h-full flex flex-col">
                    {/* Top */}
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                          tp.difficulty === "beginner"
                            ? "text-[#a6e3a1] bg-[#a6e3a1]/10"
                            : tp.difficulty === "intermediate"
                            ? "text-[#f9e2af] bg-[#f9e2af]/10"
                            : "text-[#f38ba8] bg-[#f38ba8]/10"
                        }`}
                      >
                        {tp.difficulty}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}
                      >
                        {status.text}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#89b4fa] transition-colors">
                      {tp.title}
                    </h3>
                    <p className="text-sm text-[#6c7086] mb-4 flex-1 line-clamp-2">
                      {tp.description}
                    </p>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-[#6c7086]">
                        <span>
                          {progress ? `Step ${progress.currentStepIndex + 1}` : "Step 1"}{" "}
                          / {tp.steps.length}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#313244] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1e1e2e]">
                      <span className="text-xs text-[#45475a]">
                        ⏱ ~{tp.estimatedMinutes}min
                      </span>
                      {assignment.dueDate && (
                        <span className="text-xs text-[#f9e2af]">
                          Due {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
