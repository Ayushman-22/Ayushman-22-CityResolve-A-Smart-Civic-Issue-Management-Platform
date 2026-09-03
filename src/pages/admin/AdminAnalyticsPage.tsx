import { useEffect, useState, useMemo } from "react";
import { TrendingUp, Clock, CheckCircle2, BarChart3, Users, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, StatCard, EmptyState } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, CATEGORIES } from "@/lib/constants";
import type { Issue, Profile } from "@/types";

export default function AdminAnalyticsPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [officers, setOfficers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("issues").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("*").eq("role", "officer"),
    ]).then(([{ data: idata }, { data: odata }]) => {
      setIssues((idata as Issue[]) || []);
      setOfficers((odata as Profile[]) || []);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed");
    const byStatus = {
      pending: issues.filter((i) => i.status === "pending").length,
      in_progress: issues.filter((i) => i.status === "in_progress").length,
      resolved: issues.filter((i) => i.status === "resolved").length,
      closed: issues.filter((i) => i.status === "closed").length,
    };
    const byCategory: Record<string, number> = {};
    CATEGORIES.forEach((c) => { byCategory[c] = issues.filter((i) => i.category === c).length; });
    const byPriority = {
      low: issues.filter((i) => i.priority === "low").length,
      medium: issues.filter((i) => i.priority === "medium").length,
      high: issues.filter((i) => i.priority === "high").length,
      urgent: issues.filter((i) => i.priority === "urgent").length,
    };
    const avgResolutionMs = resolved.length > 0
      ? resolved.reduce((sum, i) => sum + (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()), 0) / resolved.length
      : 0;
    const avgResolutionDays = Math.round(avgResolutionMs / (1000 * 60 * 60 * 24 * 10)) / 10;

    // Last 6 months trend
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = d.toLocaleDateString("en", { month: "short" });
      const count = issues.filter((i) => {
        const cd = new Date(i.created_at);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label, count });
    }

    // Officer performance
    const officerPerf = officers.map((o) => {
      const assigned = issues.filter((i) => i.assigned_officer_id === o.id);
      const res = assigned.filter((i) => i.status === "resolved" || i.status === "closed");
      return { name: o.full_name, assigned: assigned.length, resolved: res.length, ward: o.ward || "—" };
    }).sort((a, b) => b.resolved - a.resolved);

    return { total, resolvedCount: resolved.length, byStatus, byCategory, byPriority, avgResolutionDays, months, officerPerf };
  }, [issues, officers]);

  const maxMonth = Math.max(...stats.months.map((m) => m.count), 1);
  const maxCat = Math.max(...Object.values(stats.byCategory), 1);
  const maxOfficer = Math.max(...stats.officerPerf.map((o) => o.assigned), 1);

  if (loading) {
    return <AppShell role="admin"><Card className="p-8 text-center text-sm text-slate-400">Loading analytics...</Card></AppShell>;
  }

  return (
    <AppShell role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Trends, resolution times, categories, and officer performance.</p>
      </div>

      {issues.length === 0 ? (
        <Card><EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No data yet" description="Analytics will appear once issues are reported." /></Card>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Issues" value={stats.total} icon={<BarChart3 className="w-6 h-6" />} color="bg-teal-50 text-teal-600" />
            <StatCard label="Resolved" value={stats.resolvedCount} icon={<CheckCircle2 className="w-6 h-6" />} color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Avg Resolution" value={`${stats.avgResolutionDays}d`} icon={<Clock className="w-6 h-6" />} color="bg-blue-50 text-blue-600" />
            <StatCard label="Officers" value={officers.length} icon={<Users className="w-6 h-6" />} color="bg-indigo-50 text-indigo-600" />
          </div>

          {/* Trend chart */}
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Issue Volume Trend</h2>
            <p className="text-sm text-slate-500 mb-5">Reports filed over the last 6 months</p>
            <div className="flex items-end justify-between gap-3 h-48">
              {stats.months.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">{m.count}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-teal-400 transition-all hover:from-teal-600 hover:to-teal-500" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: "4px" }} />
                  <span className="text-xs text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Status breakdown */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Status Breakdown</h2>
              <div className="space-y-3">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  const c = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</span>
                        <span className="text-sm text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${c.dot} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Priority breakdown */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Priority Distribution</h2>
              <div className="space-y-3">
                {Object.entries(stats.byPriority).map(([priority, count]) => {
                  const c = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS];
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={priority}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS]}</span>
                        <span className="text-sm text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${c.text.replace("text", "bg")} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Category breakdown */}
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Issues by Category</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {CATEGORIES.map((cat) => {
                const count = stats.byCategory[cat] || 0;
                const pct = maxCat > 0 ? Math.round((count / maxCat) * 100) : 0;
                return (
                  <div key={cat} className="rounded-xl border border-slate-100 p-3">
                    <p className="text-sm font-semibold text-slate-700">{cat}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Officer performance */}
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Officer Performance</h2>
            {stats.officerPerf.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No officers registered yet.</p>
            ) : (
              <div className="space-y-4">
                {stats.officerPerf.map((o) => (
                  <div key={o.name} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                      {o.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-sm font-semibold text-slate-800">{o.name}</span>
                          <span className="ml-2 text-xs text-slate-400">Ward: {o.ward}</span>
                        </div>
                        <span className="text-sm text-slate-500">{o.resolved}/{o.assigned} resolved</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div className="h-full rounded-l-full bg-emerald-400" style={{ width: `${o.assigned > 0 ? (o.resolved / o.assigned) * 100 : 0}%` }} />
                        <div className="flex-1 h-full rounded-r-full bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
