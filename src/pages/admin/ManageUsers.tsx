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
import { Switch } from "@/components/ui/switch";
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

  const fetchAll = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    if (p.data) setProfiles(p.data);
    if (r.data) setRoles(r.data);
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
      toast.success(currentlyDisabled ? "User enabled" : "User disabled");
      fetchAll();
    }
  };

  const roleOptions = ["umpire", "admin"];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Invite Admin
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
                    {getUserRoles(p.user_id).map((r) => (
                      <Badge
                        key={r}
                        variant={r === "super_admin" ? "default" : r === "admin" ? "default" : "secondary"}
                        className={`mr-1 ${r === "super_admin" ? "bg-amber-500" : ""}`}
                      >
                        {r === "super_admin" ? "Super Admin" : r.charAt(0).toUpperCase() + r.slice(1)}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    {isDisabled ? (
                      <Badge variant="destructive">Disabled</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.last_login ? new Date(p.last_login).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSA && (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {isDisabled ? "Disabled" : "Enabled"}
                        </span>
                        <Switch
                          checked={!isDisabled}
                          onCheckedChange={() => handleToggleDisable(p.user_id, isDisabled)}
                          disabled={togglingDisable === p.user_id}
                        />
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
            <DialogTitle>Invite Admin User</DialogTitle>
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
