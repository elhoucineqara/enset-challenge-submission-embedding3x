"use client";

import React from "react";
import { TP } from "@/types";
import ExplanationChat from "@/components/agents/ExplanationChat";

interface TPExplanationProps {
  tp: TP;
  stepIndex: number;
  onStart: () => void;
}

export default function TPExplanation({ tp, stepIndex, onStart }: TPExplanationProps) {
  const step = tp.steps[stepIndex];

  return (
    <div className="flex h-full bg-[#1a1a2e]">
      {/* Left: Step overview */}
      <div className="flex-1 overflow-y-auto p-8 border-r border-[#313244]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#cba6f7] to-[#89b4fa] flex items-center justify-center text-[#1a1a2e] font-bold text-lg">
              AI
            </div>
            <div>
              <p className="text-xs text-[#6c7086] uppercase tracking-widest">
                Explanation Agent · Mistral
              </p>
              <p className="text-sm text-[#cdd6f4] font-medium">
                Step {stepIndex + 1} of {tp.steps.length}: {step.title}
              </p>
            </div>
          </div>

          {/* Step instructions */}
          <div className="bg-[#1e1e2e] border border-[#313244] rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">{step.title}</h2>
            <p className="text-[#cdd6f4] text-sm leading-relaxed">{step.instructions}</p>
          </div>

          {/* Required tags */}
          <div className="p-4 rounded-xl bg-[#313244] border border-[#45475a] mb-8">
            <p className="text-xs text-[#6c7086] uppercase tracking-wider mb-2">
              Required HTML elements
            </p>
            <div className="flex flex-wrap gap-2">
              {step.requiredTags.map((tag) => (
                <code
                  key={tag}
                  className="px-2 py-1 rounded bg-[#1e1e2e] text-[#cba6f7] text-sm font-mono border border-[#45475a]"
                >
                  &lt;{tag}&gt;
                </code>
              ))}
            </div>
          </div>

          <button
            onClick={onStart}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Start Coding
          </button>
        </div>
      </div>

      {/* Right: AI Explanation Chat (real agent) */}
      <div className="w-[420px] shrink-0 flex flex-col p-4">
        <ExplanationChat tp={tp} step={step} />
      </div>
    </div>
  );
}
