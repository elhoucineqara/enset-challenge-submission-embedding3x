import { User } from "@/types";
import { userIds } from "./mockIds";

export const mockUsers: User[] = [
  {
    id: userIds.teacher1,
    name: "M. YOUSSFI Mohamed ",
    email: "youssfi@enset.ma",
    password: "teacher123",
    role: "teacher",
    avatarInitials: "YM",
  },
  {
    id: userIds.teacher2,
    name: "Mme. OUHMIDA Asmae ",
    email: "ouhmidas@enset.ma",
    password: "teacher123",
    role: "teacher",
    avatarInitials: "OA",
  },
  {
    id: userIds.student1,
    name: "Toubani Badr eddine",
    email: "toubani@enset.ma",
    password: "student123",
    role: "student",
    avatarInitials: "TB",
  },
  {
    id: userIds.student2,
    name: "Bahou houdaifa",
    email: "bahou@enset.ma",
    password: "student123",
    role: "student",
    avatarInitials: "BH",
  },
  {
    id: userIds.student3,
    name: "AARAB AYMANE",
    email: "aymane@semlalia.ma",
    password: "student123",
    role: "student",
    avatarInitials: "AA",
  },

];

export const getStudents = () => mockUsers.filter((u) => u.role === "student");
export const getTeachers = () => mockUsers.filter((u) => u.role === "teacher");
