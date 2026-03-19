import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface VoteLine {
  votes: number;
  playerName: string;
  playerNumber: string;
  teamId: string;
}

const emptyVotes: VoteLine[] = [
  { votes: 3, playerName: "", playerNumber: "", teamId: "" },
  { votes: 2, playerName: "", playerNumber: "", teamId: "" },
  { votes: 1, playerName: "", playerNumber: "", teamId: "" },
];

const AdminVoteSubmit = () => {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [fixtures, setFixtures] = useState<{ id: string; home_team_id: string; away_team_id: string }[]>([]);
  const [umpires, setUmpires] = useState<{ user_id: string; email: string; full_name: string | null }[]>([]);

  const [selectedUmpire, setSelectedUmpire] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedFixture, setSelectedFixture] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [voteLines, setVoteLines] = useState<VoteLine[]>(JSON.parse(JSON.stringify(emptyVotes)));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("rounds").select("id, name").eq("is_active", true).order("round_number"),
      supabase.from("divisions").select("id, name").eq("is_active", true).order("name"),
      supabase.from("teams").select("id, name").eq("is_active", true).order("name"),
      supabase.from("profiles").select("user_id, email, full_name"),
    ]).then(([r, d, t, p]) => {
      if (r.data) setRounds(r.data);
      if (d.data) setDivisions(d.data);
      if (t.data) setTeams(t.data);
      if (p.data) setUmpires(p.data);
    });
  }, []);

  useEffect(() => {
    if (selectedRound && selectedDivision) {
      supabase
        .from("fixtures")
        .select("id, home_team_id, away_team_id")
        .eq("round_id", selectedRound)
        .eq("division_id", selectedDivision)
        .eq("is_locked", false)
        .then(({ data }) => {
          if (data) setFixtures(data);
          setManualMode(!data || data.length === 0);
        });
    }
  }, [selectedRound, selectedDivision]);

  useEffect(() => {
    if (selectedFixture) {
      const f = fixtures.find((fx) => fx.id === selectedFixture);
      if (f) { setHomeTeam(f.home_team_id); setAwayTeam(f.away_team_id); }
    }
  }, [selectedFixture, fixtures]);

  const getTeamName = (id: string) => teams.find((t) => t.id === id)?.name || "";

  const matchTeams = () => {
    if (homeTeam && awayTeam) return teams.filter((t) => t.id === homeTeam || t.id === awayTeam);
    return teams;
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!selectedUmpire) errs.push("Umpire is required");
    if (!selectedRound) errs.push("Round is required");
    if (!selectedDivision) errs.push("Division is required");
    if (!homeTeam || !awayTeam) errs.push("Both teams are required");
    if (homeTeam === awayTeam) errs.push("Teams cannot be the same");
    const names = new Set<string>();
    voteLines.forEach((vl) => {
      if (!vl.playerName.trim()) errs.push(`Player name for ${vl.votes}-vote is required`);
      if (!vl.playerNumber.trim()) errs.push(`Player number for ${vl.votes}-vote is required`);
      if (vl.playerNumber && !/^\d+$/.test(vl.playerNumber.trim())) errs.push(`Player number for ${vl.votes}-vote must be numeric`);
      if (!vl.teamId) errs.push(`Team for ${vl.votes}-vote is required`);
      const key = `${vl.playerName.trim().toLowerCase()}-${vl.playerNumber.trim()}-${vl.teamId}`;
      if (names.has(key)) errs.push("Same player cannot appear twice");
      names.add(key);
    });
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setSubmitting(true);

    // Get admin profile for name
    const adminProfile = umpires.find((u) => u.user_id === user?.id);
    const adminName = adminProfile?.full_name || adminProfile?.email || "Admin";

    let finalFixtureId = selectedFixture || null;
    if (!finalFixtureId) {
      const { data: newFixture, error: fxErr } = await supabase
        .from("fixtures")
        .insert({ round_id: selectedRound, division_id: selectedDivision, home_team_id: homeTeam, away_team_id: awayTeam })
        .select("id")
        .single();
      if (fxErr || !newFixture) { toast.error("Failed to create fixture"); setSubmitting(false); return; }
      finalFixtureId = newFixture.id;
    }

    const { data: submission, error: subErr } = await supabase
      .from("vote_submissions")
      .insert({
        fixture_id: finalFixtureId,
        umpire_id: selectedUmpire,
        round_id: selectedRound,
        division_id: selectedDivision,
        home_team_id: homeTeam,
        away_team_id: awayTeam,
        submitted_by_admin_id: user?.id,
        submitted_by_admin_name: adminName,
      })
      .select("id")
      .single();

    if (subErr) { toast.error(subErr.message); setSubmitting(false); return; }

    const lines = voteLines.map((vl) => ({
      submission_id: submission.id,
      votes: vl.votes,
      player_name: vl.playerName.trim(),
      player_number: parseInt(vl.playerNumber.trim()),
      team_id: vl.teamId,
    }));

    const { error: linesErr } = await supabase.from("vote_lines").insert(lines);
    if (linesErr) { toast.error("Failed to save vote lines"); setSubmitting(false); return; }

    setSubmitting(false);
    setSubmitted(true);
    toast.success("Vote submitted on behalf of umpire");
  };

  const updateVoteLine = (index: number, field: keyof VoteLine, value: string) => {
    setVoteLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <Card className="text-center border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
            <h2 className="text-2xl font-bold">Vote Submitted</h2>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Submitted by admin on behalf of umpire</p>
            <div className="space-y-2 text-left bg-background p-4 rounded-lg">
              {voteLines.map((vl) => (
                <div key={vl.votes} className={`flex items-center gap-3 p-2 rounded ${vl.votes === 3 ? 'vote-badge-3' : vl.votes === 2 ? 'vote-badge-2' : 'vote-badge-1'}`}>
                  <Badge variant={vl.votes === 3 ? "default" : "secondary"} className={vl.votes === 3 ? "bg-gold text-gold-foreground" : ""}>{vl.votes}</Badge>
                  <span className="font-medium">{vl.playerName}</span>
                  <span className="text-muted-foreground">#{vl.playerNumber}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{getTeamName(vl.teamId)}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => { setSubmitted(false); setVoteLines(JSON.parse(JSON.stringify(emptyVotes))); setSelectedFixture(""); setSelectedUmpire(""); }} className="w-full">
              Submit another vote
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Submit Vote on Behalf of Umpire</h1>

      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0" /> {e}
            </div>
          ))}
        </div>
      )}

      <Card className="border-amber-300">
        <CardHeader>
          <CardTitle>Umpire Selection</CardTitle>
          <CardDescription className="text-amber-600 dark:text-amber-400">This vote will be flagged as admin-submitted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Umpire</Label>
            <Select value={selectedUmpire} onValueChange={setSelectedUmpire}>
              <SelectTrigger><SelectValue placeholder="Select umpire" /></SelectTrigger>
              <SelectContent>
                {umpires.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Round</Label>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger><SelectValue placeholder="Select round" /></SelectTrigger>
              <SelectContent>
                {rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Division</Label>
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
              <SelectContent>
                {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedRound && selectedDivision && !manualMode && fixtures.length > 0 && (
            <div className="space-y-2">
              <Label>Fixture</Label>
              <Select value={selectedFixture} onValueChange={setSelectedFixture}>
                <SelectTrigger><SelectValue placeholder="Select fixture" /></SelectTrigger>
                <SelectContent>
                  {fixtures.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {getTeamName(f.home_team_id)} vs {getTeamName(f.away_team_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedRound && selectedDivision && manualMode && (
            <>
              <p className="text-sm text-muted-foreground">No fixtures found. Select teams manually.</p>
              <div className="space-y-2">
                <Label>Home Team</Label>
                <Select value={homeTeam} onValueChange={setHomeTeam}>
                  <SelectTrigger><SelectValue placeholder="Select home team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Away Team</Label>
                <Select value={awayTeam} onValueChange={setAwayTeam}>
                  <SelectTrigger><SelectValue placeholder="Select away team" /></SelectTrigger>
                  <SelectContent>
                    {teams.filter((t) => t.id !== homeTeam).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Player Votes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {voteLines.map((vl, idx) => (
            <div key={vl.votes} className={`space-y-3 p-4 rounded-lg ${vl.votes === 3 ? "vote-badge-3" : vl.votes === 2 ? "vote-badge-2" : "vote-badge-1"}`}>
              <div className="flex items-center gap-2">
                <Badge variant={vl.votes === 3 ? "default" : "secondary"} className={vl.votes === 3 ? "bg-gold text-gold-foreground text-base px-3" : "text-base px-3"}>
                  {vl.votes}
                </Badge>
                <span className="font-semibold">
                  {vl.votes === 3 ? "Best on Ground" : vl.votes === 2 ? "Second Best" : "Third Best"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Player Name</Label>
                  <Input placeholder="Player name" value={vl.playerName} onChange={(e) => updateVoteLine(idx, "playerName", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Number</Label>
                  <Input placeholder="#" value={vl.playerNumber} onChange={(e) => updateVoteLine(idx, "playerNumber", e.target.value)} inputMode="numeric" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Team</Label>
                <Select value={vl.teamId} onValueChange={(v) => updateVoteLine(idx, "teamId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {matchTeams().map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Submitting..." : "Submit Vote on Behalf of Umpire"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVoteSubmit;
