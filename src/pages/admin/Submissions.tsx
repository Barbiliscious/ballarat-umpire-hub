import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Download, Lock, Unlock, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: string;
  fixture_id: string;
  umpire_id: string;
  round_id: string;
  division_id: string;
  home_team_id: string;
  away_team_id: string;
  is_locked: boolean;
  submitted_at: string;
}

interface VoteLine {
  id: string;
  submission_id: string;
  votes: number;
  player_name: string;
  player_number: number;
  team_id: string;
}

const Submissions = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [voteLines, setVoteLines] = useState<VoteLine[]>([]);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; email: string; full_name: string | null }[]>([]);
  const [filterRound, setFilterRound] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [search, setSearch] = useState("");
  const [editSub, setEditSub] = useState<Submission | null>(null);
  const [editLines, setEditLines] = useState<VoteLine[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [subsRes, linesRes, roundsRes, divsRes, teamsRes, profilesRes] = await Promise.all([
      supabase.from("vote_submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("vote_lines").select("*"),
      supabase.from("rounds").select("id, name").order("round_number"),
      supabase.from("divisions").select("id, name").order("name"),
      supabase.from("teams").select("id, name").order("name"),
      supabase.from("profiles").select("user_id, email, full_name"),
    ]);
    if (subsRes.data) setSubmissions(subsRes.data);
    if (linesRes.data) setVoteLines(linesRes.data);
    if (roundsRes.data) setRounds(roundsRes.data);
    if (divsRes.data) setDivisions(divsRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
  };

  useEffect(() => { fetchAll(); }, []);

  const getName = (list: { id: string; name: string }[], id: string) => list.find((i) => i.id === id)?.name || "—";
  const getUmpire = (uid: string) => {
    const p = profiles.find((pr) => pr.user_id === uid);
    return p?.full_name || p?.email || uid.slice(0, 8);
  };

  const filtered = submissions.filter((s) => {
    if (filterRound !== "all" && s.round_id !== filterRound) return false;
    if (filterDivision !== "all" && s.division_id !== filterDivision) return false;
    if (search) {
      const q = search.toLowerCase();
      const umpire = getUmpire(s.umpire_id).toLowerCase();
      const homeTeam = getName(teams, s.home_team_id).toLowerCase();
      const awayTeam = getName(teams, s.away_team_id).toLowerCase();
      if (!umpire.includes(q) && !homeTeam.includes(q) && !awayTeam.includes(q)) return false;
    }
    return true;
  });

  const toggleLock = async (sub: Submission) => {
    const { error } = await supabase
      .from("vote_submissions")
      .update({ is_locked: !sub.is_locked })
      .eq("id", sub.id);
    if (error) toast.error(error.message);
    else {
      toast.success(sub.is_locked ? "Submission reopened" : "Submission locked");
      fetchAll();
    }
  };

  const openEdit = (sub: Submission) => {
    setEditSub(sub);
    setEditLines(voteLines.filter((vl) => vl.submission_id === sub.id).sort((a, b) => b.votes - a.votes));
  };

  const updateEditLine = (idx: number, field: string, value: string) => {
    setEditLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === "player_number" ? parseInt(value) || 0 : value };
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editSub) return;
    setSaving(true);
    for (const line of editLines) {
      await supabase
        .from("vote_lines")
        .update({ player_name: line.player_name, player_number: line.player_number, team_id: line.team_id })
        .eq("id", line.id);
    }
    setSaving(false);
    toast.success("Submission updated");
    setEditSub(null);
    fetchAll();
  };

  const exportCsv = () => {
    const rows = [["Round", "Division", "Umpire", "Home Team", "Away Team", "Votes", "Player", "Number", "Team", "Submitted"]];
    filtered.forEach((s) => {
      const lines = voteLines.filter((vl) => vl.submission_id === s.id);
      lines.forEach((vl) => {
        rows.push([
          getName(rounds, s.round_id),
          getName(divisions, s.division_id),
          getUmpire(s.umpire_id),
          getName(teams, s.home_team_id),
          getName(teams, s.away_team_id),
          String(vl.votes),
          vl.player_name,
          String(vl.player_number),
          getName(teams, vl.team_id),
          new Date(s.submitted_at).toLocaleDateString(),
        ]);
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vote-submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search umpire or team..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterRound} onValueChange={setFilterRound}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Rounds" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rounds</SelectItem>
            {rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Divisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Umpire</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No submissions found</TableCell></TableRow>
              )}
              {filtered.map((s) => {
                const lines = voteLines.filter((vl) => vl.submission_id === s.id).sort((a, b) => b.votes - a.votes);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{getName(rounds, s.round_id)}</TableCell>
                    <TableCell>{getName(divisions, s.division_id)}</TableCell>
                    <TableCell>{getUmpire(s.umpire_id)}</TableCell>
                    <TableCell className="text-sm">
                      {getName(teams, s.home_team_id)} vs {getName(teams, s.away_team_id)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {lines.map((vl) => (
                          <div key={vl.id} className="text-xs">
                            <span className="font-semibold">{vl.votes}:</span> {vl.player_name} #{vl.player_number}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_locked ? "secondary" : "default"} className={s.is_locked ? "" : "bg-success"}>
                        {s.is_locked ? "Locked" : "Open"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleLock(s)} title={s.is_locked ? "Reopen" : "Lock"}>
                          {s.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editSub} onOpenChange={(open) => !open && setEditSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editLines.map((line, idx) => (
              <div key={line.id} className={`space-y-2 p-3 rounded-lg ${line.votes === 3 ? "vote-badge-3" : line.votes === 2 ? "vote-badge-2" : "vote-badge-1"}`}>
                <div className="flex items-center gap-2">
                  <Badge className={line.votes === 3 ? "bg-gold text-gold-foreground" : ""}>{line.votes} votes</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Player Name</Label>
                    <Input value={line.player_name} onChange={(e) => updateEditLine(idx, "player_name", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Number</Label>
                    <Input value={String(line.player_number)} onChange={(e) => updateEditLine(idx, "player_number", e.target.value)} inputMode="numeric" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Team</Label>
                  <Select value={line.team_id} onValueChange={(v) => updateEditLine(idx, "team_id", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button onClick={saveEdit} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submissions;
