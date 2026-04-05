import Link from "next/link";
import { Bot } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a2e]/80 backdrop-blur-xl border-b border-[#0f3460]/40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#cba6f7]" />
          <span className="text-lg font-bold text-white">AgenticTP</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <a
            href="#features"
            className="hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-white transition-colors"
          >
            How It Works
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Docs
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Log In
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "hero", size: "sm" })}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
