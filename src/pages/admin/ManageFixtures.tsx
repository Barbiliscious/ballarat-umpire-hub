import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import FixtureImport from "@/components/FixtureImport";

const ManageFixtures = () => {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [roundId, setRoundId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [venue, setVenue] = useState("");

  const [filterRound, setFilterRound] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredFixtures = fixtures.filter(f => {
    if (filterRound !== "all" && f.round_id !== filterRound) return false;
    if (filterDivision !== "all" && f.division_id !== filterDivision) return false;
    if (filterStatus !== "all") {
      const wantsLocked = filterStatus === "locked";
      if (f.is_locked !== wantsLocked) return false;
    }
    return true;
  });

  const fetchAll = async () => {
    const [fx, rn, dv, tm] = await Promise.all([
      supabase.from("fixtures").select("*").order("created_at", { ascending: false }),
      supabase.from("rounds").select("*").order("round_number"),
      supabase.from("divisions").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
    ]);
    if (fx.data) setFixtures(fx.data);
    if (rn.data) setRounds(rn.data);
    if (dv.data) setDivisions(dv.data);
    if (tm.data) setTeams(tm.data);
  };

  useEffect(() => { fetchAll(); }, []);

  const getName = (list: any[], id: string) => list.find((i: any) => i.id === id)?.name || "—";

  const handleAdd = async () => {
    if (!roundId || !divisionId || !homeTeamId || !awayTeamId) return;
    if (homeTeamId === awayTeamId) { toast.error("Teams cannot be the same"); return; }
    const { error } = await supabase.from("fixtures").insert({
      round_id: roundId, division_id: divisionId, home_team_id: homeTeamId, away_team_id: awayTeamId, venue: venue || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Fixture added"); setOpen(false); fetchAll(); }
  };


  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Fixtures</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="mr-1 h-4 w-4" /> Import Excel
          </Button>
          <FixtureImport
            open={showImport}
            onClose={() => setShowImport(false)}
            onImportComplete={fetchAll}
            divisions={divisions}
            teams={teams}
            existingFixtures={fixtures}
            existingRounds={rounds}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Fixture</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Fixture</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Round</Label>
                  <Select value={roundId} onValueChange={setRoundId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Division</Label>
                  <Select value={divisionId} onValueChange={setDivisionId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Home Team</Label>
                  <Select value={homeTeamId} onValueChange={setHomeTeamId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{teams.filter((t: any) => !divisionId || t.division_id === divisionId).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Away Team</Label>
                  <Select value={awayTeamId} onValueChange={setAwayTeamId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{teams.filter((t: any) => (!divisionId || t.division_id === divisionId) && t.id !== homeTeamId).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Venue</Label><Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Optional" /></div>
                <Button onClick={handleAdd} className="w-full">Add Fixture</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filterRound} onValueChange={setFilterRound}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Rounds" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rounds</SelectItem>
            {rounds.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
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
            <TableHead>Round</TableHead><TableHead>Division</TableHead><TableHead>Home</TableHead><TableHead>Away</TableHead><TableHead>Venue</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredFixtures.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{getName(rounds, f.round_id)}</TableCell>
                <TableCell>{getName(divisions, f.division_id)}</TableCell>
                <TableCell className="font-medium">{getName(teams, f.home_team_id)}</TableCell>
                <TableCell className="font-medium">{getName(teams, f.away_team_id)}</TableCell>
                <TableCell>{f.venue || "—"}</TableCell>
                <TableCell><Badge variant={f.is_locked ? "secondary" : "default"} className={!f.is_locked ? "bg-success" : ""}>{f.is_locked ? "Locked" : "Open"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ManageFixtures;
