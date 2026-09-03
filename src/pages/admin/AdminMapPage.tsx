import { useEffect, useState } from "react";
import { MapPin, AlertTriangle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, StatusBadge, PriorityBadge } from "@/components/ui";
import { IssueDetailModal } from "@/components/IssueDetailModal";
import { supabase } from "@/lib/supabase";
import type { Issue } from "@/types";

export default function AdminMapPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selected, setSelected] = useState<Issue | null>(null);

  useEffect(() => {
    supabase.from("issues").select("*").not("latitude", "is", null).not("longitude", "is", null).order("created_at", { ascending: false }).then(({ data }) => setIssues((data as Issue[]) || []));
  }, []);

  return (
    <AppShell role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Issue Map</h1>
        <p className="mt-1 text-sm text-slate-500">View reported issues by location and status.</p>
      </div>

      <Card className="overflow-hidden">
        {/* Map-like visual canvas */}
        <div className="relative h-80 bg-slate-100 overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute left-1/4 top-1/3 h-40 w-80 rotate-12 rounded-[50%] border-4 border-slate-300/60 bg-slate-200/50" />
          <div className="absolute right-1/4 bottom-1/4 h-32 w-56 -rotate-6 rounded-[50%] border-4 border-slate-300/60 bg-slate-200/50" />
          <div className="absolute inset-x-0 top-1/2 h-2 -rotate-12 bg-white/80" />
          <div className="absolute inset-y-0 left-1/2 w-2 rotate-12 bg-white/80" />

          {issues.map((issue, index) => {
            const left = `${15 + ((index * 37) % 70)}%`;
            const top = `${15 + ((index * 53) % 65)}%`;
            const color = issue.status === "resolved" || issue.status === "closed" ? "bg-emerald-500" : issue.priority === "urgent" ? "bg-red-500" : issue.status === "in_progress" ? "bg-blue-500" : "bg-amber-500";
            return (
              <button key={issue.id} onClick={() => setSelected(issue)} className="absolute -translate-x-1/2 -translate-y-full group" style={{ left, top }} title={issue.title}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${color} text-white shadow-lg ring-4 ring-white/70 transition-transform group-hover:scale-125`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white group-hover:block z-10">{issue.title}</div>
              </button>
            );
          })}

          {issues.length === 0 && <div className="absolute inset-0 flex items-center justify-center"><p className="text-sm text-slate-500">No issues with location data yet</p></div>}
          <div className="absolute bottom-3 left-3 rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur-sm">
            <p className="mb-2 text-xs font-bold text-slate-700">Legend</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
              <LegendDot color="bg-amber-500" label="Pending" />
              <LegendDot color="bg-blue-500" label="In Progress" />
              <LegendDot color="bg-emerald-500" label="Resolved" />
              <LegendDot color="bg-red-500" label="Urgent" />
            </div>
          </div>
          <div className="absolute right-3 top-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">{issues.length} mapped issues</div>
        </div>

        <div className="divide-y divide-slate-100">
          {issues.slice(0, 8).map((issue) => (
            <button key={issue.id} onClick={() => setSelected(issue)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors">
              <MapPin className="w-4 h-4 shrink-0 text-teal-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{issue.title}</p>
                <p className="truncate text-xs text-slate-500">{issue.location || `${issue.latitude?.toFixed(4)}, ${issue.longitude?.toFixed(4)}`}</p>
              </div>
              <StatusBadge status={issue.status} size="sm" />
            </button>
          ))}
        </div>
      </Card>
      <IssueDetailModal issue={selected} onClose={() => setSelected(null)} onUpdate={() => {}} canUpdate />
    </AppShell>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
}
