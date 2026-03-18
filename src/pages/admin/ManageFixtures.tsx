import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const ManageFixtures = () => {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [roundId, setRoundId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [venue, setVenue] = useState("");

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fixtures</h1>
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
                  <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Away Team</Label>
                <Select value={awayTeamId} onValueChange={setAwayTeamId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{teams.filter((t) => t.id !== homeTeamId).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Venue</Label><Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Optional" /></div>
              <Button onClick={handleAdd} className="w-full">Add Fixture</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Round</TableHead><TableHead>Division</TableHead><TableHead>Home</TableHead><TableHead>Away</TableHead><TableHead>Venue</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {fixtures.map((f) => (
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
