import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type TeamSortKey = "name" | "short" | "division" | "active";
type SortDirection = "asc" | "desc";

const ManageTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<{id: string, name: string}[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [divisionId, setDivisionId] = useState<string>("none");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sortKey, setSortKey] = useState<TeamSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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

  const getDivisionName = (divisionId: string | null) => divisions.find(d => d.id === divisionId)?.name || "";

  const handleSort = (key: TeamSortKey) => {
    if (sortKey === key) {
      setSortDirection(current => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortHeader = (key: TeamSortKey, label: string) => (
    <button
      type="button"
      className="flex items-center gap-1 text-left font-medium text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => handleSort(key)}
    >
      <span>{label}</span>
      {sortKey === key && (
        sortDirection === "asc"
          ? <ChevronUp className="h-3.5 w-3.5" />
          : <ChevronDown className="h-3.5 w-3.5" />
      )}
    </button>
  );

  const filteredTeams = useMemo(() => {
    const filtered = teams.filter(t => {
      if (!includeInactive && !t.is_active) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterDivision !== "all" && t.division_id !== filterDivision) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sortKey === "name") {
        result = String(a.name || "").localeCompare(String(b.name || ""));
      } else if (sortKey === "short") {
        result = String(a.short_name || "").localeCompare(String(b.short_name || ""));
      } else if (sortKey === "division") {
        result = getDivisionName(a.division_id).localeCompare(getDivisionName(b.division_id));
      } else if (sortKey === "active") {
        result = Number(Boolean(a.is_active)) - Number(Boolean(b.is_active));
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [divisions, filterDivision, includeInactive, search, sortDirection, sortKey, teams]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="include-inactive-teams" className="text-sm font-medium">Include inactive</Label>
            <Switch
              id="include-inactive-teams"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
          </div>
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
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Divisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{renderSortHeader("name", "Name")}</TableHead><TableHead>{renderSortHeader("short", "Short")}</TableHead><TableHead>{renderSortHeader("division", "Division")}</TableHead><TableHead>{renderSortHeader("active", "Active")}</TableHead><TableHead className="w-[80px]">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredTeams.map((t) => (
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
