import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Check, X } from "lucide-react";

interface UmpireProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  first_login: string | null;
  last_login: string | null;
  created_at: string;
}

const ManageUmpires = () => {
  const [umpires, setUmpires] = useState<UmpireProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchUmpires = async () => {
    setLoading(true);
    // Get all user_ids with umpire role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "umpire");

    if (!roles || roles.length === 0) {
      setUmpires([]);
      setLoading(false);
      return;
    }

    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    setUmpires(profiles || []);
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
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {umpires.map((u) => (
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
                          {u.full_name || "No name"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.email.includes("@placeholder.local") ? (
                        <span className="text-muted-foreground italic">No email</span>
                      ) : (
                        u.email
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.first_login ? new Date(u.first_login).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : "—"}
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
