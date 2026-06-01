"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import CodeEditor from "@/components/editor/CodeEditor";
import LivePreview from "@/components/Preview/LivePreview";
import HintBox from "@/components/agents/HintBox";
import { TPStep, ValidationResult, TPProgress, HintHistoryEntry } from "@/types";
import { createValidatorForStep } from "@/patterns/InterpreterPattern";
import { tpService } from "@/services/tpService";

interface IDELayoutProps {
  step: TPStep;
  stepIndex: number;
  totalSteps: number;
  progress: TPProgress;
  starterHTML: string;
  onStepComplete: (code: string, timeSeconds: number, hints: number) => void;
  onProgressUpdate: (updated: TPProgress) => void;
}

export default function IDELayout({
  step,
  stepIndex,
  totalSteps,
  progress,
  starterHTML,
  onStepComplete,
  onProgressUpdate,
}: IDELayoutProps) {
  const stepProgress = progress.steps[stepIndex];
  const [code, setCode] = useState(
    stepProgress?.code || starterHTML
  );
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [hintsUsed, setHintsUsed] = useState(stepProgress?.hintsUsed ?? 0);
  const [timeSeconds, setTimeSeconds] = useState(
    stepProgress?.timeSpentSeconds ?? 0
  );
  const [showHints, setShowHints] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const codeRef = useRef(code);
  codeRef.current = code;

  // ── Step timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeSeconds((prev) => {
        const next = prev + 1;
       
        if (next % 5 === 0) {
          const updated: TPProgress = {
            ...progress,
            lastActiveAt: new Date().toISOString(),
            steps: progress.steps.map((s, i) =>
              i === stepIndex
                ? { ...s, timeSpentSeconds: next, code: codeRef.current }
                : s
            ),
          };
          tpService.saveProgress(updated);
          onProgressUpdate(updated);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stepIndex]); // eslint-disable-line

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleHintUsed = useCallback((entry: HintHistoryEntry) => {
    const next = hintsUsed + 1;
    setHintsUsed(next);
    const updated: TPProgress = {
      ...progress,
      steps: progress.steps.map((s, i) =>
        i === stepIndex
          ? { ...s, hintsUsed: next, hintHistory: [...(s.hintHistory ?? []), entry] }
          : s
      ),
    };
    tpService.saveProgress(updated);
    onProgressUpdate(updated);
  }, [hintsUsed, progress, stepIndex, onProgressUpdate]);

  // ── Validate ────────────────────────────────────────────────────────────────
  const handleValidate = useCallback(() => {
    const validator = createValidatorForStep(step.requiredTags ?? []);
    const result = validator.validate(code);
    setValidation(result);
    if (!result.valid) setShowHints(true);
  }, [code, step.requiredTags]);

  // ── Submit step ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const validator = createValidatorForStep(step.requiredTags ?? []);
    const result = validator.validate(code);
    setValidation(result);

    if (result.valid) {
      if (timerRef.current) clearInterval(timerRef.current);
      onStepComplete(code, timeSeconds, hintsUsed);
    } else {
      setShowHints(true);
    }
  }, [code, step.requiredTags, timeSeconds, hintsUsed, onStepComplete]);

  return (
    <div className="flex flex-col min-h-full bg-[#1a1a2e]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-[#0f3460] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#a8b2d8] font-mono">
            Step {stepIndex + 1} / {totalSteps}
          </span>
          <span className="text-sm font-semibold text-white">{step.title}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-1.5 bg-[#0f3460] rounded px-3 py-1">
            <span className="text-[10px] text-[#a8b2d8]">⏱</span>
            <span className="text-sm font-mono text-[#e94560]">
              {formatTime(timeSeconds)}
            </span>
          </div>
          {/* Hints counter */}
          <div className="flex items-center gap-1.5 bg-[#0f3460] rounded px-3 py-1">
            <span className="text-[10px] text-[#a8b2d8]">💡</span>
            <span className="text-sm font-mono text-[#f5a623]">
              {hintsUsed} hints
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 py-3 bg-[#0f3460] border-b border-[#1a4a8a] shrink-0">
        <p className="text-sm text-[#a8b2d8]">
          <span className="text-white font-medium">📋 Task: </span>
          {step.instructions}
        </p>
        <p className="text-xs text-[#6c7086] mt-1">
          Required elements:{" "}
          {(step.requiredTags ?? []).map((t) => (
            <code
              key={t}
              className="mx-0.5 px-1 rounded bg-[#1a1a2e] text-[#cba6f7]"
            >
              &lt;{t}&gt;
            </code>
          ))}
        </p>
      </div>

      <div className="flex flex-1 min-h-[240px] overflow-hidden gap-0.5">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col overflow-hidden p-2">
          <CodeEditor value={code} onChange={setCode} />
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col overflow-hidden p-2">
          <LivePreview html={code} />
        </div>
      </div>

      {/* AI Hint Box */}
      <div className="mx-4 mb-2 shrink-0">
        <HintBox
          step={step}
          studentCode={code}
          hintsUsed={hintsUsed}
          initialHints={stepProgress?.hintHistory ?? []}
          onHintUsed={handleHintUsed}
        />
      </div>

      {/* Validation feedback */}
      {validation && !validation.valid && showHints && (
        <div className="mx-4 mb-3 p-3 bg-[#2d1b1b] border border-[#f38ba8] rounded-lg shrink-0">
          <p className="text-sm font-semibold text-[#f38ba8] mb-2">
            ❌ Validation failed
          </p>
          <ul className="space-y-1">
            {validation.hints.map((hint, i) => (
              <li key={i} className="text-sm text-[#fab387] flex gap-2">
                <span>💡</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation?.valid && (
        <div className="mx-4 mb-3 p-3 bg-[#1b2d1b] border border-[#a6e3a1] rounded-lg shrink-0">
          <p className="text-sm font-semibold text-[#a6e3a1]">
            ✅ Looks good! Click Submit to continue.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#16213e] border-t border-[#0f3460] shrink-0">
        <button
          onClick={handleValidate}
          className="px-4 py-2 rounded-lg bg-[#0f3460] text-[#a8b2d8] hover:bg-[#1a4a8a] text-sm font-medium transition-colors"
        >
          🔍 Run & Validate
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2 rounded-lg bg-[#e94560] text-white hover:bg-[#c73652] text-sm font-semibold transition-colors"
        >
          Submit Step →
        </button>
      </div>
    </div>
  );
}
