"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { tpService } from "@/services/tpService";
import { TP, Assignment } from "@/types";
import { getStudents } from "@/data/mockUsers";

export default function AssignTPPage() {
  const { user, isTeacher } = useAuth();
  const [tps, setTPs] = useState<TP[]>([]);
  const [selectedTP, setSelectedTP] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [saved, setSaved] = useState(false);
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);

  const students = getStudents();

  useEffect(() => {
    const allTPs = tpService.getAllTPs();
    setTPs(allTPs);
    setExistingAssignments(
      tpService.getAssignmentsForTeacher(user?.id ?? "")
    );
  }, [user?.id]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectAll = () =>
    setSelectedStudents(students.map((s) => s.id));

  const clearAll = () => setSelectedStudents([]);

  const handleAssign = () => {
    if (!selectedTP) { alert("Please select a TP."); return; }
    if (selectedStudents.length === 0) { alert("Please select at least one student."); return; }

    const assignment: Assignment = {
      id: `assign-${Date.now()}`,
      tpId: selectedTP,
      studentIds: selectedStudents,
      assignedBy: user!.id,
      assignedAt: new Date().toISOString(),
      ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
    };

    tpService.saveAssignment(assignment);
    setSaved(true);
    setExistingAssignments(tpService.getAssignmentsForTeacher(user?.id ?? ""));
    setSelectedTP("");
    setSelectedStudents([]);
    setDueDate("");
    setTimeout(() => setSaved(false), 3000);
  };

  const getTPTitle = (id: string) =>
    tps.find((t) => t.id === id)?.title ?? id;

  const getStudentNames = (ids: string[]) =>
    ids.map((id) => students.find((s) => s.id === id)?.name ?? id).join(", ");

  if (!isTeacher) return null;

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* Nav */}
      <nav className="bg-[#181825] border-b border-[#313244] px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/teacher/dashboard"
          className="text-[#6c7086] hover:text-white transition-colors text-sm"
        >
          ← Dashboard
        </Link>
        <span className="text-[#313244]">/</span>
        <span className="text-white text-sm font-medium">Assign TP</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Assign a TP</h1>
          <p className="text-[#6c7086] mt-1">
            Select a TP and the students who should complete it.
          </p>
        </div>

        {/* Assignment form */}
        <div className="bg-[#181825] rounded-2xl border border-[#313244] p-6 space-y-5">
          {/* TP selector */}
          <div>
            <label className="text-sm text-[#a6adc8] block mb-2">
              Select a TP
            </label>
            <div className="grid gap-2">
              {tps.map((tp) => (
                <button
                  key={tp.id}
                  onClick={() => setSelectedTP(tp.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                    selectedTP === tp.id
                      ? "border-[#cba6f7] bg-[#cba6f7]/10"
                      : "border-[#313244] bg-[#1e1e2e] hover:border-[#45475a]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{tp.title}</p>
                    <p className="text-xs text-[#6c7086] mt-0.5">
                      {tp.steps.length} steps · {tp.difficulty} ·{" "}
                      ~{tp.estimatedMinutes}min
                    </p>
                  </div>
                  {selectedTP === tp.id && (
                    <span className="text-[#cba6f7] text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Student selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-[#a6adc8]">
                Select students ({selectedStudents.length}/{students.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-[#89b4fa] hover:text-white transition-colors"
                >
                  All
                </button>
                <span className="text-[#45475a]">·</span>
                <button
                  onClick={clearAll}
                  className="text-xs text-[#6c7086] hover:text-white transition-colors"
                >
                  None
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedStudents.includes(s.id)
                      ? "border-[#89b4fa] bg-[#89b4fa]/10"
                      : "border-[#313244] bg-[#1e1e2e] hover:border-[#45475a]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      selectedStudents.includes(s.id)
                        ? "bg-[#89b4fa] text-[#1a1a2e]"
                        : "bg-[#313244] text-[#a6adc8]"
                    }`}
                  >
                    {s.avatarInitials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-[#6c7086]">{s.email}</p>
                  </div>
                  {selectedStudents.includes(s.id) && (
                    <span className="text-[#89b4fa]">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-sm text-[#a6adc8] block mb-2">
              Due Date (optional)
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#1e1e2e] rounded-xl px-4 py-2.5 text-[#a6adc8] text-sm outline-none border border-[#313244] focus:ring-1 focus:ring-[#cba6f7]"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleAssign}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              saved
                ? "bg-[#a6e3a1] text-[#1a1a2e]"
                : "bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] hover:opacity-90"
            }`}
          >
            {saved ? "✅ Assignment created!" : "Assign to Students"}
          </button>
        </div>

        {/* Existing assignments */}
        {existingAssignments.length > 0 && (
          <div className="bg-[#181825] rounded-2xl border border-[#313244] p-6">
            <h2 className="font-semibold text-white mb-4">
              📋 Current Assignments
            </h2>
            <div className="space-y-3">
              {existingAssignments.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl bg-[#1e1e2e] border border-[#313244]"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-white">
                      {getTPTitle(a.tpId)}
                    </p>
                    {a.dueDate && (
                      <span className="text-xs text-[#f9e2af]">
                        Due {new Date(a.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6c7086] mt-1">
                    👥 {getStudentNames(a.studentIds)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
