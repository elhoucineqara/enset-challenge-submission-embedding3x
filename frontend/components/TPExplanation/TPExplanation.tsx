"use client";

import React, { useState } from "react";
import { TP } from "@/types";
import { tpService } from "@/services/tpService";

interface TPExplanationProps {
  tp: TP;
  stepIndex: number;
  onStart: () => void;
}

interface ChatMessage {
  role: "ai" | "student";
  text: string;
}

export default function TPExplanation({
  tp,
  stepIndex,
  onStart,
}: TPExplanationProps) {
  const explanation = tpService.generateExplanation(tp, stepIndex);
  const step = tp.steps[stepIndex];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: `Hi! I'm your AI tutor for this TP. I've read the instructions and I'm here to help you understand the concepts. Feel free to ask me questions — but remember, I won't give you the direct answer! 😊`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput("");

    const studentMsg: ChatMessage = { role: "student", text: question };
    setMessages((prev) => [...prev, studentMsg]);
    setLoading(true);

    setTimeout(() => {
      const answer = tpService.generateClarification(question, tp);
      setMessages((prev) => [...prev, { role: "ai", text: answer }]);
      setLoading(false);
    }, 800);
  };

  // Parse markdown-like explanation to JSX
  const renderExplanation = (text: string) =>
    text.split("\n").map((line, i) => {
      if (line.startsWith("# "))
        return (
          <h1 key={i} className="text-2xl font-bold text-white mt-0 mb-3">
            {line.slice(2)}
          </h1>
        );
      if (line.startsWith("## "))
        return (
          <h2 key={i} className="text-lg font-semibold text-[#89b4fa] mt-5 mb-2">
            {line.slice(3)}
          </h2>
        );
      if (line.startsWith("- ") || line.match(/^\d+\. /))
        return (
          <li key={i} className="text-[#cdd6f4] ml-5 list-disc">
            {line.replace(/^[-\d]+\.?\s/, "")}
          </li>
        );
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return (
        <p key={i} className="text-[#cdd6f4] text-sm leading-relaxed">
          {line}
        </p>
      );
    });

  return (
    <div className="flex h-full bg-[#1a1a2e]">
      {/* Left: Explanation */}
      <div className="flex-1 overflow-y-auto p-8 border-r border-[#313244]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#cba6f7] to-[#89b4fa] flex items-center justify-center text-[#1a1a2e] font-bold text-lg">
              AI
            </div>
            <div>
              <p className="text-xs text-[#6c7086] uppercase tracking-widest">
                AI Tutor
              </p>
              <p className="text-sm text-[#cdd6f4] font-medium">
                Explaining step {stepIndex + 1} of {tp.steps.length}
              </p>
            </div>
          </div>

          <div className="prose prose-invert">
            {renderExplanation(explanation)}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-[#313244] border border-[#45475a]">
            <p className="text-xs text-[#6c7086] uppercase tracking-wider mb-2">
              🎯 Required elements
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
            className="mt-8 w-full py-4 rounded-xl bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] font-bold text-lg hover:opacity-90 transition-opacity"
          >
            🚀 Start Coding
          </button>
        </div>
      </div>

      {/* Right: AI Chat */}
      <div className="w-96 flex flex-col bg-[#181825]">
        <div className="p-4 border-b border-[#313244]">
          <h3 className="text-sm font-semibold text-white">💬 Ask the AI</h3>
          <p className="text-xs text-[#6c7086] mt-0.5">
            I clarify concepts but won&apos;t give direct answers.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === "student" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                  msg.role === "ai"
                    ? "bg-gradient-to-br from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e]"
                    : "bg-[#45475a] text-[#cdd6f4]"
                }`}
              >
                {msg.role === "ai" ? "AI" : "Me"}
              </div>
              <div
                className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "ai"
                    ? "bg-[#313244] text-[#cdd6f4]"
                    : "bg-[#cba6f7] text-[#1a1a2e]"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 items-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#cba6f7] to-[#89b4fa] flex items-center justify-center text-xs font-bold text-[#1a1a2e]">
                AI
              </div>
              <div className="px-3 py-2 rounded-xl bg-[#313244] text-[#6c7086] text-sm">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#313244] flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Ask a question..."
            className="flex-1 bg-[#313244] rounded-lg px-3 py-2 text-sm text-[#cdd6f4] placeholder:text-[#6c7086] outline-none focus:ring-1 focus:ring-[#cba6f7]"
          />
          <button
            onClick={handleAsk}
            className="px-3 py-2 rounded-lg bg-[#cba6f7] text-[#1a1a2e] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
