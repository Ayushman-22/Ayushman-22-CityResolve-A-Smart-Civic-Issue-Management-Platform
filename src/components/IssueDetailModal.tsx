import { useEffect, useState } from "react";
import { X, MapPin, Clock, User, Camera, FileText } from "lucide-react";
import type { Issue, IssueStatus } from "@/types";
import { StatusBadge, PriorityBadge, CategoryBadge, Button, Textarea, Select } from "@/components/ui";
import { STATUS_LABELS, STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export function IssueDetailModal({
  issue,
  onClose,
  onUpdate,
  canUpdate,
}: {
  issue: Issue | null;
  onClose: () => void;
  onUpdate?: () => void;
  canUpdate?: boolean;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState(issue?.status || "pending");
  const [notes, setNotes] = useState(issue?.resolution_notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (issue) {
      setNewStatus(issue.status);
      setNotes(issue.resolution_notes || "");
    }
  }, [issue]);

  if (!issue) return null;

  const isOfficer = profile?.role === "officer";
  const isAdmin = profile?.role === "admin";
  const canEditStatus = canUpdate && (isOfficer || isAdmin);

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, string> = { status: newStatus };
    if (newStatus === "resolved" || newStatus === "closed") {
      updates.resolution_notes = notes;
    }
    const { error } = await supabase.from("issues").update(updates).eq("id", issue.id);
    setSaving(false);
    if (error) {
      toast("Failed to update issue", "error");
      return;
    }
    toast("Issue updated successfully", "success");
    onUpdate?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-6 py-4">
          <div className="flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
              <CategoryBadge category={issue.category} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{issue.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {issue.photo_url && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src={issue.photo_url} alt={issue.title} className="w-full h-56 object-cover" />
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Description
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={issue.location || "Not specified"} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Ward" value={issue.ward || "Not specified"} />
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Reported" value={new Date(issue.created_at).toLocaleDateString()} />
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Updated" value={new Date(issue.updated_at).toLocaleDateString()} />
          </div>

          {issue.latitude && issue.longitude && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-semibold">Coordinates:</span> {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
            </div>
          )}

          {issue.resolution_notes && !canEditStatus && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-1.5">Resolution Notes</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                {issue.resolution_notes}
              </p>
            </div>
          )}

          {canEditStatus && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-700">Update Issue</h3>
              <Select
                label="Status"
                value={newStatus}
                onChange={(v) => setNewStatus(v as IssueStatus)}
                options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              />
              <Textarea
                label="Resolution Notes"
                value={notes}
                onChange={setNotes}
                placeholder="Add notes about the resolution..."
                rows={3}
              />
              <Button onClick={handleSave} disabled={saving} full>
                {saving ? "Saving..." : "Save Update"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-0.5 flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}
