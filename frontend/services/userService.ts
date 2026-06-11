import { User, UserRole } from "@/types";
import { authService } from "./authService";

/**
 * User service — fetches the real user roster from the auth-service
 * (through the API gateway). Replaces the former mockUsers roster.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

interface BackendUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatarInitials: string;
}

function normalize(u: BackendUser): User {
  return {
    id: u.id,
    name: (u.name ?? "").trim() || u.username,
    email: u.email,
    role: (u.role?.toUpperCase() === "TEACHER" ? "teacher" : "student") as UserRole,
    avatarInitials: u.avatarInitials,
  };
}

async function fetchUsers(role?: UserRole): Promise<User[]> {
  const token = authService.getToken();
  const qs = role ? `?role=${role}` : "";
  try {
    const res = await fetch(`${API_BASE}/api/auth/users${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    const data = (await res.json()) as BackendUser[];
    return data.map(normalize);
  } catch {
    return [];
  }
}

export const userService = {
  getAllUsers(): Promise<User[]> {
    return fetchUsers();
  },

  getStudents(): Promise<User[]> {
    return fetchUsers("student");
  },

  getTeachers(): Promise<User[]> {
    return fetchUsers("teacher");
  },

  /** id → User map, handy for resolving names/initials in dashboards. */
  async getUserMap(): Promise<Record<string, User>> {
    const users = await fetchUsers();
    return Object.fromEntries(users.map((u) => [u.id, u]));
  },
};
