import type { Issue } from "@/types";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/ui";
import { MapPin, Clock } from "lucide-react";

export function IssueCard({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-teal-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <StatusBadge status={issue.status} size="sm" />
            <PriorityBadge priority={issue.priority} />
            <CategoryBadge category={issue.category} />
          </div>
          <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1">
            {issue.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 line-clamp-2 leading-relaxed">{issue.description}</p>
        </div>
        {issue.photo_url && (
          <div className="shrink-0 h-16 w-16 rounded-lg overflow-hidden border border-slate-200">
            <img src={issue.photo_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        {issue.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {issue.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {timeAgo(issue.created_at)}
        </span>
      </div>
    </button>
  );
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
