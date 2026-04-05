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
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },
};
