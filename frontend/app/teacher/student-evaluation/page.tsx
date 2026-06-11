"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { tpService } from "@/services/tpService";
import { userService } from "@/services/userService";
import { subscribeProgress } from "@/services/realtimeService";
import { TP, TPProgress, Evaluation } from "@/types";
import { X, Code2, Clock, Lightbulb, Trophy, BookOpen, Layers } from "lucide-react";

interface StudentRow {
  studentId: string;
  studentName: string;
  initials: string;
  status: "not_started" | "in_progress" | "completed";
  currentStep: number;
  totalSteps: number;
  timeSeconds: number;
  hintsUsed: number;
  quizScore: number | null;
  online: boolean;
  lastActiveAt?: string;
  evaluation: Evaluation;
  code: string;
}

interface TPGroup {
  tp: TP;
  students: StudentRow[];
}

interface FieldGroup {
  field: string;
  tps: TPGroup[];
}

const formatTime = (s: number) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

const ago = (iso?: string) => {
  if (!iso) return "never";
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

const gradeColor = (g: string) => {
  if (g === "A") return "text-[#a6e3a1] bg-[#a6e3a1]/10";
  if (g === "B") return "text-[#94e2d5] bg-[#94e2d5]/10";
  if (g === "C") return "text-[#f9e2af] bg-[#f9e2af]/10";
  if (g === "D") return "text-[#fab387] bg-[#fab387]/10";
  if (g === "F") return "text-[#f38ba8] bg-[#f38ba8]/10";
  return "text-[#6c7086] bg-[#313244]";
};

const statusLabel = (s: string) =>
  s === "completed" ? "Done" : s === "in_progress" ? "In progress" : "Not started";
const statusColor = (s: string) =>
  s === "completed" ? "text-[#a6e3a1]" : s === "in_progress" ? "text-[#f9e2af]" : "text-[#45475a]";

function DetailModal({ row, tpTitle, onClose }: { row: StudentRow; tpTitle: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border"
        style={{ background: "#181825", borderColor: "#313244" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between border-b border-[#313244] bg-[#181825] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{row.studentName}</h2>
            <p className="mt-0.5 text-sm text-[#6c7086]">{tpTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-lg px-3 py-1.5 text-lg font-bold ${gradeColor(row.evaluation.grade)}`}>
              {row.evaluation.points}/100 · {row.evaluation.grade}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#6c7086] transition-colors hover:bg-[#313244] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Evaluation factors */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">⚖️ Agent evaluation</h3>
            <div className="space-y-3">
              {row.evaluation.factors.map((f) => (
                <div key={f.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#cdd6f4]">{f.label}</span>
                    <span className="font-mono text-[#a6adc8]">
                      {f.score}/{f.max}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#313244]">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-[#cba6f7] to-[#89b4fa]"
                      style={{ width: `${(f.score / f.max) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#6c7086]">{f.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Saved code */}
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white">
              <Code2 size={14} /> Submitted code
            </h3>
            {row.code.trim() ? (
              <pre className="overflow-x-auto rounded-xl border border-[#313244] bg-[#1e1e2e] p-4 text-xs leading-relaxed text-[#cdd6f4]">
                <code>{row.code}</code>
              </pre>
            ) : (
              <p className="rounded-xl border border-dashed border-[#313244] p-6 text-center text-sm text-[#6c7086]">
                No code saved yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentEvaluationPage() {
  const { user, logout, isTeacher } = useAuth();
  const router = useRouter();
  const [fields, setFields] = useState<FieldGroup[]>([]);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<{ row: StudentRow; tpTitle: string } | null>(null);

  useEffect(() => {
    if (!isTeacher) {
      router.push("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      const [assignments, userMap] = await Promise.all([
        tpService.getAssignmentsForTeacher(user!.id),
        userService.getUserMap(),
      ]);
      const studentName = (id: string) => userMap[id]?.name ?? id;
      const initials = (id: string) => userMap[id]?.avatarInitials ?? "??";

      // Resolve each assigned TP, grouped by field.
      const byField = new Map<string, Map<string, { tp: TP; studentIds: Set<string> }>>();
      const tpCache = new Map<string, TP | null>();
      for (const a of assignments) {
        if (!tpCache.has(a.tpId)) tpCache.set(a.tpId, await tpService.getTPById(a.tpId));
        const tp = tpCache.get(a.tpId);
        if (!tp) continue;
        const field = tp.field || "Général";
        if (!byField.has(field)) byField.set(field, new Map());
        const tpMap = byField.get(field)!;
        if (!tpMap.has(tp.id)) tpMap.set(tp.id, { tp, studentIds: new Set() });
        a.studentIds.forEach((sid) => tpMap.get(tp.id)!.studentIds.add(sid));
      }

      // Fetch all progress per TP once, keyed by `${studentId}:${tpId}`.
      const tpIds = Array.from(new Set(assignments.map((a) => a.tpId)));
      const progressLists = await Promise.all(tpIds.map((id) => tpService.getProgressByTp(id)));
      const progMap = new Map<string, TPProgress>();
      progressLists.flat().forEach((p) => progMap.set(`${p.studentId}:${p.tpId}`, p));

      const result: FieldGroup[] = Array.from(byField.entries())
        .map(([field, tpMap]) => ({
          field,
          tps: Array.from(tpMap.values()).map(({ tp, studentIds }) => ({
            tp,
            students: Array.from(studentIds).map((sid): StudentRow => {
              const prog = progMap.get(`${sid}:${tp.id}`) ?? null;
              return {
                studentId: sid,
                studentName: studentName(sid),
                initials: initials(sid),
                status: prog?.status ?? "not_started",
                currentStep: prog ? Math.min(prog.currentStepIndex + 1, tp.steps.length) : 0,
                totalSteps: tp.steps.length,
                timeSeconds: prog?.totalTimeSeconds ?? 0,
                hintsUsed: prog?.steps.reduce((s, st) => s + (st.hintsUsed ?? 0), 0) ?? 0,
                quizScore: prog?.quizScore ?? null,
                online: tpService.isOnline(prog),
                lastActiveAt: prog?.lastActiveAt,
                evaluation: tpService.evaluateStudent(prog, tp),
                code: tpService.getBestCode(prog),
              };
            }),
          })),
        }))
        .sort((a, b) => a.field.localeCompare(b.field));

      if (!cancelled) setFields(result);
    })();

    return () => { cancelled = true; };
  }, [isTeacher, user, router, tick]);

  // Live updates: a progress push over WebSocket triggers a refetch (the snapshot
  // is already persisted server-side, so re-reading reflects it immediately).
  useEffect(() => {
    if (!isTeacher) return;
    const unsubscribe = subscribeProgress(() => setTick((t) => t + 1));
    // Light fallback refresh keeps "online/offline" presence accurate if the
    // socket is unavailable.
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      unsubscribe();
      clearInterval(id);
    };
  }, [isTeacher]);

  const totals = useMemo(() => {
    const rows = fields.flatMap((f) => f.tps.flatMap((t) => t.students));
    return {
      students: new Set(rows.map((r) => r.studentId)).size,
      online: rows.filter((r) => r.online).length,
      fields: fields.length,
      tps: fields.reduce((n, f) => n + f.tps.length, 0),
    };
  }, [fields]);

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {selected && (
        <DetailModal
          row={selected.row}
          tpTitle={selected.tpTitle}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-[#313244] bg-[#181825] px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <span className="text-lg font-bold text-white">Agentic TP</span>
          <span className="rounded-full bg-[#cba6f7]/10 px-2 py-0.5 text-xs text-[#cba6f7]">Teacher</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/teacher/dashboard" className="text-sm text-[#6c7086] transition-colors hover:text-white">
            Dashboard
          </Link>
          <span className="text-sm text-[#a6adc8]">{user?.name}</span>
          <button onClick={logout} className="text-sm text-[#6c7086] transition-colors hover:text-white">
            Sign out
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">📊 Student Evaluation</h1>
          <p className="mt-1 text-[#6c7086]">
            Live performance per TP, grouped by field. Scores are graded by the evaluation agent on time,
            hints, and code format.
          </p>
        </div>

        {/* Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: <Layers size={16} />, label: "Fields", value: totals.fields },
            { icon: <BookOpen size={16} />, label: "TPs", value: totals.tps },
            { icon: <Trophy size={16} />, label: "Students", value: totals.students },
            { icon: <span className="h-2.5 w-2.5 rounded-full bg-[#a6e3a1]" />, label: "Online now", value: totals.online },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-[#313244] bg-[#181825] p-4">
              <div className="flex items-center gap-2 text-[#6c7086]">
                {s.icon}
                <span className="text-xs uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#313244] bg-[#181825] p-10 text-center">
            <p className="text-[#6c7086]">No assignments yet — assign a TP to see student evaluations here.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {fields.map((fg) => (
              <section key={fg.field}>
                {/* Field header */}
                <div className="mb-4 flex items-center gap-3">
                  <Layers size={18} className="text-[#cba6f7]" />
                  <h2 className="text-lg font-semibold text-white">{fg.field}</h2>
                  <span className="rounded-full bg-[#313244] px-2 py-0.5 text-xs text-[#a6adc8]">
                    {fg.tps.length} TP{fg.tps.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-6">
                  {fg.tps.map((tg) => (
                    <div
                      key={tg.tp.id}
                      className="overflow-hidden rounded-2xl border border-[#313244] bg-[#181825]"
                    >
                      <div className="flex items-center justify-between border-b border-[#313244] px-5 py-4">
                        <div className="flex items-center gap-2">
                          <BookOpen size={15} className="text-[#89b4fa]" />
                          <h3 className="font-semibold text-white">{tg.tp.title}</h3>
                        </div>
                        <span className="text-xs text-[#6c7086]">
                          {tg.students.length} student{tg.students.length > 1 ? "s" : ""} ·{" "}
                          {tg.tp.steps.length} steps · ~{tg.tp.estimatedMinutes}m
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#313244]">
                              {["Student", "Status", "Work line", "Time", "Hints", "Quiz", "Points", ""].map((h) => (
                                <th
                                  key={h}
                                  className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6c7086]"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tg.students.map((r) => (
                              <tr
                                key={r.studentId}
                                className="border-b border-[#1e1e2e] transition-colors hover:bg-[#1e1e2e]"
                              >
                                {/* Student + presence */}
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#313244] text-xs font-semibold text-[#cdd6f4]">
                                      {r.initials}
                                      <span
                                        title={r.online ? "Online" : `Last active ${ago(r.lastActiveAt)}`}
                                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#181825] ${
                                          r.online ? "bg-[#a6e3a1]" : "bg-[#45475a]"
                                        }`}
                                      />
                                    </span>
                                    <div className="leading-tight">
                                      <div className="font-medium text-[#cdd6f4]">{r.studentName}</div>
                                      <div className={`text-[10px] ${r.online ? "text-[#a6e3a1]" : "text-[#6c7086]"}`}>
                                        {r.online ? "● online" : `offline · ${ago(r.lastActiveAt)}`}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className={`px-5 py-3 ${statusColor(r.status)}`}>{statusLabel(r.status)}</td>

                                {/* Work line */}
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-20 rounded-full bg-[#313244]">
                                      <div
                                        className="h-1.5 rounded-full bg-[#cba6f7]"
                                        style={{
                                          width: r.totalSteps
                                            ? `${(r.currentStep / r.totalSteps) * 100}%`
                                            : "0%",
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-[#6c7086]">
                                      {r.currentStep}/{r.totalSteps}
                                    </span>
                                  </div>
                                </td>

                                {/* Time */}
                                <td className="px-5 py-3">
                                  <span className="flex items-center gap-1 font-mono text-xs text-[#a6adc8]">
                                    <Clock size={11} /> {formatTime(r.timeSeconds)}
                                  </span>
                                </td>

                                {/* Hints */}
                                <td className="px-5 py-3">
                                  <span className="flex items-center gap-1 font-mono text-xs text-[#f9e2af]">
                                    <Lightbulb size={11} /> {r.hintsUsed}
                                  </span>
                                </td>

                                {/* Quiz */}
                                <td className="px-5 py-3 text-xs">
                                  {r.quizScore !== null ? (
                                    <span
                                      className={`font-bold ${
                                        r.quizScore >= 80
                                          ? "text-[#a6e3a1]"
                                          : r.quizScore >= 50
                                          ? "text-[#f9e2af]"
                                          : "text-[#f38ba8]"
                                      }`}
                                    >
                                      {r.quizScore}%
                                    </span>
                                  ) : (
                                    <span className="text-[#45475a]">—</span>
                                  )}
                                </td>

                                {/* Points / grade */}
                                <td className="px-5 py-3">
                                  <span
                                    className={`rounded-lg px-2 py-1 text-xs font-bold ${gradeColor(
                                      r.evaluation.grade
                                    )}`}
                                  >
                                    {r.evaluation.points} · {r.evaluation.grade}
                                  </span>
                                </td>

                                {/* Detail */}
                                <td className="px-5 py-3 text-right">
                                  <button
                                    onClick={() => setSelected({ row: r, tpTitle: tg.tp.title })}
                                    className="rounded-lg border border-[#313244] px-2.5 py-1 text-xs text-[#a6adc8] transition-colors hover:border-[#cba6f7] hover:text-white"
                                  >
                                    View code
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
