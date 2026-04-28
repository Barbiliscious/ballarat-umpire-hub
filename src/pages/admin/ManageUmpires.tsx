import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Check, X } from "lucide-react";

interface UmpireProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  has_password: boolean;
}

const ManageUmpires = () => {
  const [umpires, setUmpires] = useState<UmpireProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [search, setSearch] = useState("");

  const fetchUmpires = async () => {
    setLoading(true);

    const [{ data: subs }, { data: roles }] = await Promise.all([
      supabase.from("vote_submissions").select("umpire_id").eq("is_deleted", false),
      supabase.from("user_roles").select("user_id").eq("role", "umpire"),
    ]);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const allIds = new Set<string>();

    if (subs) {
      subs.forEach((s) => {
        if (s.umpire_id && uuidRegex.test(s.umpire_id)) allIds.add(s.umpire_id);
      });
    }

    if (roles) {
      roles.forEach((r) => {
        if (r.user_id && uuidRegex.test(r.user_id)) allIds.add(r.user_id);
      });
    }

    const uniqueIds = Array.from(allIds);

    if (uniqueIds.length === 0) {
      setUmpires([]);
      setLoading(false);
      return;
    }

    const [{ data: authDetails }, { data: profiles }] = await Promise.all([
      supabase.rpc("get_umpire_auth_details" as any, { user_ids: uniqueIds }),
      supabase.from("profiles").select("*").in("user_id", uniqueIds),
    ]);

    const mergedUmpires: UmpireProfile[] = uniqueIds.map((uid) => {
      const p = profiles?.find((prof) => prof.user_id === uid);
      const auth = (authDetails as any[] || []).find((a) => a.id === uid);

      return {
        id: p?.id || uid,
        user_id: uid,
        full_name: p?.full_name || null,
        email: auth?.email || p?.email || "No email",
        created_at: auth?.created_at || p?.created_at || new Date().toISOString(),
        last_sign_in_at: auth?.last_sign_in_at || null,
        has_password: auth?.has_password || false,
      };
    });

    mergedUmpires.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setUmpires(mergedUmpires);
    setLoading(false);
  };

  useEffect(() => {
    fetchUmpires();
  }, []);

  const handleAddUmpire = async () => {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    setAdding(true);
    const generatedUserId = crypto.randomUUID();
    const { error } = await supabase.from("profiles").insert({
      user_id: generatedUserId,
      email: `umpire-${generatedUserId.slice(0, 8)}@placeholder.local`,
      full_name: newName.trim(),
      role: "umpire",
    });
    if (error) {
      toast.error(error.message);
    } else {
      // Also add umpire role
      await supabase.from("user_roles").insert({
        user_id: generatedUserId,
        role: "umpire" as const,
      });
      toast.success("Umpire added");
      setNewName("");
      setShowAdd(false);
      fetchUmpires();
    }
    setAdding(false);
  };

  const handleSaveEdit = async (profile: UmpireProfile) => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName.trim() })
      .eq("id", profile.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Name updated");
      setEditingId(null);
      fetchUmpires();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Umpires</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Umpire
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Search umpires..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Umpire List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : umpires.length === 0 ? (
            <p className="text-muted-foreground text-sm">No umpires found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>First Login</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {umpires.filter(u => {
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return (u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
                }).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {editingId === u.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 w-40"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(u);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(u)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className={u.full_name ? "" : "text-muted-foreground italic"}>
                          {u.full_name || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.email.includes("@placeholder.local") || u.email === "No email" ? (
                        <span className="text-muted-foreground italic">No email</span>
                      ) : (
                        u.email
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-AU") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("en-AU") : "—"}
                    </TableCell>
                    <TableCell>
                      {u.has_password ? (
                        <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Password</Badge>
                      ) : (
                        <Badge variant="secondary">Magic Link</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(u.id);
                          setEditName(u.full_name || "");
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Umpire (Name Only)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter umpire name"
                onKeyDown={(e) => e.key === "Enter" && handleAddUmpire()}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This creates an umpire profile without an email account. Useful for admin-submitted votes on behalf of an umpire.
            </p>
            <Button onClick={handleAddUmpire} disabled={adding} className="w-full">
              {adding ? "Adding..." : "Add Umpire"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUmpires;
