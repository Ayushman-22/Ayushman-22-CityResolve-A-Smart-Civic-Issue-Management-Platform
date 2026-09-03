export type Role = "citizen" | "officer" | "admin";

export type IssueStatus = "pending" | "in_progress" | "resolved" | "closed";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  ward: string | null;
  created_at: string;
}

export interface Issue {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: IssueStatus;
  location: string | null;
  ward: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  assigned_officer_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  reporter?: Profile;
  assigned_officer?: Profile | null;
}

export interface Notification {
  id: string;
  user_id: string;
  issue_id: string | null;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}
