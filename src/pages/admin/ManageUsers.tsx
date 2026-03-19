import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Trash2 } from "lucide-react";
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: { action: "delete_user", user_id: userId },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to delete user");
    } else {
      toast.success("User deleted");
      fetchAll();
    }
  };

  const roleOptions = isSuperAdmin
    ? ["umpire", "admin", "super_admin"]
    : ["umpire", "admin"];

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
            <TableHead>First Login</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.email}</TableCell>
                <TableCell>{p.full_name || "—"}</TableCell>
                <TableCell>
                  {getUserRoles(p.user_id).map((r) => (
                    <Badge
                      key={r}
                      variant={r === "super_admin" ? "default" : r === "admin" ? "default" : "secondary"}
                      className={`mr-1 ${r === "super_admin" ? "bg-amber-500" : ""}`}
                    >
                      {r === "super_admin" ? "Super Admin" : r}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.first_login ? new Date(p.first_login).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.last_login ? new Date(p.last_login).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {!getUserRoles(p.user_id).includes("super_admin") && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(p.user_id)} className="text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Invite Dialog */}
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
                    <SelectItem key={r} value={r}>{r === "super_admin" ? "Super Admin" : r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
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
