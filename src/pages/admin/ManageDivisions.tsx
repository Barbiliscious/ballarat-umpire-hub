import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type DivisionSortKey = "name" | "type" | "active";
type SortDirection = "asc" | "desc";

const ManageDivisions = () => {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [divisionTeamsMap, setDivisionTeamsMap] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [divisionType, setDivisionType] = useState("senior");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sortKey, setSortKey] = useState<DivisionSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const resetForm = () => {
    setName("");
    setDivisionType("senior");
    setEditingId(null);
  };

  const fetch = async () => {
    const { data } = await supabase.from("divisions").select("*").order("name");
    if (data) setDivisions(data);
    const { data: teamData } = await supabase.from("teams").select("id, name").order("name");
    if (teamData) setTeams(teamData);
    const { data: tdData } = await supabase.from("team_divisions").select("team_id, division_id");
    if (tdData) {
      const map: Record<string, string[]> = {};
      for (const row of tdData) {
        if (!map[row.division_id]) map[row.division_id] = [];
        map[row.division_id].push(row.team_id);
      }
      setDivisionTeamsMap(map);
    }
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

  const handleSort = (key: DivisionSortKey) => {
    if (sortKey === key) {
      setSortDirection(current => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortHeader = (key: DivisionSortKey, label: string) => (
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

  const filteredDivisions = useMemo(() => {
    const filtered = divisions.filter(d => {
      if (!includeInactive && !d.is_active) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && (d.division_type || "senior") !== filterType) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sortKey === "name") {
        result = String(a.name || "").localeCompare(String(b.name || ""));
      } else if (sortKey === "type") {
        result = String(a.division_type || "senior").localeCompare(String(b.division_type || "senior"));
      } else if (sortKey === "active") {
        result = Number(Boolean(a.is_active)) - Number(Boolean(b.is_active));
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [divisions, filterType, includeInactive, search, sortDirection, sortKey]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Divisions</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="include-inactive-divisions" className="text-sm font-medium">Include inactive</Label>
            <Switch
              id="include-inactive-divisions"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
          </div>
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
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Search divisions..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{renderSortHeader("name", "Name")}</TableHead><TableHead>{renderSortHeader("type", "Type")}</TableHead><TableHead>{renderSortHeader("active", "Active")}</TableHead><TableHead className="w-[80px]">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredDivisions.map((d) => (
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
                        {teams.filter(t => (divisionTeamsMap[d.id] || []).includes(t.id)).length > 0 ? (
                          <div className="flex flex-col gap-1.5 ml-[26px]">
                            {teams.filter(t => (divisionTeamsMap[d.id] || []).includes(t.id)).map(t => (
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
