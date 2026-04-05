"use client";

import React from "react";

interface LivePreviewProps {
  html: string;
}

export default function LivePreview({ html }: LivePreviewProps) {
  return (
    <div className="relative h-full flex flex-col bg-white rounded-lg overflow-hidden border border-gray-200">
      {/* Preview header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="w-3 h-3 rounded-full bg-gray-300" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-white border border-gray-200 rounded px-3 py-0.5 text-xs text-gray-400 font-mono">
            preview · index.html
          </div>
        </div>
        <span className="text-[10px] text-emerald-500 font-mono font-medium">
          ● LIVE
        </span>
      </div>

      {/* iframe */}
      <iframe
        srcDoc={html || "<html><body></body></html>"}
        className="flex-1 w-full bg-white"
        sandbox="allow-scripts"
        title="Live Preview"
      />
    </div>
  );
}
