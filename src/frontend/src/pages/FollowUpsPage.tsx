import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import type { FollowUp } from "../backend";
import { useActor } from "../hooks/useActor";
import { getFollowUpIds } from "../utils/idStorage";

type FollowUpWithId = FollowUp & { id: bigint };

const STAT_ITEMS = [
  {
    label: "Total",
    icon: CalendarClock,
    color: "#14B8A6",
    key: "total" as const,
  },
  { label: "Pending", icon: Clock, color: "#D97706", key: "pending" as const },
  {
    label: "Completed",
    icon: CheckCircle2,
    color: "#16A34A",
    key: "done" as const,
  },
];

const SKEL_COLS = ["a", "b", "c", "d", "e"];

export default function FollowUpsPage() {
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ["pendingFollowUps"],
    queryFn: async () => {
      if (!actor) return [];
      const all = await actor.getPendingFollowUps();
      const ids = getFollowUpIds();
      return all.map(
        (fu, i): FollowUpWithId => ({ ...fu, id: ids[i] ?? BigInt(i) }),
      );
    },
    enabled: !!actor && !isFetching,
  });

  const markDoneMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      await actor.markFollowUpDone(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingFollowUps"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Follow-up marked as done");
    },
    onError: () => toast.error("Failed to mark as done"),
  });

  function formatDate(ts: bigint) {
    return new Date(Number(ts) / 1_000_000).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isOverdue(dueDate: bigint) {
    return Number(dueDate) / 1_000_000 < Date.now();
  }

  const pending = followUps.filter((f) => !f.isDone);
  const done = followUps.filter((f) => f.isDone);

  const counts = {
    total: followUps.length,
    pending: pending.length,
    done: done.length,
  };

  return (
    <div className="space-y-6" data-ocid="followups.page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Follow-ups</h2>
          <p className="text-sm text-muted-foreground">
            {pending.length} pending · {done.length} completed
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {STAT_ITEMS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-gray-100 shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${s.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">
                    {counts[s.key]}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card
        className="border border-gray-100 shadow-card"
        data-ocid="followups.table"
      >
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">
            All Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Lead ID</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  ["r1", "r2", "r3", "r4"].map((k) => (
                    <TableRow key={k}>
                      {SKEL_COLS.map((col) => (
                        <TableCell key={col}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : followUps.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                      data-ocid="followups.empty_state"
                    >
                      No follow-ups scheduled yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  followUps.map((fu, i) => (
                    <TableRow
                      key={String(fu.id)}
                      data-ocid={`followups.item.${i + 1}`}
                    >
                      <TableCell className="font-medium">
                        Lead #{Number(fu.leadId)}
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <p className="truncate">{fu.message}</p>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isOverdue(fu.dueDate) && !fu.isDone
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {formatDate(fu.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {fu.isDone ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Done
                          </Badge>
                        ) : isOverdue(fu.dueDate) ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!fu.isDone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markDoneMutation.mutate(fu.id)}
                            disabled={markDoneMutation.isPending}
                            className="h-7 text-xs gap-1.5"
                            style={{ borderColor: "#14B8A6", color: "#14B8A6" }}
                            data-ocid={`followups.delete_button.${i + 1}`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Mark Done
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
