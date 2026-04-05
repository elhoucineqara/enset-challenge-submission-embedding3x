import { User } from "@/types";
import { mockUsers } from "@/data/mockUsers";

const SESSION_KEY = "agentic_tp_session";

export const authService = {
  login(email: string, password: string): User | null {
    const user = mockUsers.find(
      (u) => u.email === email && u.password === password
    );
    if (user) {
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      }
    }
    return user ?? null;
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const stored = JSON.parse(raw) as User;

      // If IDs changed (e.g., legacy "student-1" -> UUID), repair session using email.
      const stillExists = mockUsers.some((u) => u.id === stored.id);
      if (stillExists) return stored;

      const updated = mockUsers.find((u) => u.email === stored.email) ?? null;
      if (updated) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      }
      return updated;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },
};
