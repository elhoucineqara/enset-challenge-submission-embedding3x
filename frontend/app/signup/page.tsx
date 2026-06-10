"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

export default function SignUpPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { ok, error: err } = await register({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      password,
      role,
    });
    if (!ok) {
      setError(err ?? "Could not create your account.");
      setLoading(false);
    }
  };

  const roleButton = (value: UserRole, label: string, emoji: string) => {
    const active = role === value;
    return (
      <button
        type="button"
        onClick={() => setRole(value)}
        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
          active
            ? "border-[#cba6f7] bg-[#cba6f7]/10 text-white"
            : "border-[#313244] bg-[#1e1e2e] text-[#a6adc8] hover:border-[#45475a]"
        }`}
      >
        <span className="mr-1.5">{emoji}</span>
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#cba6f7] to-[#89b4fa] mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Agentic TP</h1>
          <p className="text-[#6c7086] mt-1">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-[#181825] rounded-2xl border border-[#313244] p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign up</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#a6adc8] mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#1e1e2e] border border-[#313244] rounded-xl px-4 py-3 text-white placeholder:text-[#45475a] outline-none focus:border-[#cba6f7] focus:ring-1 focus:ring-[#cba6f7] transition-colors"
                placeholder="Ada Lovelace"
              />
            </div>

            <div>
              <label className="block text-sm text-[#a6adc8] mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="w-full bg-[#1e1e2e] border border-[#313244] rounded-xl px-4 py-3 text-white placeholder:text-[#45475a] outline-none focus:border-[#cba6f7] focus:ring-1 focus:ring-[#cba6f7] transition-colors"
                placeholder="ada"
              />
            </div>

            <div>
              <label className="block text-sm text-[#a6adc8] mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#1e1e2e] border border-[#313244] rounded-xl px-4 py-3 text-white placeholder:text-[#45475a] outline-none focus:border-[#cba6f7] focus:ring-1 focus:ring-[#cba6f7] transition-colors"
                placeholder="you@school.fr"
              />
            </div>

            <div>
              <label className="block text-sm text-[#a6adc8] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#1e1e2e] border border-[#313244] rounded-xl px-4 py-3 text-white placeholder:text-[#45475a] outline-none focus:border-[#cba6f7] focus:ring-1 focus:ring-[#cba6f7] transition-colors"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm text-[#a6adc8] mb-1.5">I am a…</label>
              <div className="flex gap-3">
                {roleButton("student", "Student", "🧑‍💻")}
                {roleButton("teacher", "Teacher", "🧑‍🏫")}
              </div>
            </div>

            {error && (
              <p className="text-sm text-[#f38ba8] bg-[#f38ba8]/10 border border-[#f38ba8]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6c7086] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#cba6f7] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
