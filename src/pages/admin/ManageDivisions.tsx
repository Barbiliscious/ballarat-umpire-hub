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

const ManageDivisions = () => {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const fetch = async () => {
    const { data } = await supabase.from("divisions").select("*").order("name");
    if (data) setDivisions(data);
  };

  useEffect(() => { fetch(); }, []);

  const handleAdd = async () => {
    if (!name) return;
    const { error } = await supabase.from("divisions").insert({ name });
    if (error) toast.error(error.message);
    else { toast.success("Division added"); setOpen(false); setName(""); fetch(); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("divisions").update({ is_active: !current }).eq("id", id);
    fetch();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Divisions</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Division</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Division</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premier League" /></div>
              <Button onClick={handleAdd} className="w-full">Add Division</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Active</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {divisions.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell><Switch checked={d.is_active} onCheckedChange={() => toggleActive(d.id, d.is_active)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ManageDivisions;
