import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit } from "lucide-react";
import { toast } from "sonner";

const ManageTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<{id: string, name: string}[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [divisionId, setDivisionId] = useState<string>("none");
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setShortName("");
    setDivisionId("none");
    setEditingId(null);
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from("teams").select("*").order("name");
    if (data) setTeams(data);
  };

  const fetchDivisions = async () => {
    const { data } = await supabase.from("divisions").select("id, name").eq("is_active", true).order("name");
    if (data) setDivisions(data);
  };

  useEffect(() => { fetchTeams(); fetchDivisions(); }, []);

  const handleSave = async () => {
    if (!name) return;
    const finalDivId = divisionId === "none" ? null : divisionId;
    if (editingId) {
      const { error } = await supabase.from("teams").update({ name, short_name: shortName || null, division_id: finalDivId }).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Team updated"); setOpen(false); resetForm(); fetchTeams(); }
    } else {
      const { error } = await supabase.from("teams").insert({ name, short_name: shortName || null, division_id: finalDivId });
      if (error) toast.error(error.message);
      else { toast.success("Team added"); setOpen(false); resetForm(); fetchTeams(); }
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("teams").update({ is_active: !current }).eq("id", id);
    fetchTeams();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Dialog open={open} onOpenChange={(val) => {
          if (!val) resetForm();
          setOpen(val);
        }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Team" : "Add Team"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Team Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ballarat Sentinels" /></div>
              <div className="space-y-2">
                <Label>Short Name</Label>
                <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="SEN" />
                <p className="text-[10px] text-muted-foreground">Use an abbreviation of 3–5 letters, e.g. SEN for Sentinels.</p>
              </div>
              <div className="space-y-2">
                <Label>Division</Label>
                <Select value={divisionId} onValueChange={setDivisionId}>
                  <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No division</SelectItem>
                    {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">{editingId ? "Save Changes" : "Add Team"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Short</TableHead><TableHead>Division</TableHead><TableHead>Active</TableHead><TableHead className="w-[80px]">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {teams.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.short_name || "—"}</TableCell>
                <TableCell>{divisions.find(d => d.id === t.division_id)?.name || "—"}</TableCell>
                <TableCell><Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                    setEditingId(t.id);
                    setName(t.name);
                    setShortName(t.short_name || "");
                    setDivisionId(t.division_id || "none");
                    setOpen(true);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ManageTeams;
