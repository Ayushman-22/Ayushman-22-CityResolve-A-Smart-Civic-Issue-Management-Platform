import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, ArrowRight, MapPin, BarChart3, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, StatCard, Button, EmptyState } from "@/components/ui";
import { IssueCard } from "@/components/IssueCard";
import { IssueDetailModal } from "@/components/IssueDetailModal";
import { supabase } from "@/lib/supabase";
import type { Issue } from "@/types";

export default function AdminDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [officerCount, setOfficerCount] = useState(0);

  useEffect(() => {
    loadIssues();
    loadOfficers();
  }, []);

  const loadIssues = async () => {
    const { data } = await supabase.from("issues").select("*").order("created_at", { ascending: false }).limit(20);
    setIssues((data as Issue[]) || []);
    setLoading(false);
  };

  const loadOfficers = async () => {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "officer");
    setOfficerCount(count || 0);
  };

  const pending = issues.filter((i) => i.status === "pending").length;
  const inProgress = issues.filter((i) => i.status === "in_progress").length;
  const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed").length;
  const urgent = issues.filter((i) => i.priority === "urgent" && i.status !== "closed" && i.status !== "resolved").length;

  return (
    <AppShell role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Manage all civic issues, assignments, and analytics.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Issues" value={issues.length} icon={<ClipboardList className="w-6 h-6" />} color="bg-teal-50 text-teal-600" />
        <StatCard label="Pending" value={pending} icon={<Clock className="w-6 h-6" />} color="bg-amber-50 text-amber-600" />
        <StatCard label="Resolved" value={resolved} icon={<CheckCircle2 className="w-6 h-6" />} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Urgent Active" value={urgent} icon={<AlertTriangle className="w-6 h-6" />} color="bg-red-50 text-red-600" />
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickLink to="/admin/issues" icon={<ClipboardList className="w-5 h-5" />} title="Manage Issues" description="Assign, prioritize, and update all issues" />
        <QuickLink to="/admin/map" icon={<MapPin className="w-5 h-5" />} title="Map View" description="See all reported issues on an interactive map" />
        <QuickLink to="/admin/analytics" icon={<BarChart3 className="w-5 h-5" />} title="Analytics" description="Trends, resolution times, and officer performance" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Recent Issues</h2>
        <Link to="/admin/issues">
          <Button variant="outline" size="sm">
            View All <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <Card className="p-8 text-center text-sm text-slate-400">Loading...</Card>
        ) : issues.length === 0 ? (
          <Card>
            <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="No issues reported yet" description="Issues reported by citizens will appear here." />
          </Card>
        ) : (
          issues.slice(0, 8).map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={() => setSelected(issue)} />
          ))
        )}
      </div>

      <IssueDetailModal issue={selected} onClose={() => setSelected(null)} onUpdate={loadIssues} canUpdate />
    </AppShell>
  );
}

function QuickLink({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link to={to} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-teal-200 hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}
