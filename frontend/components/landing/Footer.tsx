import Link from "next/link";
import { Bot } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#16213e] text-white/70 py-12 px-6 border-t border-[#0f3460]/40">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#cba6f7]" />
          <span className="text-lg font-bold text-white">AgenticTP</span>
        </Link>
        <div className="flex gap-8 text-sm">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Docs
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>
        <p className="text-sm">© 2026 AgenticTP. All rights reserved.</p>
      </div>
    </footer>
  );
}
