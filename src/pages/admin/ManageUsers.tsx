import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, Pencil, ChevronDown, ChevronUp } from "lucide-react";

interface UserRow {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  isDisabled: boolean;
  lastSignIn: string | null;
  createdAt: string | null;
  hasPassword: boolean;
}

interface SubmissionHistory {
  id: string;
  roundName: string;
  divisionName: string;
  homeTeam: string;
  awayTeam: string;
  submittedAt: string;
  submissionType: 'self' | 'by_proxy' | 'as_proxy';
  otherPersonEmail: string | null;
  voteLines: Array<{ votes: number; playerName: string; playerNumber: number }>;
}

const ManageUsers = () => {
  const { isSuperAdmin } = useAuth();
  
  const [users, setUsers] = useState<UserRow[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Raw data for history
  const [rawSubmissions, setRawSubmissions] = useState<any[]>([]);
  const [rawLines, setRawLines] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { email: string; full_name: string | null }>>({});

  const [loading, setLoading] = useState(true);

  // Edit User Dialog
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingDisable, setTogglingDisable] = useState<string | null>(null);

  // Add User Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("umpire");
  const [adding, setAdding] = useState(false);

  const fetchAll = async () => {
    setLoading(true);

    const [
      { data: rolesData },
      { data: subsData },
      { data: linesData },
      { data: roundsData },
      { data: divsData },
      { data: teamsData }
    ] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("vote_submissions").select("*").eq("is_deleted", false).order("submitted_at", { ascending: false }),
      supabase.from("vote_lines").select("*"),
      supabase.from("rounds").select("id, name"),
      supabase.from("divisions").select("id, name"),
      supabase.from("teams").select("id, name"),
    ]);

    setRawSubmissions(subsData || []);
    setRawLines(linesData || []);
    setRounds(roundsData || []);
    setDivisions(divsData || []);
    setTeams(teamsData || []);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const allIds = new Set<string>();

    if (rolesData) {
      rolesData.forEach((r) => {
        if (r.user_id && uuidRegex.test(r.user_id)) allIds.add(r.user_id);
      });
    }

    if (subsData) {
      subsData.forEach((s) => {
        if (s.umpire_id && uuidRegex.test(s.umpire_id)) allIds.add(s.umpire_id);
        if (s.proxy_submitter_id && uuidRegex.test(s.proxy_submitter_id)) allIds.add(s.proxy_submitter_id);
        if (s.submitted_by_admin_id && uuidRegex.test(s.submitted_by_admin_id)) allIds.add(s.submitted_by_admin_id);
      });
    }

    const uniqueIds = Array.from(allIds);

    if (uniqueIds.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const [{ data: authDetails }, { data: profilesData }] = await Promise.all([
      supabase.rpc("get_umpire_auth_details" as any, { user_ids: uniqueIds }),
      supabase.from("profiles").select("user_id, full_name, is_disabled, email").in("user_id", uniqueIds),
    ]);

    const pMap: Record<string, { email: string; full_name: string | null }> = {};
    if (profilesData) {
      profilesData.forEach(p => {
        pMap[p.user_id] = { email: p.email, full_name: p.full_name };
      });
    }
    if (authDetails) {
      (authDetails as any[]).forEach(a => {
        if (pMap[a.id]) {
          pMap[a.id].email = a.email;
        } else {
          pMap[a.id] = { email: a.email, full_name: null };
        }
      });
    }
    setProfilesMap(pMap);

    const merged: UserRow[] = uniqueIds.map((uid) => {
      const p = profilesData?.find((prof) => prof.user_id === uid);
      const auth = (authDetails as any[] || []).find((a) => a.id === uid);
      const userRoles = rolesData?.filter(r => r.user_id === uid).map(r => r.role) || [];
      
      let mainRole = "umpire";
      if (userRoles.includes("super_admin")) mainRole = "super_admin";
      else if (userRoles.includes("admin")) mainRole = "admin";
      else if (userRoles.length > 0) mainRole = userRoles[0];

      return {
        userId: uid,
        email: auth?.email || p?.email || "No email",
        fullName: p?.full_name || null,
        role: userRoles.length > 0 ? mainRole : "umpire",
        isDisabled: p?.is_disabled || false,
        lastSignIn: auth?.last_sign_in_at || null,
        createdAt: auth?.created_at || p?.created_at || new Date().toISOString(),
        hasPassword: auth?.has_password || false,
      };
    });

    merged.sort((a, b) => {
      if (a.role === "super_admin" && b.role !== "super_admin") return 1;
      if (b.role === "super_admin" && a.role !== "super_admin") return -1;
      return a.email.localeCompare(b.email);
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const getHistory = (userId: string): SubmissionHistory[] => {
    const userSubs = rawSubmissions.filter((s) => 
      s.umpire_id === userId || s.proxy_submitter_id === userId || s.submitted_by_admin_id === userId
    );

    return userSubs.map((s) => {
      let submissionType: 'self' | 'by_proxy' | 'as_proxy' = 'self';
      let otherPersonEmail: string | null = null;

      if (s.umpire_id === userId) {
        if (s.proxy_submitter_id || s.submitted_by_admin_id) {
          submissionType = 'by_proxy';
          const proxyId = s.submitted_by_admin_id || s.proxy_submitter_id;
          otherPersonEmail = profilesMap[proxyId]?.email || "Unknown";
        }
      } else if (s.proxy_submitter_id === userId || s.submitted_by_admin_id === userId) {
        submissionType = 'as_proxy';
        otherPersonEmail = profilesMap[s.umpire_id]?.email || "Unknown";
      }

      const lines = rawLines
        .filter(l => l.submission_id === s.id)
        .sort((a, b) => b.votes - a.votes)
        .map(l => ({
          votes: l.votes,
          playerName: l.player_name,
          playerNumber: l.player_number
        }));

      return {
        id: s.id,
        roundName: rounds.find(r => r.id === s.round_id)?.name || "—",
        divisionName: divisions.find(d => d.id === s.division_id)?.name || "—",
        homeTeam: teams.find(t => t.id === s.home_team_id)?.name || "—",
        awayTeam: teams.find(t => t.id === s.away_team_id)?.name || "—",
        submittedAt: s.submitted_at,
        submissionType,
        otherPersonEmail,
        voteLines: lines
      };
    });
  };

  const handleEditClick = (e: React.MouseEvent, u: UserRow) => {
    e.stopPropagation();
    if (u.role === "super_admin" && !isSuperAdmin) return;
    setEditUser(u);
    setEditName(u.fullName || "");
    setEditRole(u.role);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    
    // Update name
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: editName.trim() })
      .eq("user_id", editUser.userId);
      
    if (profileErr) {
      toast.error(profileErr.message);
      setSaving(false);
      return;
    }

    // Update role if changed
    if (editRole !== editUser.role) {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update_role", user_id: editUser.userId, role: editRole }
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Failed to update role");
        setSaving(false);
        return;
      }
    }

    toast.success("User updated");
    setEditUser(null);
    setSaving(false);
    fetchAll();
  };

  const handleToggleDisable = async (userId: string, currentlyDisabled: boolean) => {
    setTogglingDisable(userId);
    const action = currentlyDisabled ? "enable_user" : "disable_user";
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: { action, user_id: userId },
    });
    setTogglingDisable(null);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to update user status");
    } else {
      toast.success(currentlyDisabled ? "User unblocked" : "User blocked");
      setEditUser(null);
      fetchAll();
    }
  };

  const handleInvite = async () => {
    if (!addEmail) {
      toast.error("Email is required");
      return;
    }
    setAdding(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: {
        action: "invite_user",
        email: addEmail,
        role: addRole,
        full_name: addName,
      },
    });
    setAdding(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to invite user");
    } else {
      toast.success("Invite sent!");
      setShowAddDialog(false);
      setAddEmail("");
      setAddName("");
      setAddRole("umpire");
      fetchAll();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const isExpanded = expandedUserId === u.userId;
                  const isSA = u.role === "super_admin";

                  return (
                    <React.Fragment key={u.userId}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedUserId(isExpanded ? null : u.userId)}
                      >
                        <TableCell>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          <span className={u.fullName ? "" : "text-muted-foreground italic"}>
                            {u.fullName || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {u.role === "super_admin" && <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Super Admin</Badge>}
                          {u.role === "admin" && <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Admin</Badge>}
                          {u.role === "umpire" && <Badge variant="secondary">Umpire</Badge>}
                          {!["super_admin", "admin", "umpire"].includes(u.role) && <Badge variant="secondary" className="bg-slate-100 text-slate-500">No Role</Badge>}
                        </TableCell>
                        <TableCell>
                          {u.isDisabled ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString("en-AU") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isSA && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => handleEditClick(e, u)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-4 border-b">
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold">Submission History</h4>
                              {(() => {
                                const history = getHistory(u.userId);
                                if (history.length === 0) {
                                  return <p className="text-sm text-muted-foreground">No submissions recorded.</p>;
                                }
                                return (
                                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {history.map(h => (
                                      <Card key={h.id} className="shadow-none border-dashed bg-background/50">
                                        <CardContent className="p-4 space-y-3">
                                          <div className="space-y-1">
                                            <div className="text-xs font-medium text-muted-foreground flex justify-between items-center">
                                              <span>{h.roundName} &middot; {h.divisionName}</span>
                                              <span>{new Date(h.submittedAt).toLocaleDateString("en-AU")}</span>
                                            </div>
                                            <div className="text-sm font-semibold">
                                              {h.homeTeam} vs {h.awayTeam}
                                            </div>
                                            <div className="text-xs text-muted-foreground italic">
                                              {h.submissionType === 'self' && "Self-submitted"}
                                              {h.submissionType === 'by_proxy' && `Submitted on their behalf by ${h.otherPersonEmail}`}
                                              {h.submissionType === 'as_proxy' && `Submitted on behalf of ${h.otherPersonEmail}`}
                                            </div>
                                          </div>
                                          <div className="space-y-1 bg-secondary/50 p-2 rounded-md">
                                            {h.voteLines.map(vl => (
                                              <div key={`${vl.playerName}-${vl.votes}`} className="text-xs flex items-center gap-2">
                                                <span className="font-bold text-primary">{vl.votes}pts:</span>
                                                <span className="truncate">{vl.playerName} #{vl.playerNumber}</span>
                                              </div>
                                            ))}
                                            {h.voteLines.length === 0 && <span className="text-xs text-muted-foreground">No votes recorded</span>}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="User's full name" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole} disabled={editUser?.role === "super_admin"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="umpire">Umpire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleSaveEdit} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>

            <div className="border-t pt-4 mt-4">
              {editUser?.isDisabled ? (
                <Button
                  variant="outline"
                  className="w-full text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                  onClick={() => handleToggleDisable(editUser.userId, true)}
                  disabled={togglingDisable === editUser.userId}
                >
                  Unblock User
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      disabled={togglingDisable === editUser.userId}
                    >
                      Block User
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Block this user?</AlertDialogTitle>
                      <AlertDialogDescription>
                        They will not be able to log in, including via Magic Link. You can unblock them at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleToggleDisable(editUser!.userId, false)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Block
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="umpire">Umpire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={adding} className="w-full">
              {adding ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsers;
