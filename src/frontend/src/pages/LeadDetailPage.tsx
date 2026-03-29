import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  MessageSquare,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActivityType, LeadStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import { addFollowUpId } from "../utils/idStorage";

const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.New]: "bg-blue-100 text-blue-700",
  [LeadStatus.Contacted]: "bg-yellow-100 text-yellow-700",
  [LeadStatus.VisitBooked]: "bg-purple-100 text-purple-700",
  [LeadStatus.Converted]: "bg-green-100 text-green-700",
  [LeadStatus.Dropped]: "bg-gray-100 text-gray-600",
};

function ScoreBadge({ score }: { score: bigint }) {
  const n = Number(score);
  const cls =
    n >= 70
      ? "bg-green-100 text-green-700"
      : n >= 40
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${cls}`}
    >
      {n}/100
    </span>
  );
}

function formatTs(ts: bigint) {
  return new Date(Number(ts) / 1_000_000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  [ActivityType.StatusChange]: "🔄",
  [ActivityType.NoteAdded]: "📝",
  [ActivityType.FollowUpScheduled]: "📅",
  [ActivityType.FollowUpDone]: "✅",
};

const LEAD_FIELDS = [
  "Child Name",
  "Age",
  "Branch",
  "Interest",
  "Source",
  "Created",
] as const;

export default function LeadDetailPage() {
  const { id } = useParams({ from: "/protected/leads/$id" });
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();

  const [noteContent, setNoteContent] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpMsg, setFollowUpMsg] = useState("");

  const leadId = BigInt(id);

  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getLead(leadId);
    },
    enabled: !!actor && !isFetching,
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["notes", id],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotesByLead(leadId);
    },
    enabled: !!actor && !isFetching,
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities", id],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivitiesByLead(leadId);
    },
    enabled: !!actor && !isFetching,
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ["followUps", id],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFollowUpsByLead(leadId);
    },
    enabled: !!actor && !isFetching,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: LeadStatus) => {
      if (!actor) throw new Error("No actor");
      await actor.updateLead(leadId, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["activities", id] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!actor) throw new Error("No actor");
      await actor.addNote(leadId, content);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", id] });
      qc.invalidateQueries({ queryKey: ["activities", id] });
      setNoteContent("");
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  const addFollowUpMutation = useMutation({
    mutationFn: async ({
      dueDate,
      message,
    }: { dueDate: string; message: string }) => {
      if (!actor) throw new Error("No actor");
      const dueDateMs = BigInt(new Date(dueDate).getTime()) * BigInt(1_000_000);
      const fuId = await actor.createFollowUp(leadId, dueDateMs, message);
      addFollowUpId(fuId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followUps", id] });
      qc.invalidateQueries({ queryKey: ["activities", id] });
      setFollowUpDate("");
      setFollowUpMsg("");
      toast.success("Follow-up scheduled");
    },
    onError: () => toast.error("Failed to schedule follow-up"),
  });

  if (leadLoading) {
    return (
      <div className="space-y-4" data-ocid="leaddetail.loading_state">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div
        className="text-center py-20 text-muted-foreground"
        data-ocid="leaddetail.error_state"
      >
        <p>Lead not found.</p>
        <Button variant="link" onClick={() => navigate({ to: "/leads" })}>
          Back to Leads
        </Button>
      </div>
    );
  }

  const leadFields = [
    { label: LEAD_FIELDS[0], value: lead.childName },
    { label: LEAD_FIELDS[1], value: `${Number(lead.age)} years` },
    { label: LEAD_FIELDS[2], value: lead.branch },
    { label: LEAD_FIELDS[3], value: lead.interest },
    { label: LEAD_FIELDS[4], value: lead.source },
    { label: LEAD_FIELDS[5], value: formatTs(lead.createdAt) },
  ];

  return (
    <div className="space-y-6 max-w-5xl" data-ocid="leaddetail.page">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate({ to: "/leads" })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-ocid="leaddetail.back.button"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Leads
      </button>

      {/* Lead info */}
      <Card className="border border-gray-100 shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <CardTitle className="font-display text-2xl">
                {lead.parentName}
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-0.5">
                {lead.phone}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ScoreBadge score={lead.score} />
              <Select
                value={lead.status}
                onValueChange={(v) =>
                  updateStatusMutation.mutate(v as LeadStatus)
                }
              >
                <SelectTrigger
                  className={`w-36 text-xs font-medium border-0 ${STATUS_COLORS[lead.status]}`}
                  data-ocid="leaddetail.status.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(LeadStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === LeadStatus.VisitBooked ? "Visit Booked" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {leadFields.map((f) => (
              <div key={f.label}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {f.label}
                </p>
                <p className="text-sm font-medium mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notes */}
        <Card
          className="border border-gray-100 shadow-card"
          data-ocid="leaddetail.notes.card"
        >
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: "#14B8A6" }} />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notesLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : notes.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground py-4 text-center"
                  data-ocid="leaddetail.notes.empty_state"
                >
                  No notes yet
                </p>
              ) : (
                notes.map((note, i) => (
                  <div
                    key={`${String(note.createdAt)}-${i}`}
                    className="bg-gray-50 rounded-lg p-3"
                    data-ocid={`leaddetail.notes.item.${i + 1}`}
                  >
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTs(note.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={2}
                className="resize-none"
                data-ocid="leaddetail.notes.textarea"
              />
              <Button
                size="sm"
                className="text-white"
                style={{ backgroundColor: "#14B8A6" }}
                onClick={() =>
                  noteContent.trim() &&
                  addNoteMutation.mutate(noteContent.trim())
                }
                disabled={!noteContent.trim() || addNoteMutation.isPending}
                data-ocid="leaddetail.notes.submit_button"
              >
                <Plus className="w-3 h-3 mr-1" />
                {addNoteMutation.isPending ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schedule follow-up */}
        <Card
          className="border border-gray-100 shadow-card"
          data-ocid="leaddetail.followup.card"
        >
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4" style={{ color: "#14B8A6" }} />
              Schedule Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {followUps.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
                {followUps.map((fu, i) => (
                  <div
                    key={`${String(fu.dueDate)}-${i}`}
                    className="flex items-center gap-2 text-sm"
                    data-ocid={`leaddetail.followup.item.${i + 1}`}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: fu.isDone ? "#9CA3AF" : "#14B8A6",
                      }}
                    />
                    <span
                      className={
                        fu.isDone ? "line-through text-muted-foreground" : ""
                      }
                    >
                      {fu.message}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(
                        Number(fu.dueDate) / 1_000_000,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="leaddetail.followup.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message</Label>
                <Input
                  placeholder="Follow up about visit..."
                  value={followUpMsg}
                  onChange={(e) => setFollowUpMsg(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="leaddetail.followup.input"
                />
              </div>
              <Button
                size="sm"
                className="text-white w-full"
                style={{ backgroundColor: "#14B8A6" }}
                onClick={() =>
                  followUpDate &&
                  followUpMsg &&
                  addFollowUpMutation.mutate({
                    dueDate: followUpDate,
                    message: followUpMsg,
                  })
                }
                disabled={
                  !followUpDate || !followUpMsg || addFollowUpMutation.isPending
                }
                data-ocid="leaddetail.followup.submit_button"
              >
                {addFollowUpMutation.isPending
                  ? "Scheduling..."
                  : "Schedule Follow-up"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity timeline */}
      <Card
        className="border border-gray-100 shadow-card"
        data-ocid="leaddetail.activity.card"
      >
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: "#14B8A6" }} />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : activities.length === 0 ? (
            <p
              className="text-sm text-muted-foreground py-4 text-center"
              data-ocid="leaddetail.activity.empty_state"
            >
              No activities yet
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {[...activities].reverse().map((act, i) => (
                  <div
                    key={`${String(act.createdAt)}-${i}`}
                    className="flex gap-4 relative"
                    data-ocid={`leaddetail.activity.item.${i + 1}`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 z-10"
                      style={{ backgroundColor: "#EEF9F8" }}
                    >
                      {ACTIVITY_ICONS[act.activityType] ?? "•"}
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-sm font-medium">{act.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTs(act.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
