import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, ClipboardList, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, Select, PriorityBadge, StatusBadge, CategoryBadge, Button } from "@/components/ui";
import { IssueDetailModal } from "@/components/IssueDetailModal";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import { STATUSES, STATUS_LABELS, CATEGORIES, PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import type { Issue, Profile, Priority } from "@/types";

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [officers, setOfficers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { toast } = useToast();

  const loadData = async () => {
    const [{ data: issueData }, { data: officerData }] = await Promise.all([
      supabase.from("issues").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "officer").order("full_name"),
    ]);
    setIssues((issueData as Issue[]) || []);
    setOfficers((officerData as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = issues.filter((i) => {
    const q = search.toLowerCase();
    return (
      (!q || i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || (i.location || "").toLowerCase().includes(q)) &&
      (statusFilter === "all" || i.status === statusFilter) &&
      (categoryFilter === "all" || i.category === categoryFilter) &&
      (priorityFilter === "all" || i.priority === priorityFilter)
    );
  });

  const assignOfficer = async (issue: Issue, officerId: string) => {
    const { error } = await supabase.from("issues").update({ assigned_officer_id: officerId || null }).eq("id", issue.id);
    if (error) toast("Could not assign officer", "error");
    else {
      toast(officerId ? "Issue assigned successfully" : "Officer unassigned", "success");
      loadData();
    }
  };

  const updatePriority = async (issue: Issue, priority: string) => {
    const { error } = await supabase.from("issues").update({ priority }).eq("id", issue.id);
    if (error) toast("Could not update priority", "error");
    else { toast("Priority updated", "success"); loadData(); }
  };

  return (
    <AppShell role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Issue Management</h1>
        <p className="mt-1 text-sm text-slate-500">Search, filter, assign, and prioritize every reported issue.</p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues..." className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all" />
        </div>
        <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]} />
        <Select value={categoryFilter} onChange={setCategoryFilter} options={[{ value: "all", label: "All Categories" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
        <Select value={priorityFilter} onChange={setPriorityFilter} options={[{ value: "all", label: "All Priorities" }, ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))]} />
      </div>

      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>Showing <strong className="text-slate-700">{filtered.length}</strong> of {issues.length} issues</span>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-slate-400">Loading...</Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<ClipboardList className="w-8 h-8" />} title="No issues found" description="Try adjusting your search or filters." /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <Card key={issue.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <button onClick={() => setSelected(issue)} className="flex-1 min-w-0 text-left group">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusBadge status={issue.status} size="sm" />
                    <PriorityBadge priority={issue.priority} />
                    <CategoryBadge category={issue.category} />
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{issue.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-1">{issue.description}</p>
                </button>
                <div className="flex flex-col gap-2 sm:flex-row lg:w-80">
                  <Select
                    value={issue.assigned_officer_id || ""}
                    onChange={(v) => assignOfficer(issue, v)}
                    options={[{ value: "", label: "Unassigned" }, ...officers.map((o) => ({ value: o.id, label: o.full_name }))]}
                    className="flex-1"
                  />
                  <Select
                    value={issue.priority}
                    onChange={(v) => updatePriority(issue, v)}
                    options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
                    className="sm:w-32"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <IssueDetailModal issue={selected} onClose={() => setSelected(null)} onUpdate={loadData} canUpdate />
    </AppShell>
  );
}
