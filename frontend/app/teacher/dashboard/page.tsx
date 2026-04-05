"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { tpService } from "@/services/tpService";
import { TP, Assignment } from "@/types";
import { mockUsers } from "@/data/mockUsers";

export default function TeacherDashboardPage() {
  const { user, logout, isTeacher } = useAuth();
  const router = useRouter();
  const [tps, setTPs] = useState<TP[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!isTeacher) {
      router.push("/login");
      return;
    }
    setTPs(tpService.getAllTPs());
    setAssignments(tpService.getAllAssignments());
  }, [isTeacher, router]);

  const getStudentName = (id: string) =>
    mockUsers.find((u) => u.id === id)?.name ?? id;

  const myTPs = tps.filter((tp) => tp.createdBy === user?.id);
  const myAssignments = assignments.filter((a) => a.assignedBy === user?.id);

  // Compute progress stats per assignment
  const getStatsForAssignment = (assignment: Assignment) => {
    return assignment.studentIds.map((sid) => {
      const prog = tpService.getProgress(sid, assignment.tpId);
      return {
        studentName: getStudentName(sid),
        status: prog?.status ?? "not_started",
        currentStep: prog ? prog.currentStepIndex + 1 : 0,
        totalSteps: tps.find((t) => t.id === assignment.tpId)?.steps.length ?? 0,
        timeSeconds: prog?.totalTimeSeconds ?? 0,
        hintsUsed: prog?.steps.reduce((s, st) => s + st.hintsUsed, 0) ?? 0,
        quizScore: prog?.quizScore ?? null,
      };
    });
  };

  const statusColor = (s: string) => {
    if (s === "completed") return "text-[#a6e3a1]";
    if (s === "in_progress") return "text-[#f9e2af]";
    return "text-[#45475a]";
  };

  const statusLabel = (s: string) => {
    if (s === "completed") return "✅ Done";
    if (s === "in_progress") return "🔄 In Progress";
    return "⏳ Not Started";
  };

  const formatTime = (s: number) => {
    if (s === 0) return "—";
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* Nav */}
      <nav className="bg-[#181825] border-b border-[#313244] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <span className="text-lg font-bold text-white">Agentic TP</span>
          <span className="text-xs text-[#cba6f7] bg-[#cba6f7]/10 px-2 py-0.5 rounded-full">
            Teacher
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-[#6c7086] mt-1">
              {myTPs.length} TPs created · {myAssignments.length} assignments active
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/teacher/create-tp"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              + Create TP
            </Link>
            <Link
              href="/teacher/assign-tp"
              className="px-4 py-2 rounded-xl bg-[#313244] text-[#cdd6f4] font-semibold text-sm hover:bg-[#45475a] transition-colors"
            >
              Assign TP
            </Link>
          </div>
        </div>

        {/* My TPs */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">
            📚 My TPs
          </h2>
          {myTPs.length === 0 ? (
            <div className="bg-[#181825] rounded-2xl border border-dashed border-[#313244] p-10 text-center">
              <p className="text-[#6c7086]">No TPs yet.</p>
              <Link href="/teacher/create-tp" className="text-[#cba6f7] text-sm mt-2 inline-block">
                Create your first TP →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTPs.map((tp) => (
                <div
                  key={tp.id}
                  className="bg-[#181825] rounded-2xl border border-[#313244] p-5 hover:border-[#45475a] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white text-base">{tp.title}</h3>
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
                  </div>
                  <p className="text-sm text-[#6c7086] mb-3 line-clamp-2">
                    {tp.description}
                  </p>
                  <p className="text-xs text-[#45475a]">
                    {tp.steps.length} steps · ~{tp.estimatedMinutes}min
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Student Progress */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">
            📊 Student Progress
          </h2>
          {myAssignments.length === 0 ? (
            <div className="bg-[#181825] rounded-2xl border border-dashed border-[#313244] p-10 text-center">
              <p className="text-[#6c7086]">No assignments yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {myAssignments.map((assignment) => {
                const tp = tps.find((t) => t.id === assignment.tpId);
                const stats = getStatsForAssignment(assignment);
                return (
                  <div
                    key={assignment.id}
                    className="bg-[#181825] rounded-2xl border border-[#313244] overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-[#313244] flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {tp?.title ?? assignment.tpId}
                      </h3>
                      <span className="text-xs text-[#6c7086]">
                        {stats.length} students
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#313244]">
                          {["Student", "Status", "Progress", "Time", "Hints", "Quiz"].map(
                            (h) => (
                              <th
                                key={h}
                                className="text-left px-5 py-3 text-xs text-[#6c7086] font-medium uppercase tracking-wider"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((s, i) => (
                          <tr
                            key={i}
                            className="border-b border-[#1e1e2e] hover:bg-[#1e1e2e] transition-colors"
                          >
                            <td className="px-5 py-3 text-[#cdd6f4] font-medium">
                              {s.studentName}
                            </td>
                            <td className={`px-5 py-3 ${statusColor(s.status)}`}>
                              {statusLabel(s.status)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 max-w-[80px] bg-[#313244] rounded-full h-1.5">
                                  <div
                                    className="bg-[#cba6f7] h-1.5 rounded-full"
                                    style={{
                                      width: s.totalSteps
                                        ? `${(s.currentStep / s.totalSteps) * 100}%`
                                        : "0%",
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-[#6c7086]">
                                  {s.currentStep}/{s.totalSteps}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-[#a6adc8] font-mono text-xs">
                              {formatTime(s.timeSeconds)}
                            </td>
                            <td className="px-5 py-3 text-[#f9e2af] font-mono text-xs">
                              {s.hintsUsed || "—"}
                            </td>
                            <td className="px-5 py-3 text-xs">
                              {s.quizScore !== null ? (
                                <span
                                  className={`font-bold ${
                                    s.quizScore >= 80
                                      ? "text-[#a6e3a1]"
                                      : s.quizScore >= 50
                                      ? "text-[#f9e2af]"
                                      : "text-[#f38ba8]"
                                  }`}
                                >
                                  {s.quizScore}%
                                </span>
                              ) : (
                                <span className="text-[#45475a]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
