"use client";

import React, { useState } from "react";
import { TPStep, HintHistoryEntry } from "@/types";
import { agentService, HintResponse } from "@/services/agentService";

interface HintBoxProps {
  step: TPStep;
  studentCode: string;
  hintsUsed: number;
  initialHints?: HintHistoryEntry[];
  onHintUsed: (entry: HintHistoryEntry) => void;
  sessionId?: string;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Abstract hint",
  2: "Conceptual hint",
  3: "Structural hint",
  4: "Specific hint",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "text-[#89b4fa]",
  2: "text-[#cba6f7]",
  3: "text-[#f9e2af]",
  4: "text-[#f38ba8]",
};

export default function HintBox({
  step,
  studentCode,
  hintsUsed,
  initialHints = [],
  onHintUsed,
  sessionId,
}: HintBoxProps) {
  const [hints, setHints] = useState<HintHistoryEntry[]>(initialHints);
  const [isLoading, setIsLoading] = useState(false);
  const [validationPassed, setValidationPassed] = useState(false);
  const [missingTags, setMissingTags] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);

  const requiredTags = step.requiredTags ?? [];
  const maxHints = 5;
  const canRequestHint = hintsUsed < maxHints && !validationPassed;

  async function requestHint() {
    if (isLoading || !canRequestHint) return;
    setIsLoading(true);

    try {
      let response: HintResponse;

      const available = await agentService.isAvailable();
      if (available) {
        try {
          response = await agentService.getHint({
            step_id: step.id,
            step_title: step.title,
            step_instructions: step.instructions,
            student_code: studentCode,
            required_tags: requiredTags,
            hints_already_given: hintsUsed,
            previous_hints: hints.map((h) => h.text),
            session_id: sessionId,
          });
        } catch {
          response = buildFallbackHint(step, studentCode, hintsUsed);
        }
      } else {
        response = buildFallbackHint(step, studentCode, hintsUsed);
      }

      const newHint: HintHistoryEntry = {
        level: response.hint_level,
        text: response.hint,
        missingTags: response.missing_tags,
        timestamp: new Date().toLocaleTimeString(),
      };

      setHints((prev) => [...prev, newHint]);
      setValidationPassed(response.validation_passed);
      setMissingTags(response.missing_tags);
      onHintUsed(newHint);
    } catch {
      const fallback = buildFallbackHint(step, studentCode, hintsUsed);
      const newHint: HintHistoryEntry = {
        level: fallback.hint_level,
        text: fallback.hint,
        missingTags: fallback.missing_tags,
        timestamp: new Date().toLocaleTimeString(),
      };
      setHints((prev) => [...prev, newHint]);
      setMissingTags(fallback.missing_tags);
      onHintUsed(newHint);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-[#181825] border border-[#313244] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-[#1e1e2e] transition-colors"
      >
        <span className="text-lg">💡</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">Hint System</p>
          <p className="text-xs text-[#6c7086]">
            {validationPassed
              ? "All required elements present!"
              : `${hintsUsed}/${maxHints} hints used`}
          </p>
        </div>

        {/* Tags status */}
        <div className="hidden sm:flex items-center gap-1">
          {requiredTags.map((tag) => {
            const missing = missingTags.includes(tag);
            return (
              <span
                key={tag}
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  missing || hints.length === 0
                    ? "bg-[#313244] text-[#6c7086]"
                    : "bg-[#a6e3a1]/15 text-[#a6e3a1]"
                }`}
              >
                {`<${tag}>`}
              </span>
            );
          })}
        </div>

        <span className="text-[#6c7086] text-xs ml-2">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[#313244]">
          {/* Validation passed banner */}
          {validationPassed && (
            <div className="px-4 py-3 bg-[#a6e3a1]/10 border-b border-[#a6e3a1]/20">
              <p className="text-sm text-[#a6e3a1] font-medium">
                All required HTML elements detected in your code!
              </p>
            </div>
          )}

          {/* Hint history */}
          {hints.length > 0 && (
            <div className="px-4 py-3 space-y-3 max-h-60 overflow-y-auto">
              {hints.map((hint, i) => (
                <div
                  key={i}
                  className="bg-[#1e1e2e] rounded-xl p-3 border border-[#313244]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-medium ${LEVEL_COLORS[hint.level] ?? "text-[#cdd6f4]"}`}
                    >
                      {LEVEL_LABELS[hint.level] ?? `Hint ${i + 1}`}
                    </span>
                    <span className="text-xs text-[#6c7086]">{hint.timestamp}</span>
                  </div>
                  <p className="text-sm text-[#cdd6f4] leading-relaxed whitespace-pre-wrap">
                    {hint.text}
                  </p>
                  {hint.missingTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-[#6c7086]">Still missing:</span>
                      {hint.missingTags.map((t) => (
                        <span
                          key={t}
                          className="text-xs font-mono bg-[#f38ba8]/10 text-[#f38ba8] px-2 py-0.5 rounded-full"
                        >
                          {`<${t}>`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Request hint button */}
          <div className="px-4 py-3">
            {canRequestHint ? (
              <button
                onClick={requestHint}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl border border-[#f9e2af]/30 text-[#f9e2af] text-sm font-medium hover:bg-[#f9e2af]/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-3 h-3 border border-[#f9e2af] border-t-transparent rounded-full animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    💡 Get hint {hints.length > 0 ? `(${maxHints - hintsUsed} left)` : ""}
                  </>
                )}
              </button>
            ) : validationPassed ? (
              <p className="text-center text-xs text-[#a6e3a1]">
                Great job! Your code has all required elements.
              </p>
            ) : (
              <p className="text-center text-xs text-[#6c7086]">
                Maximum hints reached. Try reviewing the hints above and your code carefully.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fallback when agent is unavailable ───────────────────────────────────────

function buildFallbackHint(
  step: TPStep,
  studentCode: string,
  hintsUsed: number
): HintResponse {
  const code = studentCode.toLowerCase();
  const missing = (step.requiredTags ?? []).filter(
    (tag) => !code.includes(`<${tag}`)
  );

  const level = Math.min(4, hintsUsed + 1);
  let hint: string;

  if (missing.length === 0) {
    hint = "It looks like you might have all the required elements! Check your code and try submitting.";
  } else if (level === 1) {
    hint = `Think about the purpose of this step: "${step.title}". What kind of HTML elements would achieve that goal? Think about what you'd see on a real webpage.`;
  } else if (level === 2) {
    hint = `HTML has specific elements for different types of content. For this step, you need ${missing.length} more element(s). Think about semantic HTML — what element best describes the content you're adding?`;
  } else if (level === 3) {
    hint = `You're missing ${missing.length} element(s). One of them is a very common HTML element used for "${step.title.toLowerCase()}". What letters might it start with?`;
  } else {
    hint = `Check if you have these types of elements in your code: ${missing.map((t) => `a "${t[0]}" element`).join(", ")}. Make sure they're properly opened and closed.`;
  }

  return {
    hint,
    hint_level: level,
    validation_passed: missing.length === 0,
    missing_tags: missing,
    agent: "fallback",
    model: "local",
  };
}
