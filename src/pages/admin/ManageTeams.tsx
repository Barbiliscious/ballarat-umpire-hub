import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const ManageTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");

  const fetchTeams = async () => {
    const { data } = await supabase.from("teams").select("*").order("name");
    if (data) setTeams(data);
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleAdd = async () => {
    if (!name) return;
    const { error } = await supabase.from("teams").insert({ name, short_name: shortName || null });
    if (error) toast.error(error.message);
    else { toast.success("Team added"); setOpen(false); setName(""); setShortName(""); fetchTeams(); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("teams").update({ is_active: !current }).eq("id", id);
    fetchTeams();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Team</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Team Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ballarat Sentinels" /></div>
              <div><Label>Short Name</Label><Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="SEN" /></div>
              <Button onClick={handleAdd} className="w-full">Add Team</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Short</TableHead><TableHead>Active</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {teams.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.short_name || "—"}</TableCell>
                <TableCell><Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ManageTeams;
