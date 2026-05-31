"use client";

import React, { useState, useEffect } from "react";
import { TP } from "@/types";
import { agentService, QuizQuestion, EvaluateAnswersResponse } from "@/services/agentService";

interface QuizComponentProps {
  tp: TP;
  studentCode: string;
  onComplete: (score: number, feedback: string) => void;
}

type Phase = "loading" | "ready" | "answering" | "submitting" | "results";

export default function QuizComponent({ tp, studentCode, onComplete }: QuizComponentProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [results, setResults] = useState<EvaluateAnswersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    generateQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateQuiz() {
    setPhase("loading");
    setError(null);

    try {
      const available = await agentService.isAvailable();

      if (available) {
        const resp = await agentService.generateQuiz({
          tp_id: tp.id,
          tp_title: tp.title,
          tp_description: tp.description,
          step_titles: tp.steps.map((s) => s.title),
          student_code: studentCode,
          num_questions: 4,
        });
        setQuestions(resp.questions);
      } else {
        // Fallback: convert static quiz questions from step data
        setQuestions(buildStaticQuestions(tp));
      }

      setAnswers(new Array(questions.length).fill(-1));
      setPhase("answering");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate quiz. Using static questions."
      );
      setQuestions(buildStaticQuestions(tp));
      setAnswers(new Array(questions.length).fill(-1));
      setPhase("answering");
    }
  }

  function handleAnswer(questionIdx: number, optionIdx: number) {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[questionIdx] = optionIdx;
      return updated;
    });
  }

  async function handleSubmit() {
    if (answers.some((a) => a === -1)) return;
    setPhase("submitting");

    try {
      const available = await agentService.isAvailable();
      let evalResult: EvaluateAnswersResponse;

      if (available) {
        evalResult = await agentService.evaluate({
          tp_id: tp.id,
          tp_title: tp.title,
          questions,
          student_answers: answers,
          student_code: studentCode,
        });
      } else {
        evalResult = computeLocalScore(questions, answers, tp.title);
      }

      setResults(evalResult);
      setPhase("results");
      onComplete(evalResult.score, evalResult.feedback);
    } catch {
      const evalResult = computeLocalScore(questions, answers, tp.title);
      setResults(evalResult);
      setPhase("results");
      onComplete(evalResult.score, evalResult.feedback);
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-10 h-10 border-2 border-[#cba6f7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#6c7086] text-sm">
          AI is generating your personalized quiz based on your code...
        </p>
      </div>
    );
  }

  // ─── Results ──────────────────────────────────────────────────────────────
  if (phase === "results" && results) {
    const gradeColor =
      results.score >= 80
        ? "text-[#a6e3a1]"
        : results.score >= 60
        ? "text-[#f9e2af]"
        : "text-[#f38ba8]";

    return (
      <div className="space-y-6 px-6 py-6 max-w-2xl mx-auto">
        {/* Score card */}
        <div className="bg-[#181825] border border-[#313244] rounded-2xl p-6 text-center">
          <p className="text-[#6c7086] text-sm mb-2">Your Score</p>
          <p className={`text-6xl font-bold ${gradeColor}`}>{results.score}%</p>
          <p className={`text-lg font-medium mt-1 ${gradeColor}`}>{results.grade}</p>
          <p className="text-[#6c7086] text-sm mt-3">
            {results.correct} / {results.total} correct
          </p>
        </div>

        {/* AI feedback */}
        {results.feedback && (
          <div className="bg-[#1e1e2e] border border-[#313244] rounded-2xl p-5">
            <p className="text-xs font-medium text-[#89b4fa] mb-2">AI Feedback</p>
            <p className="text-sm text-[#cdd6f4] leading-relaxed whitespace-pre-wrap">
              {results.feedback}
            </p>
          </div>
        )}

        {/* Breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#cdd6f4]">Answer Breakdown</p>
          {results.breakdown.map((item) => (
            <div
              key={item.question_num}
              className={`rounded-xl border p-4 ${
                item.is_correct
                  ? "border-[#a6e3a1]/30 bg-[#a6e3a1]/5"
                  : "border-[#f38ba8]/30 bg-[#f38ba8]/5"
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-sm shrink-0">
                  {item.is_correct ? "✓" : "✗"}
                </span>
                <p className="text-sm font-medium text-[#cdd6f4]">{item.question}</p>
              </div>
              {!item.is_correct && (
                <div className="ml-5 space-y-1">
                  <p className="text-xs text-[#f38ba8]">
                    Your answer: {item.student_answer}
                  </p>
                  <p className="text-xs text-[#a6e3a1]">
                    Correct: {item.correct_answer}
                  </p>
                </div>
              )}
              {item.explanation && (
                <p className="ml-5 mt-2 text-xs text-[#6c7086] italic">
                  {item.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Answering ────────────────────────────────────────────────────────────
  const currentQuestion = questions[currentQ];
  const answeredCount = answers.filter((a) => a !== -1).length;

  if (!currentQuestion) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6c7086]">
          Question {currentQ + 1} of {questions.length}
        </p>
        <p className="text-sm text-[#6c7086]">
          {answeredCount} answered
        </p>
      </div>

      {/* Question nav dots */}
      <div className="flex gap-2">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={`h-2 rounded-full transition-all ${
              i === currentQ
                ? "w-8 bg-[#cba6f7]"
                : answers[i] !== -1
                ? "w-4 bg-[#a6e3a1]"
                : "w-4 bg-[#313244]"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="bg-[#181825] border border-[#313244] rounded-2xl p-6">
        <p className="text-base font-medium text-[#cdd6f4] leading-relaxed">
          {currentQuestion.question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {currentQuestion.options.map((opt, i) => {
          const selected = answers[currentQ] === i;
          return (
            <button
              key={i}
              onClick={() => {
                handleAnswer(currentQ, i);
                if (currentQ < questions.length - 1)
                  setTimeout(() => setCurrentQ((q) => q + 1), 300);
              }}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all text-sm ${
                selected
                  ? "border-[#cba6f7] bg-[#cba6f7]/10 text-[#cba6f7]"
                  : "border-[#313244] bg-[#181825] text-[#cdd6f4] hover:border-[#45475a] hover:bg-[#1e1e2e]"
              }`}
            >
              <span className="font-medium mr-3">
                {["A", "B", "C", "D"][i]}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Submit */}
      {answeredCount === questions.length && (
        <button
          onClick={handleSubmit}
          disabled={phase === "submitting"}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] font-bold disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {phase === "submitting" ? (
            <>
              <span className="w-4 h-4 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
              AI is evaluating your answers...
            </>
          ) : (
            "Submit Quiz"
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-[#f38ba8] text-center">{error}</p>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStaticQuestions(tp: TP): QuizQuestion[] {
  const allQuiz = tp.steps.flatMap((s) =>
    s.quiz.map((q) => ({
      question: q.question,
      options: q.options.map((o) => o.text),
      correctIndex: q.options.findIndex((o) => o.id === q.correctId),
      explanation: q.explanation,
    }))
  );
  return allQuiz.slice(0, 4);
}

function computeLocalScore(
  questions: QuizQuestion[],
  answers: number[],
  tpTitle: string
): EvaluateAnswersResponse {
  let correct = 0;
  const breakdown = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctIndex;
    if (isCorrect) correct++;
    return {
      question_num: i + 1,
      question: q.question,
      student_answer: q.options[answers[i]] ?? "No answer",
      correct_answer: q.options[q.correctIndex],
      is_correct: isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  const grade =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Review";

  return {
    score,
    correct,
    total: questions.length,
    grade,
    feedback:
      score >= 80
        ? `Excellent work on '${tpTitle}'! You've demonstrated strong understanding.`
        : score >= 60
        ? `Good progress on '${tpTitle}'! A few areas to review above.`
        : `Keep studying the concepts in '${tpTitle}'. Review the incorrect answers above.`,
    breakdown,
    agent: "local",
    model: "static",
  };
}
