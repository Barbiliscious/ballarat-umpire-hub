import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const ManageDivisions = () => {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [divisionType, setDivisionType] = useState("senior");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setDivisionType("senior");
    setEditingId(null);
  };

  const fetch = async () => {
    const { data } = await supabase.from("divisions").select("*").order("name");
    if (data) setDivisions(data);
    const { data: teamData } = await supabase.from("teams").select("id, name, division_id").order("name");
    if (teamData) setTeams(teamData);
  };

  useEffect(() => { fetch(); }, []);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't expand when clicking buttons/switches
    setExpandedDivision(prev => prev === id ? null : id);
  };

  const handleSave = async () => {
    if (!name || !divisionType) return;
    if (editingId) {
      const { error } = await supabase.from("divisions").update({ name, division_type: divisionType }).eq("id", editingId);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Division updated");
        setOpen(false);
        resetForm();
        fetch();
      }
    } else {
      const { error } = await supabase.from("divisions").insert({ name, division_type: divisionType, is_active: true });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Division added");
        setOpen(false);
        resetForm();
        fetch();
      }
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("divisions").update({ is_active: !current }).eq("id", id);
    fetch();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Divisions</h1>
        <Dialog open={open} onOpenChange={(val) => {
          if (!val) resetForm();
          setOpen(val);
        }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Division</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Division" : "Add Division"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premier League" /></div>
              <div className="space-y-2">
                <Label>Division Type</Label>
                <Select value={divisionType} onValueChange={setDivisionType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">{editingId ? "Save Changes" : "Add Division"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Active</TableHead><TableHead className="w-[80px]">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {divisions.map((d) => (
              <Fragment key={d.id}>
                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={(e) => toggleExpand(d.id, e)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {expandedDivision === d.id ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      {d.name}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{d.division_type || "senior"}</TableCell>
                  <TableCell><Switch checked={d.is_active} onCheckedChange={() => toggleActive(d.id, d.is_active)} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                      setEditingId(d.id);
                      setName(d.name);
                      setDivisionType(d.division_type || "senior");
                      setOpen(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedDivision === d.id && (
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableCell colSpan={4} className="p-0 border-b-0">
                      <div className="bg-muted/30 p-3 pt-2 text-sm shadow-inner overflow-hidden">
                        {teams.filter(t => t.division_id === d.id).length > 0 ? (
                          <div className="flex flex-col gap-1.5 ml-[26px]">
                            {teams.filter(t => t.division_id === d.id).map(t => (
                              <div key={t.id} className="text-muted-foreground flex items-center before:content-[''] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-muted-foreground/30 before:mr-3">
                                {t.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-muted-foreground italic ml-[26px] py-1 text-xs">No teams assigned</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ManageDivisions;
