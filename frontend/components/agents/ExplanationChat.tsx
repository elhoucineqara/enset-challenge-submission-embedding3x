"use client";

import React, { useState, useRef, useEffect } from "react";
import { TP, TPStep } from "@/types";
import { agentService, ExplainResponse } from "@/services/agentService";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

interface ExplanationChatProps {
  tp: TP;
  step: TPStep;
  sessionId?: string;
}

export default function ExplanationChat({ tp, step, sessionId }: ExplanationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentAvailable, setAgentAvailable] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check agent availability once on mount
  useEffect(() => {
    agentService.isAvailable().then(setAgentAvailable);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load initial explanation when step changes
  useEffect(() => {
    if (agentAvailable !== true) return;
    loadInitialExplanation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, agentAvailable]);

  async function loadInitialExplanation() {
    const loadingId = Date.now().toString();
    setMessages([
      {
        id: loadingId,
        role: "assistant",
        content: "",
        loading: true,
      },
    ]);

    try {
      const response = await agentService.explain({
        tp_id: tp.id,
        tp_title: tp.title,
        tp_description: tp.description,
        step_id: step.id,
        step_title: step.title,
        step_instructions: step.instructions,
        required_tags: step.requiredTags,
        session_id: sessionId,
      });

      setMessages([
        {
          id: loadingId,
          role: "assistant",
          content: response.explanation,
          loading: false,
        },
      ]);
    } catch (err) {
      setMessages([
        {
          id: loadingId,
          role: "assistant",
          content: buildFallbackExplanation(step),
          loading: false,
        },
      ]);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const botMsgId = `bot-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: question },
      { id: botMsgId, role: "assistant", content: "", loading: true },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      let response: ExplainResponse;

      if (agentAvailable) {
        response = await agentService.explain({
          tp_id: tp.id,
          tp_title: tp.title,
          tp_description: tp.description,
          step_id: step.id,
          step_title: step.title,
          step_instructions: step.instructions,
          required_tags: step.requiredTags,
          question,
          session_id: sessionId,
        });
      } else {
        response = {
          explanation: buildFallbackAnswer(question, step),
          type: "clarification",
          agent: "fallback",
          model: "local",
        };
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, content: response.explanation, loading: false }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                content:
                  "I'm having trouble connecting right now. Please check that the AI agents are running and try again.",
                loading: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#181825] rounded-xl border border-[#313244]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#313244] flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <div>
          <p className="text-sm font-medium text-white">Explanation Agent</p>
          <p className="text-xs text-[#6c7086]">
            {agentAvailable === true
              ? "Mistral — online"
              : agentAvailable === false
              ? "Offline — using fallback"
              : "Connecting..."}
          </p>
        </div>
        <div
          className={`ml-auto w-2 h-2 rounded-full ${
            agentAvailable === true
              ? "bg-[#a6e3a1]"
              : agentAvailable === false
              ? "bg-[#f38ba8]"
              : "bg-[#f9e2af] animate-pulse"
          }`}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-[#6c7086] text-sm py-8">
            <p>Loading explanation...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                msg.role === "user"
                  ? "bg-[#cba6f7]/20 text-[#cba6f7]"
                  : "bg-[#89b4fa]/20 text-[#89b4fa]"
              }`}
            >
              {msg.role === "user" ? "You" : "AI"}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#cba6f7]/15 text-[#cdd6f4] rounded-tr-sm"
                  : "bg-[#1e1e2e] text-[#cdd6f4] border border-[#313244] rounded-tl-sm"
              }`}
            >
              {msg.loading ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#89b4fa] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-[#89b4fa] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-[#89b4fa] rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[#313244] flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this step..."
          disabled={isLoading}
          className="flex-1 bg-[#1e1e2e] border border-[#313244] rounded-xl px-4 py-2 text-sm text-[#cdd6f4] placeholder-[#6c7086] outline-none focus:border-[#89b4fa] transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 bg-[#89b4fa] text-[#1a1a2e] rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#89b4fa]/90 transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// ─── Fallback content when agent is unavailable ────────────────────────────────

function buildFallbackExplanation(step: TPStep): string {
  const tags = step.requiredTags.map((t) => `<${t}>`).join(", ");
  return (
    `In this step: "${step.title}", you'll practice using ${tags} elements.\n\n` +
    `${step.instructions}\n\n` +
    `Think about what each of these HTML elements is used for in real websites. ` +
    `What content do they describe? What role do they play in a page's structure?\n\n` +
    `Feel free to ask me any questions about the concepts involved!`
  );
}

function buildFallbackAnswer(question: string, step: TPStep): string {
  const tags = step.requiredTags.join(", ");
  if (question.toLowerCase().includes("code") || question.toLowerCase().includes("solution")) {
    return (
      `I'm here to guide you, not give you the answer! Try thinking about it this way: ` +
      `the goal of this step is to understand ${tags}. What do you think these elements are used for in HTML? ` +
      `What would you expect to see on a webpage that uses them?`
    );
  }
  return (
    `That's a great question! In the context of this step, think about how ${tags} ` +
    `elements are used to structure web content. The key is to understand the semantic purpose ` +
    `of each element — not just what it looks like, but what it means to the browser and to users. ` +
    `Does that help clarify things?`
  );
}
