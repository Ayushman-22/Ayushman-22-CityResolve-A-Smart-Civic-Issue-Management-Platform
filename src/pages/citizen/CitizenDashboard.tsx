import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, ClipboardList, CheckCircle2, Clock, ArrowRight, Activity } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, StatCard, Button, EmptyState, StatusBadge, PriorityBadge } from "@/components/ui";
import { IssueCard, timeAgo } from "@/components/IssueCard";
import { IssueDetailModal } from "@/components/IssueDetailModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Issue } from "@/types";

export default function CitizenDashboard() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Issue | null>(null);

  useEffect(() => {
    loadIssues();
  }, [profile]);

  const loadIssues = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("issues")
      .select("*")
      .eq("reporter_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setIssues((data as Issue[]) || []);
    setLoading(false);
  };

  const stats = {
    total: issues.length,
    resolved: issues.filter((i) => i.status === "resolved" || i.status === "closed").length,
    active: issues.filter((i) => i.status === "pending" || i.status === "in_progress").length,
  };

  return (
    <AppShell role="citizen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {profile?.full_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's an overview of your reported issues.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Reported" value={stats.total} icon={<ClipboardList className="w-6 h-6" />} color="bg-teal-50 text-teal-600" />
        <StatCard label="Active" value={stats.active} icon={<Clock className="w-6 h-6" />} color="bg-amber-50 text-amber-600" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="w-6 h-6" />} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
        <Link to="/citizen/report">
          <Button size="sm">
            <PlusCircle className="w-4 h-4" /> Report Issue
          </Button>
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <Card className="p-8 text-center text-sm text-slate-400">Loading...</Card>
        ) : issues.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ClipboardList className="w-8 h-8" />}
              title="No issues reported yet"
              description="Report a civic issue in your area and track it through to resolution."
              action={
                <Link to="/citizen/report">
                  <Button>
                    <PlusCircle className="w-4 h-4" /> Report Your First Issue
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={() => setSelected(issue)} />
          ))
        )}
      </div>

      {issues.length > 0 && (
        <div className="mt-6 text-center">
          <Link to="/citizen/issues">
            <Button variant="outline">
              View All Issues <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}

      <IssueDetailModal issue={selected} onClose={() => setSelected(null)} onUpdate={loadIssues} />
    </AppShell>
  );
}
