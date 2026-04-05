"use client";

import React, { useState } from "react";
import { QuizQuestion } from "@/types";

interface QuizProps {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, string>, score: number) => void;
}

export default function Quiz({ questions, onSubmit }: QuizProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSelect = (questionId: string, optionId: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    const correct = questions.filter(
      (q) => answers[q.id] === q.correctId
    ).length;
    const pct = Math.round((correct / questions.length) * 100);

    setScore(pct);
    setSubmitted(true);
    onSubmit(answers, pct);
  };

  const getOptionStyle = (q: QuizQuestion, optId: string) => {
    const base =
      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ";
    if (!submitted) {
      return (
        base +
        (answers[q.id] === optId
          ? "border-[#cba6f7] bg-[#cba6f7]/10 text-white"
          : "border-[#313244] bg-[#181825] text-[#a6adc8] hover:border-[#45475a]")
      );
    }
    if (optId === q.correctId) return base + "border-[#a6e3a1] bg-[#a6e3a1]/10 text-[#a6e3a1]";
    if (answers[q.id] === optId) return base + "border-[#f38ba8] bg-[#f38ba8]/10 text-[#f38ba8]";
    return base + "border-[#313244] bg-[#181825] text-[#45475a]";
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f9e2af] to-[#fab387] mb-4">
          <span className="text-2xl">📝</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Final Quiz</h2>
        <p className="text-[#6c7086]">
          {questions.length} questions — test your understanding
        </p>
      </div>

      {/* Score banner */}
      {submitted && score !== null && (
        <div
          className={`mb-8 p-4 rounded-2xl border text-center ${
            score >= 80
              ? "border-[#a6e3a1] bg-[#a6e3a1]/10"
              : score >= 50
              ? "border-[#f9e2af] bg-[#f9e2af]/10"
              : "border-[#f38ba8] bg-[#f38ba8]/10"
          }`}
        >
          <p className="text-4xl font-bold text-white mb-1">{score}%</p>
          <p
            className={`text-sm font-medium ${
              score >= 80
                ? "text-[#a6e3a1]"
                : score >= 50
                ? "text-[#f9e2af]"
                : "text-[#f38ba8]"
            }`}
          >
            {score >= 80
              ? "🎉 Excellent work!"
              : score >= 50
              ? "👍 Good effort — review the explanations below."
              : "📚 Keep studying — check the explanations carefully."}
          </p>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((q, qIdx) => (
          <div key={q.id} className="bg-[#181825] rounded-2xl p-6 border border-[#313244]">
            <p className="text-sm text-[#6c7086] mb-3 font-mono">
              Question {qIdx + 1} / {questions.length}
            </p>
            <p className="text-base font-semibold text-white mb-5">
              {q.question}
            </p>

            <div className="space-y-2">
              {q.options.map((opt) => (
                <div
                  key={opt.id}
                  className={getOptionStyle(q, opt.id)}
                  onClick={() => handleSelect(q.id, opt.id)}
                >
                  <span
                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 uppercase ${
                      answers[q.id] === opt.id && !submitted
                        ? "border-[#cba6f7] bg-[#cba6f7] text-[#1a1a2e]"
                        : "border-current"
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="text-sm">{opt.text}</span>
                </div>
              ))}
            </div>

            {/* Explanation after submit */}
            {submitted && (
              <div className="mt-4 p-3 rounded-xl bg-[#1e1e2e] border border-[#45475a]">
                <p className="text-xs text-[#6c7086] uppercase tracking-wider mb-1">
                  💡 Explanation
                </p>
                <p className="text-sm text-[#a6adc8]">{q.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-[#f9e2af] to-[#fab387] text-[#1a1a2e] font-bold text-lg hover:opacity-90 transition-opacity"
        >
          Submit Quiz
        </button>
      )}

      {submitted && (
        <div className="mt-8 text-center text-sm text-[#6c7086]">
          Quiz complete ✓ — Your score has been saved.
        </div>
      )}
    </div>
  );
}
