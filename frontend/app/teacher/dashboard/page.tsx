"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { tpService } from "@/services/tpService";
import { userService } from "@/services/userService";
import { TP, Assignment, TPProgress, User } from "@/types";
import { Wand2, PenLine, X, BookOpen, Sparkles, BarChart3 } from "lucide-react";

function CreateTPModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const choose = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: "#181825", borderColor: "#313244" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Créer un TP</h2>
            <p className="mt-0.5 text-sm text-[#6c7086]">Comment souhaitez-vous créer ce TP ?</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6c7086] transition-colors hover:bg-[#313244] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => choose("/teacher/create-tp/agent")}
            className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border p-5 text-left transition-all hover:border-[#cba6f7] hover:bg-[#cba6f7]/5"
            style={{ background: "#1e1e2e", borderColor: "#313244" }}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              style={{ background: "radial-gradient(circle, #cba6f744, transparent 70%)" }}
            />
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #cba6f7, #89b4fa)", color: "#1a1a2e" }}
            >
              <Wand2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-white">
                Agent IA
                <span className="rounded-full bg-[#cba6f7]/15 px-2 py-0.5 text-[10px] font-medium text-[#cba6f7]">
                  Nouveau
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#6c7086]">
                Déposez l'énoncé PDF ou écrivez un prompt — l'agent génère le TP complet.
              </p>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-[#cba6f7]">
              <Sparkles size={11} /> Recommandé
            </div>
          </button>

          {/* Manual */}
          <button
            onClick={() => choose("/teacher/create-tp")}
            className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border p-5 text-left transition-all hover:border-[#89b4fa] hover:bg-[#89b4fa]/5"
            style={{ background: "#1e1e2e", borderColor: "#313244" }}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              style={{ background: "radial-gradient(circle, #89b4fa44, transparent 70%)" }}
            />
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "#313244", color: "#89b4fa" }}
            >
              <PenLine size={18} />
            </div>
            <div>
              <div className="font-semibold text-white">Manuellement</div>
              <p className="mt-1 text-xs leading-relaxed text-[#6c7086]">
                Saisissez chaque étape, balise et question de quiz à la main.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { user, logout, isTeacher } = useAuth();
  const router = useRouter();
  const [tps, setTPs] = useState<TP[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, TPProgress>>({});
  const [userMap, setUserMap] = useState<Record<string, User>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isTeacher) {
      router.push("/login");
      return;
    }
    let cancelled = false;

    (async () => {
      const [allTPs, myAssigns, users] = await Promise.all([
        tpService.getAllTPs(),
        tpService.getAssignmentsForTeacher(user!.id),
        userService.getUserMap(),
      ]);

      // Prefetch progress for every assigned TP, keyed by `${studentId}:${tpId}`.
      const tpIds = Array.from(new Set(myAssigns.map((a) => a.tpId)));
      const progressLists = await Promise.all(tpIds.map((id) => tpService.getProgressByTp(id)));
      const map: Record<string, TPProgress> = {};
      progressLists.flat().forEach((p) => { map[`${p.studentId}:${p.tpId}`] = p; });

      if (cancelled) return;
      setTPs(allTPs);
      setAssignments(myAssigns);
      setProgressMap(map);
      setUserMap(users);
    })();

    return () => { cancelled = true; };
  }, [isTeacher, router, user]);

  const getStudentName = (id: string) => userMap[id]?.name ?? id;

  const myTPs = tps.filter((tp) => tp.createdBy === user?.id);
  const myAssignments = assignments.filter((a) => a.assignedBy === user?.id);

  const getStatsForAssignment = (assignment: Assignment) => {
    return assignment.studentIds.map((sid) => {
      const prog = progressMap[`${sid}:${assignment.tpId}`] ?? null;
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
      {showCreateModal && <CreateTPModal onClose={() => setShowCreateModal(false)} />}

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
          <Link
            href="/teacher/student-evaluation"
            className="flex items-center gap-1.5 text-sm text-[#6c7086] hover:text-white transition-colors"
          >
            <BarChart3 size={15} /> Evaluation
          </Link>
          <Link
            href="/teacher/courses"
            className="flex items-center gap-1.5 text-sm text-[#6c7086] hover:text-white transition-colors"
          >
            <BookOpen size={15} /> Courses
          </Link>
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              + Create TP
            </button>
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
          <h2 className="text-lg font-semibold text-white mb-4">📚 My TPs</h2>
          {myTPs.length === 0 ? (
            <div className="bg-[#181825] rounded-2xl border border-dashed border-[#313244] p-10 text-center">
              <p className="text-[#6c7086]">No TPs yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-[#cba6f7] text-sm mt-2 inline-block hover:underline"
              >
                Create your first TP →
              </button>
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
                  <p className="text-sm text-[#6c7086] mb-3 line-clamp-2">{tp.description}</p>
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
          <h2 className="text-lg font-semibold text-white mb-4">📊 Student Progress</h2>
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
                      <span className="text-xs text-[#6c7086]">{stats.length} students</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#313244]">
                          {["Student", "Status", "Progress", "Time", "Hints", "Quiz"].map((h) => (
                            <th key={h} className="text-left px-5 py-3 text-xs text-[#6c7086] font-medium uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((s, i) => (
                          <tr key={i} className="border-b border-[#1e1e2e] hover:bg-[#1e1e2e] transition-colors">
                            <td className="px-5 py-3 text-[#cdd6f4] font-medium">{s.studentName}</td>
                            <td className={`px-5 py-3 ${statusColor(s.status)}`}>{statusLabel(s.status)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 max-w-[80px] bg-[#313244] rounded-full h-1.5">
                                  <div
                                    className="bg-[#cba6f7] h-1.5 rounded-full"
                                    style={{ width: s.totalSteps ? `${(s.currentStep / s.totalSteps) * 100}%` : "0%" }}
                                  />
                                </div>
                                <span className="text-xs text-[#6c7086]">{s.currentStep}/{s.totalSteps}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-[#a6adc8] font-mono text-xs">{formatTime(s.timeSeconds)}</td>
                            <td className="px-5 py-3 text-[#f9e2af] font-mono text-xs">{s.hintsUsed || "—"}</td>
                            <td className="px-5 py-3 text-xs">
                              {s.quizScore !== null ? (
                                <span className={`font-bold ${s.quizScore >= 80 ? "text-[#a6e3a1]" : s.quizScore >= 50 ? "text-[#f9e2af]" : "text-[#f38ba8]"}`}>
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
