"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User, UserRole } from "@/types";
import { authService } from "@/services/authService";

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const loggedIn = await authService.login(email, password);
      if (loggedIn) {
        setUser(loggedIn);
        if (loggedIn.role === "teacher") {
          router.push("/teacher/dashboard");
        } else {
          router.push("/student/dashboard");
        }
        return true;
      }
      return false;
    },
    [router]
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<{ ok: boolean; error?: string }> => {
      const result = await authService.register(input);
      if (typeof result === "string") {
        return { ok: false, error: result };
      }
      if (result) {
        setUser(result);
        router.push(result.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
        return { ok: true };
      }
      return { ok: false, error: "Registration failed. Please try again." };
    },
    [router]
  );

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isTeacher: user?.role === "teacher",
        isStudent: user?.role === "student",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
