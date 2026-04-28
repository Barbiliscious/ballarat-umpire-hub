import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

const ManageUsers = () => {
  const { isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");
  const [inviting, setInviting] = useState(false);
  const [togglingDisable, setTogglingDisable] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const fetchAll = async () => {
    const [{ data: rolesData }, { data: subsData }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("vote_submissions").select("umpire_id").eq("is_deleted", false),
    ]);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const allIds = new Set<string>();

    if (rolesData) {
      rolesData.forEach(r => {
        if (r.user_id && uuidRegex.test(r.user_id)) allIds.add(r.user_id);
      });
    }

    if (subsData) {
      subsData.forEach(s => {
        if (s.umpire_id && uuidRegex.test(s.umpire_id)) allIds.add(s.umpire_id);
      });
    }

    const uniqueIds = Array.from(allIds);

    if (uniqueIds.length === 0) {
      setProfiles([]);
      setRoles([]);
      return;
    }

    const [{ data: authDetails }, { data: profilesData }] = await Promise.all([
      supabase.rpc("get_umpire_auth_details" as any, { user_ids: uniqueIds }),
      supabase.from("profiles").select("*").in("user_id", uniqueIds),
    ]);

    const mergedProfiles = uniqueIds.map(uid => {
      const p = profilesData?.find(prof => prof.user_id === uid);
      const auth = (authDetails as any[] || []).find(a => a.id === uid);
      return {
        id: p?.id || uid,
        user_id: uid,
        email: auth?.email || p?.email || "No email",
        full_name: p?.full_name || null,
        is_disabled: p?.is_disabled || false,
        created_at: auth?.created_at || p?.created_at || new Date().toISOString(),
        last_sign_in_at: auth?.last_sign_in_at || null,
      };
    });

    mergedProfiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setProfiles(mergedProfiles);
    if (rolesData) setRoles(rolesData);
  };

  useEffect(() => { fetchAll(); }, []);

  const getUserRoles = (userId: string) =>
    roles.filter((r) => r.user_id === userId).map((r) => r.role);

  const isSuperAdminUser = (userId: string) =>
    getUserRoles(userId).includes("super_admin");

  const handleInvite = async () => {
    if (!inviteEmail || !invitePassword) {
      toast.error("Email and password are required");
      return;
    }
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: {
        action: "create_user",
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
        full_name: inviteName,
      },
    });
    setInviting(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to create user");
    } else {
      toast.success("User created successfully");
      setShowInvite(false);
      setInviteEmail("");
      setInvitePassword("");
      setInviteName("");
      setInviteRole("admin");
      fetchAll();
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: { action: "update_role", user_id: userId, role: newRole },
    });
    setUpdatingRole(null);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to update role");
    } else {
      toast.success("Role updated");
      fetchAll();
    }
  };

  const handleToggleDisable = async (userId: string, currentlyDisabled: boolean) => {
    setTogglingDisable(userId);
    const action = currentlyDisabled ? "enable_user" : "disable_user";
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: { action, user_id: userId },
    });
    setTogglingDisable(null);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to update user");
    } else {
      toast.success(currentlyDisabled ? "User unblocked" : "User blocked");
      fetchAll();
    }
  };

  const roleOptions = ["umpire", "admin"];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {profiles.map((p) => {
              const isSA = isSuperAdminUser(p.user_id);
              const isDisabled = p.is_disabled;
              return (
                <TableRow key={p.id} className={isDisabled ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{p.email}</TableCell>
                  <TableCell>{p.full_name || "—"}</TableCell>
                  <TableCell>
                    {(() => {
                      const userRoles = getUserRoles(p.user_id);
                      if (userRoles.length === 0) return <Badge variant="secondary" className="bg-slate-100 text-slate-500">No Role</Badge>;
                      return userRoles.map((r) => {
                        if (r === "super_admin") return <Badge key={r} className="bg-amber-500 mr-1">Super Admin</Badge>;
                        if (r === "admin") return <Badge key={r} variant="default" className="mr-1">Admin</Badge>;
                        return <Badge key={r} variant="secondary" className="mr-1">Umpire</Badge>;
                      });
                    })()}
                  </TableCell>
                  <TableCell>
                    {isDisabled ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.last_sign_in_at ? new Date(p.last_sign_in_at).toLocaleDateString("en-AU") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSA && (
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={getUserRoles(p.user_id)[0] || ""}
                          onValueChange={(val) => handleUpdateRole(p.user_id, val)}
                          disabled={updatingRole === p.user_id}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="umpire">Umpire</SelectItem>
                          </SelectContent>
                        </Select>

                        {isDisabled ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-950/30 h-8 w-[80px]"
                            onClick={() => handleToggleDisable(p.user_id, isDisabled)}
                            disabled={togglingDisable === p.user_id}
                          >
                            Unblock
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-950/30 h-8 w-[80px]"
                                disabled={togglingDisable === p.user_id}
                              >
                                Block
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Block this user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will prevent them from logging in, including via Magic Link. You can unblock them at any time.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleToggleDisable(p.user_id, isDisabled)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Block
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="Initial password" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={inviting} className="w-full">
              {inviting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsers;
