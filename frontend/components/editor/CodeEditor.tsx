"use client";

import React, { useRef, useEffect } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CodeEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "<!-- Write your HTML here -->",
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="relative h-full flex flex-col bg-[#1e1e2e] rounded-lg overflow-hidden border border-[#313244]">
      {/* Editor header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#181825] border-b border-[#313244]">
        <span className="w-3 h-3 rounded-full bg-[#f38ba8]" />
        <span className="w-3 h-3 rounded-full bg-[#fab387]" />
        <span className="w-3 h-3 rounded-full bg-[#a6e3a1]" />
        <span className="ml-3 text-xs text-[#6c7086] font-mono">
          index.html
        </span>
        {disabled && (
          <span className="ml-auto text-xs text-[#f38ba8] font-mono">
            READ ONLY
          </span>
        )}
      </div>

      {/* Line numbers + editor */}
      <div className="flex flex-1 overflow-auto">
        {/* Line numbers */}
        <div className="select-none px-3 py-4 text-right text-[#45475a] font-mono text-sm leading-6 bg-[#1e1e2e] min-w-[3rem]">
          {value.split("\n").map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          // ── Anti-cheat: block paste ──────────────────────────────────────
          onPaste={(e) => e.preventDefault()}
          // ── Anti-cheat: block drag & drop ────────────────────────────────
          onDrop={(e) => e.preventDefault()}
          // ── Anti-cheat: right-click context menu ────────────────────────
          onContextMenu={(e) => e.preventDefault()}
          className={`
            flex-1 resize-none bg-transparent text-[#cdd6f4] font-mono text-sm
            leading-6 py-4 pr-4 outline-none caret-[#cba6f7]
            placeholder:text-[#45475a]
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}
          `}
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Anti-cheat notice */}
      <div className="px-4 py-1.5 bg-[#181825] border-t border-[#313244] flex items-center gap-2">
        <span className="text-[10px] text-[#f38ba8] font-mono tracking-wide">
          ⚠ PASTE DISABLED — Type your code manually
        </span>
      </div>
    </div>
  );
}
