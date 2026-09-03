import { useEffect, useState } from "react";
import { ClipboardList, Clock, CheckCircle2, Activity, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, StatCard, EmptyState, Button } from "@/components/ui";
import { IssueCard } from "@/components/IssueCard";
import { IssueDetailModal } from "@/components/IssueDetailModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Issue } from "@/types";

export default function OfficerDashboard() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Issue | null>(null);

  const loadIssues = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("issues")
      .select("*")
      .eq("assigned_officer_id", profile.id)
      .order("updated_at", { ascending: false });
    setIssues((data as Issue[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadIssues();
  }, [profile]);

  const active = issues.filter((i) => i.status === "pending" || i.status === "in_progress");
  const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed");

  return (
    <AppShell role="officer">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Officer Workspace</h1>
        <p className="mt-1 text-sm text-slate-500">
          {profile?.ward ? `Ward: ${profile.ward}` : "Issues assigned to you"} — manage and resolve them here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Assigned to You" value={issues.length} icon={<ShieldCheck className="w-6 h-6" />} color="bg-blue-50 text-blue-600" />
        <StatCard label="Active" value={active.length} icon={<Clock className="w-6 h-6" />} color="bg-amber-50 text-amber-600" />
        <StatCard label="Resolved" value={resolved.length} icon={<CheckCircle2 className="w-6 h-6" />} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Active Assignments</h2>
        {loading ? (
          <Card className="p-8 text-center text-sm text-slate-400">Loading...</Card>
        ) : active.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CheckCircle2 className="w-8 h-8" />}
              title="No active assignments"
              description="You have no pending or in-progress issues. Great job!"
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onClick={() => setSelected(issue)} />
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Resolved Issues</h2>
          <div className="space-y-3">
            {resolved.slice(0, 5).map((issue) => (
              <IssueCard key={issue.id} issue={issue} onClick={() => setSelected(issue)} />
            ))}
          </div>
        </div>
      )}

      <IssueDetailModal issue={selected} onClose={() => setSelected(null)} onUpdate={loadIssues} canUpdate />
    </AppShell>
  );
}
