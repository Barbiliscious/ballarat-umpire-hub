import { useEffect, useState, useRef } from "react";
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

const ManageFixtures = () => {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [roundId, setRoundId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [venue, setVenue] = useState("");
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvErrors([]);
    setCsvImporting(true);

    const text = await file.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    // Skip header if it looks like one
    let startIdx = 0;
    if (lines.length > 0 && lines[0].toLowerCase().includes("round_name")) {
      startIdx = 1;
    }

    const errors: string[] = [];
    const toInsert: { round_id: string; division_id: string; home_team_id: string; away_team_id: string; venue: string | null }[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length < 4) {
        errors.push(`Row ${i + 1}: Not enough columns (need at least 4)`);
        continue;
      }
      const [roundName, divName, homeName, awayName, venueVal] = parts;

      const round = rounds.find((r) => r.name.toLowerCase() === roundName.toLowerCase());
      if (!round) { errors.push(`Row ${i + 1}: Round "${roundName}" not found`); continue; }

      const div = divisions.find((d) => d.name.toLowerCase() === divName.toLowerCase());
      if (!div) { errors.push(`Row ${i + 1}: Division "${divName}" not found`); continue; }

      const home = teams.find((t) => t.name.toLowerCase() === homeName.toLowerCase());
      if (!home) { errors.push(`Row ${i + 1}: Home team "${homeName}" not found`); continue; }

      const away = teams.find((t) => t.name.toLowerCase() === awayName.toLowerCase());
      if (!away) { errors.push(`Row ${i + 1}: Away team "${awayName}" not found`); continue; }

      if (home.id === away.id) { errors.push(`Row ${i + 1}: Home and away teams are the same`); continue; }

      toInsert.push({
        round_id: round.id,
        division_id: div.id,
        home_team_id: home.id,
        away_team_id: away.id,
        venue: venueVal?.trim() || null,
      });
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from("fixtures").insert(toInsert);
      if (error) {
        errors.push(`Database error: ${error.message}`);
      }
    }

    setCsvErrors(errors);
    setCsvImporting(false);

    const imported = toInsert.length;
    const skipped = (lines.length - startIdx) - imported;
    toast.success(`${imported} fixtures imported, ${skipped} rows skipped.`);

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (errors.length === 0) {
      setCsvOpen(false);
    }
    fetchAll();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Fixtures</h1>
        <div className="flex gap-2">
          <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Upload className="mr-1 h-4 w-4" /> Import CSV</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Fixtures from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with the following format:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-md text-xs font-mono">
                  round_name,division_name,home_team_name,away_team_name,venue<br />
                  Round 1,Premier,Ballarat Red,Ballarat White,Victoria Park
                </div>
                <p className="text-sm text-muted-foreground">
                  Names must match existing rounds, divisions, and teams (case-insensitive). Venue is optional.
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvImport}
                  disabled={csvImporting}
                />
                {csvErrors.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 max-h-40 overflow-auto space-y-1">
                    {csvErrors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
