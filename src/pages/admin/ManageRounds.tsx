import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type RoundSortKey = "roundNumber" | "name" | "season" | "active";
type SortDirection = "asc" | "desc";

const ManageRounds = () => {
  const [rounds, setRounds] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [roundNumber, setRoundNumber] = useState("");
  const [season, setSeason] = useState("2026");

  // Filtering
  const [searchName, setSearchName] = useState("");
  const [filterSeason, setFilterSeason] = useState("all");
  const [filterRound, setFilterRound] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sortKey, setSortKey] = useState<RoundSortKey>("roundNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Expandable row state
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editRound, setEditRound] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoundNumber, setEditRoundNumber] = useState("");
  const [editSeason, setEditSeason] = useState("");

  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({});

  const fetch = async () => {
    const { data: roundData } = await supabase.from("rounds").select("*").order("round_number");
    if (roundData) setRounds(roundData);

    const { data: fixtureData } = await supabase.from("fixtures")
      .select(`
        id, round_id, match_date, venue, pitch, is_bye,
        home_team_id, away_team_id, division_id,
        divisions(name)
      `)
      .eq("is_deleted", false);
    if (fixtureData) setFixtures(fixtureData);

    const { data: teamsData } = await supabase.from("teams").select("id, name");
    if (teamsData) {
      const map: Record<string, string> = {};
      teamsData.forEach(t => { map[t.id] = t.name; });
      setTeamsMap(map);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleAdd = async () => {
    if (!name || !roundNumber) return;
    const { error } = await supabase.from("rounds").insert({ name, round_number: parseInt(roundNumber), season });
    if (error) toast.error(error.message);
    else { toast.success("Round added"); setOpen(false); setName(""); setRoundNumber(""); fetch(); }
  };

  const handleEdit = async () => {
    if (!editRound || !editName || !editRoundNumber) return;
    const { error } = await supabase.from("rounds").update({
      name: editName.trim(),
      round_number: parseInt(editRoundNumber),
      season: editSeason.trim()
    }).eq("id", editRound.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Round updated");
      setEditOpen(false);
      fetch();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("rounds").update({ is_active: !current }).eq("id", id);
    fetch();
  };

  const seasons = useMemo(() => {
    const uniqueSeasons = new Set(rounds.map(r => r.season).filter(Boolean));
    return Array.from(uniqueSeasons).sort((a, b) => String(b).localeCompare(String(a)));
  }, [rounds]);

  const filteredRounds = useMemo(() => {
    const filtered = rounds.filter(r => {
      if (!includeInactive && !r.is_active) return false;
      const matchSearch = searchName === "" || (r.name ?? '').toLowerCase().includes(searchName.toLowerCase());
      const matchSeason = filterSeason === "all" || String(r.season ?? '') === filterSeason;
      const matchRound = filterRound === "" || String(r.round_number ?? '') === filterRound;
      return matchSearch && matchSeason && matchRound;
    });

    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sortKey === "roundNumber") {
        result = Number(a.round_number || 0) - Number(b.round_number || 0);
      } else if (sortKey === "name") {
        result = String(a.name || "").localeCompare(String(b.name || ""));
      } else if (sortKey === "season") {
        result = String(a.season || "").localeCompare(String(b.season || ""));
      } else if (sortKey === "active") {
        result = Number(Boolean(a.is_active)) - Number(Boolean(b.is_active));
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [includeInactive, rounds, searchName, filterSeason, filterRound, sortDirection, sortKey]);

  const handleSort = (key: RoundSortKey) => {
    if (sortKey === key) {
      setSortDirection(current => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortHeader = (key: RoundSortKey, label: string) => (
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

  const openEdit = (r: any) => {
    setEditRound(r);
    setEditName(r.name);
    setEditRoundNumber(r.round_number.toString());
    setEditSeason(r.season);
    setEditOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedRoundId(prev => prev === id ? null : id);
  };

  const renderExpandedContent = (roundId: string) => {
    const roundFixtures = fixtures.filter(f => f.round_id === roundId);
    if (roundFixtures.length === 0) {
      return <div className="text-muted-foreground p-4 text-center text-sm">No fixtures scheduled for this round yet.</div>;
    }

    const byDivision = roundFixtures.reduce((acc, f) => {
      const divName = f.divisions?.name || "Unknown Division";
      if (!acc[divName]) acc[divName] = [];
      acc[divName].push(f);
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <div className="p-4 bg-muted/20 border-t">
        <h4 className="font-semibold mb-3 text-sm">Fixtures</h4>
        <div className="space-y-4">
          {Object.entries(byDivision).map(([divName, divFixtures]) => (
            <div key={divName}>
              <div className="text-xs font-semibold mb-1.5 uppercase text-muted-foreground tracking-wider">{divName}</div>
              <ul className="space-y-1 text-sm text-foreground pl-3 border-l-2 border-muted-foreground/30">
                {divFixtures.map(f => {
                  const homeName = teamsMap[f.home_team_id] || "Unknown";
                  const awayName = f.is_bye ? "BYE" : (teamsMap[f.away_team_id] || "Unknown");
                  const dateStr = f.match_date ? new Date(f.match_date).toLocaleString("en-AU", {
                    dateStyle: "medium", timeStyle: "short"
                  }) : "No Date";
                  return (
                    <li key={f.id} className="flex gap-2">
                      <span className="font-medium">{homeName} vs {awayName}</span>
                      <span className="text-muted-foreground">&middot;</span>
                      <span className="text-muted-foreground">{f.venue || "No Venue"}</span>
                      <span className="text-muted-foreground">&middot;</span>
                      <span className="text-muted-foreground">{dateStr}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rounds</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="include-inactive-rounds" className="text-sm font-medium">Include inactive</Label>
            <Switch
              id="include-inactive-rounds"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
          </div>
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
      </div>

      <div className="flex gap-3 bg-muted/40 p-3 rounded-lg flex-wrap">
        <Input 
          placeholder="Search by name..." 
          value={searchName} 
          onChange={e => setSearchName(e.target.value)}
          className="max-w-[250px]"
        />
        <Input 
          type="number" 
          placeholder="Round #" 
          value={filterRound} 
          onChange={e => setFilterRound(e.target.value)}
          className="max-w-[120px]"
        />
        <Select value={filterSeason} onValueChange={setFilterSeason}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Seasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>{renderSortHeader("roundNumber", "#")}</TableHead>
            <TableHead>{renderSortHeader("name", "Name")}</TableHead>
            <TableHead>{renderSortHeader("season", "Season")}</TableHead>
            <TableHead>{renderSortHeader("active", "Active")}</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredRounds.map((r) => (
              <React.Fragment key={r.id}>
                <TableRow 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('.switch-area')) return;
                    toggleExpand(r.id);
                  }}
                >
                  <TableCell>
                    {expandedRoundId === r.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell>{r.round_number}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.season}</TableCell>
                  <TableCell className="switch-area" onClick={e => e.stopPropagation()}>
                    <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedRoundId === r.id && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0 border-b-0">
                      {renderExpandedContent(r.id)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Round</DialogTitle>
          </DialogHeader>
          {editRound && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Round Number</Label>
                <Input value={editRoundNumber} onChange={(e) => setEditRoundNumber(e.target.value)} type="number" />
              </div>
              <div className="space-y-2">
                <Label>Season</Label>
                <Input value={editSeason} onChange={(e) => setEditSeason(e.target.value)} />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>Active Status</Label>
                <Switch 
                  checked={editRound.is_active} 
                  onCheckedChange={() => {
                    toggleActive(editRound.id, editRound.is_active);
                    setEditRound({ ...editRound, is_active: !editRound.is_active });
                  }} 
                />
              </div>
              <Button onClick={handleEdit} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageRounds;
