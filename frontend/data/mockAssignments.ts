import { Assignment } from "@/types";
import { assignmentIds, tpIds, userIds } from "./mockIds";

export const mockAssignments: Assignment[] = [
  {
    id: assignmentIds.assign1,
    tpId: tpIds.tp1,
    studentIds: [userIds.student1, userIds.student2, userIds.student3],
    assignedBy: userIds.teacher1,
    assignedAt: "2024-01-10T10:00:00Z",
    dueDate: "2024-01-17T23:59:00Z",
  },
  {
    id: assignmentIds.assign2,
    tpId: tpIds.tp2,
    studentIds: [userIds.student1, userIds.student3],
    assignedBy: userIds.teacher1,
    assignedAt: "2024-01-15T11:00:00Z",
    dueDate: "2024-01-22T23:59:00Z",
  },
  {
    id: assignmentIds.assign3,
    tpId: tpIds.tp3,
    studentIds: [userIds.student2, userIds.student3],
    assignedBy: userIds.teacher2,
    assignedAt: "2024-01-20T12:00:00Z",
  },
];
