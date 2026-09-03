import type { IssueStatus, Priority } from "@/types";

export const CATEGORIES = [
  "Pothole",
  "Streetlight",
  "Garbage",
  "Water",
  "Electricity",
  "Parking",
  "Trees",
  "Noise",
  "Animals",
  "Sanitation",
  "Other",
] as const;

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export const STATUSES: IssueStatus[] = ["pending", "in_progress", "resolved", "closed"];

export const STATUS_LABELS: Record<IssueStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const STATUS_COLORS: Record<IssueStatus, { bg: string; text: string; dot: string; ring: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", ring: "ring-amber-200" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", ring: "ring-blue-200" },
  resolved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200" },
  closed: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", ring: "ring-slate-200" },
};

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  medium: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const ROLE_LABELS: Record<string, string> = {
  citizen: "Citizen",
  officer: "Officer",
  admin: "Administrator",
};

export const ROLE_ROUTES: Record<string, string> = {
  citizen: "/citizen",
  officer: "/officer",
  admin: "/admin",
};
