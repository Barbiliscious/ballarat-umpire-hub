import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import FixtureImport from "@/components/FixtureImport";

// Sentinel value used to represent "no away team" (BYE).
// shadcn Select does not allow value="" so we use this instead.
const BYE_VALUE = "__bye__";
// Sentinel value used to represent "no venue selected"
const NO_VENUE = "__none__";

type FixtureSortKey = "round" | "division" | "home" | "away" | "venue" | "active" | "status";
type SortDirection = "asc" | "desc";

const ManageFixtures = () => {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [venuePitches, setVenuePitches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Add dialog state
  const [roundId, setRoundId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState(BYE_VALUE);
  const [venue, setVenue] = useState(NO_VENUE);
  const [pitch, setPitch] = useState(NO_VENUE);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editFixture, setEditFixture] = useState<any | null>(null);
  const [editRoundId, setEditRoundId] = useState("");
  const [editDivisionId, setEditDivisionId] = useState("");
  const [editHomeTeamId, setEditHomeTeamId] = useState("");
  const [editAwayTeamId, setEditAwayTeamId] = useState(BYE_VALUE);
  const [editVenue, setEditVenue] = useState(NO_VENUE);
  const [editPitch, setEditPitch] = useState(NO_VENUE);
  const [editMatchDate, setEditMatchDate] = useState("");
  const [editIsLocked, setEditIsLocked] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Filter/sort state
  const [filterRound, setFilterRound] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sortKey, setSortKey] = useState<FixtureSortKey>("round");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchAll = async () => {
    const [fx, rn, dv, tm, vn, vp] = await Promise.all([
      supabase.from("fixtures").select("*").order("created_at", { ascending: false }),
      supabase.from("rounds").select("*").order("round_number"),
      supabase.from("divisions").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("venues").select("*").eq("is_active", true).order("name"),
      supabase.from("venue_pitches").select("*").eq("is_active", true).order("name"),
    ]);
    if (fx.data) setFixtures(fx.data);
    if (rn.data) setRounds(rn.data);
    if (dv.data) setDivisions(dv.data);
    if (tm.data) setTeams(tm.data);
    if (vn.data) setVenues(vn.data);
    if (vp.data) setVenuePitches(vp.data);
  };

  useEffect(() => { fetchAll(); }, []);

  const getName = (list: any[], id: string) => list.find((i: any) => i.id === id)?.name || "—";
  const toSelectValue = (id: string | null | undefined) => id || BYE_VALUE;
  const fromSelectValue = (v: string) => (v && v !== BYE_VALUE) ? v : null;
  // Convert sentinel NO_VENUE to null for saving
  const fromVenueValue = (v: string) => (v && v !== NO_VENUE) ? v : null;
  // Get pitches for a given venue name
  const pitchesForVenue = (venueName: string) => {
    const matchedVenue = venues.find(v => v.name === venueName);
    if (!matchedVenue) return [];
    return venuePitches.filter(p => p.venue_id === matchedVenue.id);
  };

  const toDateTimeInputValue = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const fromDateTimeInputValue = (value: string) => value ? new Date(value).toISOString() : null;

  const handleSort = (key: FixtureSortKey) => {
    if (sortKey === key) {
      setSortDirection(current => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortHeader = (key: FixtureSortKey, label: string) => (
    <button type="button" className="flex items-center gap-1 text-left font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => handleSort(key)}>
      <span>{label}</span>
      {sortKey === key && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
    </button>
  );

  const filteredFixtures = useMemo(() => {
    const filtered = fixtures.filter(f => {
      if (!includeInactive && f.is_active === false) return false;
      if (filterRound !== "all" && f.round_id !== filterRound) return false;
      if (filterDivision !== "all" && f.division_id !== filterDivision) return false;
      if (filterStatus !== "all") {
        const wantsLocked = filterStatus === "locked";
        if (f.is_locked !== wantsLocked) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sortKey === "round") result = getName(rounds, a.round_id).localeCompare(getName(rounds, b.round_id));
      else if (sortKey === "division") result = getName(divisions, a.division_id).localeCompare(getName(divisions, b.division_id));
      else if (sortKey === "home") result = getName(teams, a.home_team_id).localeCompare(getName(teams, b.home_team_id));
      else if (sortKey === "away") result = getName(teams, a.away_team_id).localeCompare(getName(teams, b.away_team_id));
      else if (sortKey === "venue") result = String(a.venue || "").localeCompare(String(b.venue || ""));
      else if (sortKey === "active") result = Number(a.is_active !== false) - Number(b.is_active !== false);
      else if (sortKey === "status") result = Number(Boolean(a.is_locked)) - Number(Boolean(b.is_locked));
      return sortDirection === "asc" ? result : -result;
    });
  }, [divisions, filterDivision, filterRound, filterStatus, fixtures, includeInactive, rounds, sortDirection, sortKey, teams]);

  const handleAdd = async () => {
    if (!roundId || !divisionId || !homeTeamId) return;
    if (awayTeamId && homeTeamId === awayTeamId) { toast.error("Teams cannot be the same"); return; }
    const { error } = await supabase.from("fixtures").insert({
      round_id: roundId,
      division_id: divisionId,
      home_team_id: homeTeamId,
      away_team_id: realAwayId,
      venue: fromVenueValue(venue),
      pitch: fromVenueValue(pitch),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Fixture added");
      setOpen(false);
      setAwayTeamId(BYE_VALUE);
      setVenue(NO_VENUE);
      setPitch(NO_VENUE);
      fetchAll();
    }
  };

  const openEdit = (fixture: any) => {
    setEditFixture(fixture);
    setEditRoundId(fixture.round_id || "");
    setEditDivisionId(fixture.division_id || "");
    setEditHomeTeamId(fixture.home_team_id || "");
    setEditAwayTeamId(toSelectValue(fixture.away_team_id));
    setEditVenue(fixture.venue || NO_VENUE);
    setEditPitch(fixture.pitch || NO_VENUE);
    setEditMatchDate(toDateTimeInputValue(fixture.match_date || null));
    setEditIsLocked(Boolean(fixture.is_locked));
    setEditIsActive(fixture.is_active !== false);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFixture) return;
    if (!editRoundId || !editDivisionId || !editHomeTeamId) {
      toast.error("Round, division, and home team are required");
      return;
    }
    if (editAwayTeamId && editHomeTeamId === editAwayTeamId) {
      toast.error("Teams cannot be the same");
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase.from("fixtures").update({
      round_id: editRoundId,
      division_id: editDivisionId,
      home_team_id: editHomeTeamId,
      away_team_id: realAwayId,
      venue: fromVenueValue(editVenue),
      pitch: fromVenueValue(editPitch),
      match_date: fromDateTimeInputValue(editMatchDate),
      is_locked: editIsLocked,
      is_active: editIsActive,
    }).eq("id", editFixture.id);
    setSavingEdit(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Fixture updated");
    setEditOpen(false);
    setEditFixture(null);
    fetchAll();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Fixtures</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="include-inactive-fixtures" className="text-sm font-medium">Include inactive</Label>
            <Switch id="include-inactive-fixtures" checked={includeInactive} onCheckedChange={setIncludeInactive} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="mr-1 h-4 w-4" /> Import Excel
            </Button>
            <FixtureImport open={showImport} onClose={() => setShowImport(false)} onImportComplete={fetchAll} divisions={divisions} teams={teams} existingFixtures={fixtures} existingRounds={rounds} />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Fixture</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Fixture</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Round</Label>
                    <Select value={roundId} onValueChange={setRoundId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.season})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Division</Label>
                    <Select value={divisionId} onValueChange={setDivisionId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Home Team</Label>
                    <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Away Team <span className="text-muted-foreground text-xs">(leave as BYE if no opponent)</span></Label>
                    <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={BYE_VALUE}>— BYE (no away team) —</SelectItem>
                        {teams.filter((t: any) => t.id !== homeTeamId).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Venue</Label>
                    <Select value={venue} onValueChange={(v) => { setVenue(v); setPitch(NO_VENUE); }}>
                      <SelectTrigger><SelectValue placeholder="Select venue (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_VENUE}>— No venue —</SelectItem>
                        {venues.map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Pitch <span className="text-muted-foreground text-xs">(sub-venue)</span></Label>
                    <Select value={pitch} onValueChange={setPitch} disabled={venue === NO_VENUE}>
                      <SelectTrigger><SelectValue placeholder={venue === NO_VENUE ? "Select venue first" : "Select pitch (optional)"} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_VENUE}>— No pitch —</SelectItem>
                        {pitchesForVenue(venue).map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAdd} className="w-full">Add Fixture</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filterRound} onValueChange={setFilterRound}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Rounds" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rounds</SelectItem>
            {rounds.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.season})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Divisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{renderSortHeader("round", "Round")}</TableHead>
            <TableHead>{renderSortHeader("division", "Division")}</TableHead>
            <TableHead>{renderSortHeader("home", "Home")}</TableHead>
            <TableHead>{renderSortHeader("away", "Away")}</TableHead>
            <TableHead>{renderSortHeader("venue", "Venue")}</TableHead>
            <TableHead>{renderSortHeader("active", "Active")}</TableHead>
            <TableHead>{renderSortHeader("status", "Status")}</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredFixtures.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{getName(rounds, f.round_id)}</TableCell>
                <TableCell>{getName(divisions, f.division_id)}</TableCell>
                <TableCell className="font-medium">{getName(teams, f.home_team_id)}</TableCell>
                <TableCell className="font-medium">{f.away_team_id ? getName(teams, f.away_team_id) : "BYE"}</TableCell>
                <TableCell>{f.venue ? (f.pitch ? `${f.venue} — ${f.pitch}` : f.venue) : "—"}</TableCell>
                <TableCell>
                  <Badge variant={f.is_active === false ? "secondary" : "default"} className={f.is_active === false ? "" : "bg-success"}>
                    {f.is_active === false ? "Inactive" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={f.is_locked ? "secondary" : "default"} className={!f.is_locked ? "bg-success" : ""}>
                    {f.is_locked ? "Locked" : "Open"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Fixture</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Round</Label>
              <Select value={editRoundId} onValueChange={setEditRoundId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.season})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Division</Label>
              <Select value={editDivisionId} onValueChange={setEditDivisionId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Home Team</Label>
              <Select value={editHomeTeamId} onValueChange={setEditHomeTeamId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{teams.filter((t: any) => !editDivisionId || t.division_id === editDivisionId).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Away Team</Label>
              <Select value={editAwayTeamId} onValueChange={setEditAwayTeamId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— BYE (leave blank) —</SelectItem>
                  {teams.filter((t: any) => (!editDivisionId || t.division_id === editDivisionId) && t.id !== editHomeTeamId).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label>Venue</Label><Input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} placeholder="Optional" /></div>
            <div><Label>Match Date & Time</Label><Input type="datetime-local" value={editMatchDate} onChange={(e) => setEditMatchDate(e.target.value)} /></div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label htmlFor="edit-fixture-active">Active</Label>
              <Switch id="edit-fixture-active" checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label htmlFor="edit-fixture-locked">Locked</Label>
              <Switch id="edit-fixture-locked" checked={editIsLocked} onCheckedChange={setEditIsLocked} />
            </div>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full">
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageFixtures;
