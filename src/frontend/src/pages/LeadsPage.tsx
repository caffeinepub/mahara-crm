import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useNavigate } from "@tanstack/react-router";
import { Edit, Eye, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type CreateLeadInput, type Lead, LeadStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import { addLeadId, getLeadIds, removeLeadId } from "../utils/idStorage";

type LeadWithId = Lead & { id: bigint };

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
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {n}
    </span>
  );
}

interface LeadFormData {
  parentName: string;
  phone: string;
  childName: string;
  age: string;
  branch: string;
  interest: string;
  score: string;
  status: LeadStatus;
  source: string;
}

const EMPTY_FORM: LeadFormData = {
  parentName: "",
  phone: "",
  childName: "",
  age: "",
  branch: "",
  interest: "",
  score: "50",
  status: LeadStatus.New,
  source: "",
};

export default function LeadsPage() {
  const { actor, isFetching } = useActor();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<LeadWithId | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [form, setForm] = useState<LeadFormData>(EMPTY_FORM);

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

  const createMutation = useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      if (!actor) throw new Error("No actor");
      const id = await actor.createLead(input);
      addLeadId(id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allLeads"] });
      toast.success("Lead created!");
    },
    onError: () => toast.error("Failed to create lead"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: bigint; input: Partial<CreateLeadInput> }) => {
      if (!actor) throw new Error("No actor");
      await actor.updateLead(id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allLeads"] });
      toast.success("Lead updated!");
    },
    onError: () => toast.error("Failed to update lead"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      await actor.deleteLead(id);
      removeLeadId(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allLeads"] });
      toast.success("Lead deleted");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const s = search.toLowerCase();
      const matchSearch =
        !s ||
        l.parentName.toLowerCase().includes(s) ||
        l.childName.toLowerCase().includes(s);
      const matchStatus = filterStatus === "all" || l.status === filterStatus;
      const matchBranch = filterBranch === "all" || l.branch === filterBranch;
      const matchSource = filterSource === "all" || l.source === filterSource;
      return matchSearch && matchStatus && matchBranch && matchSource;
    });
  }, [leads, search, filterStatus, filterBranch, filterSource]);

  const branches = useMemo(
    () => [...new Set(leads.map((l) => l.branch).filter(Boolean))],
    [leads],
  );
  const sources = useMemo(
    () => [...new Set(leads.map((l) => l.source).filter(Boolean))],
    [leads],
  );

  function openAdd() {
    setEditLead(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(lead: LeadWithId) {
    setEditLead(lead);
    setForm({
      parentName: lead.parentName,
      phone: lead.phone,
      childName: lead.childName,
      age: String(Number(lead.age)),
      branch: lead.branch,
      interest: lead.interest,
      score: String(Number(lead.score)),
      status: lead.status,
      source: lead.source,
    });
    setDialogOpen(true);
  }

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const input: CreateLeadInput = {
        parentName: form.parentName,
        phone: form.phone,
        childName: form.childName,
        age: BigInt(Number.parseInt(form.age) || 0),
        branch: form.branch,
        interest: form.interest,
        score: BigInt(Number.parseInt(form.score) || 0),
        status: form.status,
        source: form.source,
      };
      if (editLead) {
        await updateMutation.mutateAsync({ id: editLead.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setDialogOpen(false);
    },
    [form, editLead, createMutation, updateMutation],
  );

  function setF(k: keyof LeadFormData, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const SKELETON_COLS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

  return (
    <div className="space-y-4" data-ocid="leads.page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Leads</h2>
          <p className="text-sm text-muted-foreground">
            {leads.length} total leads
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="text-white shrink-0"
          style={{ backgroundColor: "#14B8A6" }}
          data-ocid="leads.add.primary_button"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by parent or child name..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="leads.search_input"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            className="w-full sm:w-36"
            data-ocid="leads.status.select"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.values(LeadStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s === LeadStatus.VisitBooked ? "Visit Booked" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger
            className="w-full sm:w-36"
            data-ocid="leads.branch.select"
          >
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger
            className="w-full sm:w-36"
            data-ocid="leads.source.select"
          >
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-ocid="leads.table">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Parent Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Child Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                ["r1", "r2", "r3", "r4", "r5"].map((k) => (
                  <TableRow key={k}>
                    {SKELETON_COLS.map((col) => (
                      <TableCell key={col}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="leads.empty_state"
                  >
                    No leads found. Add your first lead to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead, i) => (
                  <TableRow
                    key={String(lead.id)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      navigate({
                        to: "/leads/$id",
                        params: { id: String(lead.id) },
                      })
                    }
                    data-ocid={`leads.item.${i + 1}`}
                  >
                    <TableCell className="font-medium">
                      {lead.parentName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.phone}
                    </TableCell>
                    <TableCell>{lead.childName}</TableCell>
                    <TableCell>{Number(lead.age)}</TableCell>
                    <TableCell>{lead.branch}</TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {lead.interest}
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={lead.score} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}
                      >
                        {lead.status === LeadStatus.VisitBooked
                          ? "Visit Booked"
                          : lead.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.source}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() =>
                            navigate({
                              to: "/leads/$id",
                              params: { id: String(lead.id) },
                            })
                          }
                          data-ocid={`leads.edit_button.${i + 1}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(lead)}
                          data-ocid={`leads.edit_button.${i + 1}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(lead.id)}
                          data-ocid={`leads.delete_button.${i + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="leads.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editLead ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Parent Name *</Label>
                <Input
                  value={form.parentName}
                  onChange={(e) => setF("parentName", e.target.value)}
                  placeholder="Ahmed Al-Hassan"
                  required
                  data-ocid="leads.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setF("phone", e.target.value)}
                  placeholder="+971 50 123 4567"
                  required
                  data-ocid="leads.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Child Name *</Label>
                <Input
                  value={form.childName}
                  onChange={(e) => setF("childName", e.target.value)}
                  placeholder="Layla Al-Hassan"
                  required
                  data-ocid="leads.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input
                  type="number"
                  min="2"
                  max="18"
                  value={form.age}
                  onChange={(e) => setF("age", e.target.value)}
                  placeholder="7"
                  data-ocid="leads.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Input
                  value={form.branch}
                  onChange={(e) => setF("branch", e.target.value)}
                  placeholder="Downtown"
                  data-ocid="leads.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setF("source", e.target.value)}
                  placeholder="Website"
                  data-ocid="leads.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Interest / Program</Label>
                <Input
                  value={form.interest}
                  onChange={(e) => setF("interest", e.target.value)}
                  placeholder="Grade 2 Admission"
                  data-ocid="leads.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Score (0–100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.score}
                  onChange={(e) => setF("score", e.target.value)}
                  data-ocid="leads.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setF("status", v as LeadStatus)}
                >
                  <SelectTrigger data-ocid="leads.select">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="leads.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: "#14B8A6" }}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-ocid="leads.submit_button"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editLead
                    ? "Update Lead"
                    : "Add Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="leads.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="leads.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={() => {
                if (deleteTarget !== null) {
                  deleteMutation.mutate(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              data-ocid="leads.delete_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
