import { User, UserRole } from "@/types";

const SESSION_KEY = "agentic_tp_session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

interface BackendUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string; // "TEACHER" | "STUDENT"
  avatarInitials: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: BackendUser;
}

export interface Session extends User {
  username: string;
  token: string;
  refreshToken: string;
}

function normalizeRole(role: string): UserRole {
  return role.toUpperCase() === "TEACHER" ? "teacher" : "student";
}

function toSession(res: AuthResponse): Session {
  return {
    id: res.user.id,
    name: res.user.name.trim(),
    username: res.user.username,
    email: res.user.email,
    role: normalizeRole(res.user.role),
    avatarInitials: res.user.avatarInitials,
    token: res.token,
    refreshToken: res.refreshToken,
  };
}

function persist(session: Session) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export const authService = {
  /**
   * Authenticate against the real auth-service (through the API gateway).
   * Stores the JWT + user in localStorage and returns the user, or null on failure.
   */
  async login(email: string, password: string): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as AuthResponse;
      const session = toSession(data);
      persist(session);
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Register a new account, then return the authenticated user (auto-login).
   * On a validation failure returns the backend error message (string).
   */
  async register(input: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User | string | null> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          username: input.username,
          email: input.email,
          password: input.password,
          role: input.role.toUpperCase(),
        }),
      });
      if (!res.ok) {
        // Surface the backend's validation message when available.
        const data = await res.json().catch(() => null);
        return (data && (data.error as string)) || null;
      }
      const data = (await res.json()) as AuthResponse;
      const session = toSession(data);
      persist(session);
      return session;
    } catch {
      return null;
    }
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  getSession(): Session | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  },

  getCurrentUser(): User | null {
    return this.getSession();
  },

  getToken(): string | null {
    return this.getSession()?.token ?? null;
  },

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  },
};
