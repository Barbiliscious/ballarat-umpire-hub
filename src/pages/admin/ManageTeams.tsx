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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type TeamSortKey = "name" | "short" | "divisions" | "active";
type SortDirection = "asc" | "desc";

// Auto-generates a short name from a team name
// Single word: first 3 letters → "Blaze" = "BLA"
// Multi-word: first letter of each word → "Blaze Black" = "BBL"
const generateShortName = (teamName: string): string => {
  const words = teamName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join("").substring(0, 4).toUpperCase();
};

const ManageTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  // Maps team_id → array of division_ids from team_divisions table
  const [teamDivisionsMap, setTeamDivisionsMap] = useState<Record<string, string[]>>({});

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [shortNameManual, setShortNameManual] = useState(false);
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sortKey, setSortKey] = useState<TeamSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const resetForm = () => {
    setName("");
    setShortName("");
    setShortNameManual(false);
    setSelectedDivisionIds([]);
    setEditingId(null);
  };

  const fetchData = async () => {
    const [teamsResult, divisionsResult, teamDivisionsResult] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("divisions").select("id, name").eq("is_active", true).order("name"),
      supabase.from("team_divisions").select("team_id, division_id"),
    ]);
    if (teamsResult.data) setTeams(teamsResult.data);
    if (divisionsResult.data) setDivisions(divisionsResult.data);
    if (teamDivisionsResult.data) {
      const map: Record<string, string[]> = {};
      for (const row of teamDivisionsResult.data) {
        if (!map[row.team_id]) map[row.team_id] = [];
        map[row.team_id].push(row.division_id);
      }
      setTeamDivisionsMap(map);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-update short name as user types team name (unless manually overridden)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!shortNameManual) setShortName(generateShortName(val));
  };

  const handleShortNameChange = (val: string) => {
    setShortName(val);
    setShortNameManual(true);
  };

  const toggleDivision = (divId: string) => {
    setSelectedDivisionIds(prev =>
      prev.includes(divId) ? prev.filter(id => id !== divId) : [...prev, divId]
    );
  };

  const handleSave = async () => {
    if (!name) return;

    if (editingId) {
      const { error } = await supabase.from("teams")
        .update({ name, short_name: shortName || null })
        .eq("id", editingId);
      if (error) { toast.error(error.message); return; }

      // Replace this team's division links
      await supabase.from("team_divisions").delete().eq("team_id", editingId);
      if (selectedDivisionIds.length > 0) {
        const rows = selectedDivisionIds.map(division_id => ({ team_id: editingId, division_id }));
        const { error: divErr } = await supabase.from("team_divisions").insert(rows);
        if (divErr) { toast.error(divErr.message); return; }
      }
      toast.success("Team updated");
    } else {
      const { data: newTeam, error } = await supabase.from("teams")
        .insert({ name, short_name: shortName || null })
        .select()
        .single();
      if (error || !newTeam) { toast.error(error?.message || "Failed to add team"); return; }

      if (selectedDivisionIds.length > 0) {
        const rows = selectedDivisionIds.map(division_id => ({ team_id: newTeam.id, division_id }));
        const { error: divErr } = await supabase.from("team_divisions").insert(rows);
        if (divErr) { toast.error(divErr.message); return; }
      }
      toast.success("Team added");
    }

    setOpen(false);
    resetForm();
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("teams").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const getTeamDivisionNames = (teamId: string): string => {
    const divIds = teamDivisionsMap[teamId] || [];
    if (divIds.length === 0) return "—";
    return divIds
      .map(divId => divisions.find(d => d.id === divId)?.name || "")
      .filter(Boolean)
      .sort()
      .join(", ");
  };

  const handleSort = (key: TeamSortKey) => {
    if (sortKey === key) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
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
      {sortKey === key && (sortDirection === "asc"
        ? <ChevronUp className="h-3.5 w-3.5" />
        : <ChevronDown className="h-3.5 w-3.5" />)}
    </button>
  );

  const filteredTeams = useMemo(() => {
    const filtered = teams.filter(t => {
      if (!includeInactive && !t.is_active) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterDivision !== "all") {
        const teamDivIds = teamDivisionsMap[t.id] || [];
        if (!teamDivIds.includes(filterDivision)) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sortKey === "name") result = String(a.name || "").localeCompare(String(b.name || ""));
      else if (sortKey === "short") result = String(a.short_name || "").localeCompare(String(b.short_name || ""));
      else if (sortKey === "divisions") result = getTeamDivisionNames(a.id).localeCompare(getTeamDivisionNames(b.id));
      else if (sortKey === "active") result = Number(Boolean(a.is_active)) - Number(Boolean(b.is_active));
      return sortDirection === "asc" ? result : -result;
    });
  }, [divisions, filterDivision, includeInactive, search, sortDirection, sortKey, teams, teamDivisionsMap]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="include-inactive-teams" className="text-sm font-medium">Include inactive</Label>
            <Switch id="include-inactive-teams" checked={includeInactive} onCheckedChange={setIncludeInactive} />
          </div>
          <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); setOpen(val); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit Team" : "Add Team"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Blaze Black" />
                </div>
                <div className="space-y-2">
                  <Label>Short Name</Label>
                  <Input value={shortName} onChange={(e) => handleShortNameChange(e.target.value)} placeholder="Auto-generated" maxLength={5} />
                  <p className="text-[10px] text-muted-foreground">Auto-generated from team name. Override if needed (3–5 letters).</p>
                </div>
                <div className="space-y-2">
                  <Label>Divisions</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {divisions.map(d => (
                      <div key={d.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`div-${d.id}`}
                          checked={selectedDivisionIds.includes(d.id)}
                          onCheckedChange={() => toggleDivision(d.id)}
                        />
                        <label htmlFor={`div-${d.id}`} className="text-sm cursor-pointer">{d.name}</label>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Select all divisions this team competes in.</p>
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
            <TableHead>{renderSortHeader("name", "Name")}</TableHead>
            <TableHead>{renderSortHeader("short", "Short")}</TableHead>
            <TableHead>{renderSortHeader("divisions", "Divisions")}</TableHead>
            <TableHead>{renderSortHeader("active", "Active")}</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredTeams.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.short_name || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{getTeamDivisionNames(t.id)}</TableCell>
                <TableCell><Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                    setEditingId(t.id);
                    setName(t.name);
                    setShortName(t.short_name || "");
                    setShortNameManual(true);
                    setSelectedDivisionIds(teamDivisionsMap[t.id] || []);
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
