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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Branch } from "../backend";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { addBranchId, getBranchIds, removeBranchId } from "../utils/idStorage";

type BranchWithId = Branch & { id: bigint };

export default function SettingsPage() {
  const { actor, isFetching } = useActor();
  const { user, login, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [newBranch, setNewBranch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileRole, setProfileRole] = useState(user?.role ?? "user");

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["allBranches"],
    queryFn: async () => {
      if (!actor) return [];
      const all = await actor.getAllBranches();
      const ids = getBranchIds();
      return all.map(
        (b, i): BranchWithId => ({ ...b, id: ids[i] ?? BigInt(i) }),
      );
    },
    enabled: !!actor && !isFetching,
  });

  const createBranchMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("No actor");
      const id = await actor.createBranch(name);
      addBranchId(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allBranches"] });
      toast.success("Branch created");
      setNewBranch("");
    },
    onError: () => toast.error("Failed to create branch"),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      await actor.deleteBranch(id);
      removeBranchId(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allBranches"] });
      toast.success("Branch deleted");
    },
    onError: () => toast.error("Failed to delete branch"),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !user) throw new Error("No actor");
      const profile = {
        name: profileName,
        email: user.email,
        role: profileRole,
      };
      await actor.saveCallerUserProfile(profile);
      login(profile);
    },
    onSuccess: () => toast.success("Profile updated"),
    onError: () => toast.error("Failed to update profile"),
  });

  return (
    <div className="space-y-4 max-w-2xl" data-ocid="settings.page">
      <div>
        <h2 className="font-display font-bold text-xl">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your CRM configuration
        </p>
      </div>

      <Tabs defaultValue="branches" data-ocid="settings.tab">
        <TabsList className="mb-4">
          <TabsTrigger value="branches" data-ocid="settings.branches.tab">
            <Building2 className="w-4 h-4 mr-2" />
            Branches
          </TabsTrigger>
          <TabsTrigger value="profile" data-ocid="settings.profile.tab">
            <Users className="w-4 h-4 mr-2" />
            My Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branches">
          <Card className="border border-gray-100 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-base">
                Branch Management
              </CardTitle>
              <CardDescription>
                Manage school branches and locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add branch form */}
              <div className="flex gap-2">
                <Input
                  placeholder="Branch name (e.g. Downtown)"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    newBranch.trim() &&
                    createBranchMutation.mutate(newBranch.trim())
                  }
                  data-ocid="settings.input"
                />
                <Button
                  onClick={() =>
                    newBranch.trim() &&
                    createBranchMutation.mutate(newBranch.trim())
                  }
                  disabled={!newBranch.trim() || createBranchMutation.isPending}
                  className="text-white shrink-0"
                  style={{ backgroundColor: "#14B8A6" }}
                  data-ocid="settings.branches.primary_button"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {/* Branch list */}
              <div className="space-y-2">
                {branchesLoading ? (
                  ["s1", "s2", "s3"].map((k) => (
                    <Skeleton key={k} className="h-12 w-full" />
                  ))
                ) : branches.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground text-center py-6"
                    data-ocid="settings.branches.empty_state"
                  >
                    No branches yet. Add your first branch above.
                  </p>
                ) : (
                  branches.map((branch, i) => (
                    <div
                      key={String(branch.id)}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                      data-ocid={`settings.branches.item.${i + 1}`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {branch.name}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(branch.id)}
                        data-ocid={`settings.branches.delete_button.${i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border border-gray-100 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-base">
                My Profile
              </CardTitle>
              <CardDescription>Update your name and role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name"
                  data-ocid="settings.profile.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              {isAdmin() && (
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={profileRole} onValueChange={setProfileRole}>
                    <SelectTrigger data-ocid="settings.profile.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Sales Rep</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                className="text-white"
                style={{ backgroundColor: "#14B8A6" }}
                data-ocid="settings.profile.save_button"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete branch confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="settings.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the branch from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="settings.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={() => {
                if (deleteTarget !== null) {
                  deleteBranchMutation.mutate(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              data-ocid="settings.delete_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
