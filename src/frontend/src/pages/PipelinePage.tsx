import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { type Lead, LeadStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import { getLeadIds } from "../utils/idStorage";

type LeadWithId = Lead & { id: bigint };

const COLUMNS: {
  status: LeadStatus;
  label: string;
  color: string;
  bg: string;
}[] = [
  { status: LeadStatus.New, label: "New", color: "#3B82F6", bg: "#EFF6FF" },
  {
    status: LeadStatus.Contacted,
    label: "Contacted",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    status: LeadStatus.VisitBooked,
    label: "Visit Booked",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    status: LeadStatus.Converted,
    label: "Converted",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    status: LeadStatus.Dropped,
    label: "Dropped",
    color: "#6B7280",
    bg: "#F9FAFB",
  },
];

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
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${cls}`}
    >
      {n}
    </span>
  );
}

export default function PipelinePage() {
  const { actor, isFetching } = useActor();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dragLeadRef = useRef<LeadWithId | null>(null);
  const [draggingId, setDraggingId] = useState<bigint | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["allLeads"],
    queryFn: async () => {
      if (!actor) return [];
      const all = await actor.getAllLeads();
      const ids = getLeadIds();
      return all.map((l, i): LeadWithId => ({ ...l, id: ids[i] ?? BigInt(i) }));
    },
    enabled: !!actor && !isFetching,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: bigint; status: LeadStatus }) => {
      if (!actor) throw new Error("No actor");
      await actor.updateLead(id, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allLeads"] });
      toast.success("Lead moved");
    },
    onError: () => toast.error("Failed to move lead"),
  });

  function onDragStart(lead: LeadWithId) {
    dragLeadRef.current = lead;
    setDraggingId(lead.id);
  }

  function onDragEnd() {
    dragLeadRef.current = null;
    setDraggingId(null);
    setDragOverStatus(null);
  }

  function onDrop(status: LeadStatus) {
    const lead = dragLeadRef.current;
    if (!lead || lead.status === status) {
      onDragEnd();
      return;
    }
    updateMutation.mutate({ id: lead.id, status });
    onDragEnd();
  }

  const SKEL_KEYS = ["sk1", "sk2"];

  return (
    <div className="space-y-4" data-ocid="pipeline.page">
      <div>
        <h2 className="font-display font-bold text-xl">Pipeline</h2>
        <p className="text-sm text-muted-foreground">
          Drag and drop leads between stages
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.status);
          const isOver = dragOverStatus === col.status;
          return (
            <div
              key={col.status}
              className="flex flex-col min-w-[260px] max-w-[260px]"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={() => onDrop(col.status)}
              data-ocid={`pipeline.${col.status.toLowerCase()}.panel`}
            >
              {/* Column header */}
              <div
                className="rounded-t-xl px-3 py-2.5 flex items-center justify-between"
                style={{
                  backgroundColor: col.bg,
                  borderBottom: `2px solid ${col.color}`,
                }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: col.color }}
                >
                  {col.label}
                </span>
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: col.color }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div
                className={`flex-1 rounded-b-xl min-h-[400px] p-2 space-y-2 transition-colors ${
                  isOver ? "bg-teal/10 ring-2 ring-teal" : "bg-gray-50"
                }`}
              >
                {isLoading ? (
                  SKEL_KEYS.map((k) => (
                    <Skeleton key={k} className="h-24 w-full rounded-lg" />
                  ))
                ) : colLeads.length === 0 ? (
                  <div
                    className="flex items-center justify-center h-20 text-sm text-muted-foreground"
                    data-ocid={`pipeline.${col.status.toLowerCase()}.empty_state`}
                  >
                    No leads
                  </div>
                ) : (
                  colLeads.map((lead, i) => (
                    <button
                      type="button"
                      key={String(lead.id)}
                      draggable
                      onDragStart={() => onDragStart(lead)}
                      onDragEnd={onDragEnd}
                      onClick={() =>
                        navigate({
                          to: "/leads/$id",
                          params: { id: String(lead.id) },
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          navigate({
                            to: "/leads/$id",
                            params: { id: String(lead.id) },
                          });
                      }}
                      className={`w-full text-left bg-white rounded-lg p-3 border border-gray-100 shadow-xs cursor-grab active:cursor-grabbing transition-all hover:shadow-md select-none ${
                        draggingId === lead.id
                          ? "opacity-50 ring-2 ring-teal"
                          : ""
                      }`}
                      data-ocid={`pipeline.item.${i + 1}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-sm truncate">
                          {lead.parentName}
                        </p>
                        <ScoreBadge score={lead.score} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lead.childName}
                      </p>
                      {lead.branch && (
                        <p
                          className="text-xs mt-1.5 px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: "#F0FDF4",
                            color: "#16A34A",
                          }}
                        >
                          {lead.branch}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
