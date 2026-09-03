import { useEffect, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, Select } from "@/components/ui";
import { IssueCard } from "@/components/IssueCard";
import { IssueDetailModal } from "@/components/IssueDetailModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { Issue } from "@/types";

export default function AssignedIssuesPage() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filtered = issues.filter((i) => {
    const matchesSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell role="officer">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Assigned Issues</h1>
        <p className="mt-1 text-sm text-slate-500">All issues assigned to you. Click an issue to update its status.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assigned issues..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: "all", label: "All Statuses" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
          className="sm:w-48"
        />
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-slate-400">Loading...</Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="No issues found"
            description="No issues match your search or filters. Try adjusting them."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={() => setSelected(issue)} />
          ))}
        </div>
      )}

      <IssueDetailModal issue={selected} onClose={() => setSelected(null)} onUpdate={loadIssues} canUpdate />
    </AppShell>
  );
}
