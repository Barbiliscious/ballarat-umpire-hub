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

const ManageRounds = () => {
  const [rounds, setRounds] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [roundNumber, setRoundNumber] = useState("");
  const [season, setSeason] = useState("2025");

  const fetch = async () => {
    const { data } = await supabase.from("rounds").select("*").order("round_number");
    if (data) setRounds(data);
  };

  useEffect(() => { fetch(); }, []);

  const handleAdd = async () => {
    if (!name || !roundNumber) return;
    const { error } = await supabase.from("rounds").insert({ name, round_number: parseInt(roundNumber), season });
    if (error) toast.error(error.message);
    else { toast.success("Round added"); setOpen(false); setName(""); setRoundNumber(""); fetch(); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("rounds").update({ is_active: !current }).eq("id", id);
    fetch();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rounds</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Round</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Round</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Round 1" /></div>
              <div><Label>Round Number</Label><Input value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)} type="number" /></div>
              <div><Label>Season</Label><Input value={season} onChange={(e) => setSeason(e.target.value)} /></div>
              <Button onClick={handleAdd} className="w-full">Add Round</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Season</TableHead><TableHead>Active</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rounds.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.round_number}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.season}</TableCell>
                <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ManageRounds;
