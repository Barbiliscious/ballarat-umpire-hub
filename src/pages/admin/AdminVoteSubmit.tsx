import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Sentinel value for custom (free-text) round mode
const CUSTOM_ROUND = "__custom__";

interface VoteLine {
  votes: number;
  label: string;
  playerName: string;
  playerNumber: string;
  teamId: string; // stores team ID or free-text team name in custom mode
}

const seniorVotes: VoteLine[] = [
  { votes: 3, label: "Best on Ground", playerName: "", playerNumber: "", teamId: "" },
  { votes: 2, label: "Second Best", playerName: "", playerNumber: "", teamId: "" },
  { votes: 1, label: "Third Best", playerName: "", playerNumber: "", teamId: "" },
];

const juniorVotes: VoteLine[] = [
  { votes: 2, label: "Best Male", playerName: "", playerNumber: "", teamId: "" },
  { votes: 1, label: "2nd Male", playerName: "", playerNumber: "", teamId: "" },
  { votes: 2, label: "Best Female", playerName: "", playerNumber: "", teamId: "" },
  { votes: 1, label: "2nd Female", playerName: "", playerNumber: "", teamId: "" },
];

const AdminVoteSubmit = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string; division_type?: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamDivisions, setTeamDivisions] = useState<{ team_id: string; division_id: string }[]>([]);
  const [fixtures, setFixtures] = useState<{ id: string; home_team_id: string; away_team_id: string }[]>([]);
  const [umpires, setUmpires] = useState<{ user_id: string | null; email: string; full_name: string | null; is_placeholder: boolean }[]>([]);

  const [selectedUmpire, setSelectedUmpire] = useState("");
  const [showAddUmpire, setShowAddUmpire] = useState(false);
  const [newUmpireName, setNewUmpireName] = useState("");
  const [newUmpireEmail, setNewUmpireEmail] = useState("");
  const [addingUmpire, setAddingUmpire] = useState(false);
  const [proxyReason, setProxyReason] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedFixture, setSelectedFixture] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");

  // Custom mode state
  const [customRoundName, setCustomRoundName] = useState("");
  const [customDivision, setCustomDivision] = useState("");
  const [customDivisionType, setCustomDivisionType] = useState<"senior" | "junior">("senior");
  const [customHomeTeam, setCustomHomeTeam] = useState("");
  const [customAwayTeam, setCustomAwayTeam] = useState("");

  const isCustomMode = selectedRound === CUSTOM_ROUND;

  useEffect(() => {
    if (isCustomMode) {
      setVoteLines(JSON.parse(JSON.stringify(
        customDivisionType === "junior" ? juniorVotes : seniorVotes
      )));
    }
  }, [customDivisionType, isCustomMode]);

  const [voteLines, setVoteLines] = useState<VoteLine[]>(JSON.parse(JSON.stringify(seniorVotes)));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Build a map of teamId → divisionId[] using team_divisions table
  const teamDivisionsMap: Record<string, string[]> = {};
  teamDivisions.forEach(td => {
    if (!teamDivisionsMap[td.team_id]) teamDivisionsMap[td.team_id] = [];
    teamDivisionsMap[td.team_id].push(td.division_id);
  });

  useEffect(() => {
    Promise.all([
      supabase.from("rounds").select("id, name").eq("is_active", true).order("round_number"),
      supabase.from("divisions").select("id, name, division_type").eq("is_active", true).order("name"),
      supabase.from("teams").select("id, name").eq("is_active", true).order("name"),
      supabase.from("team_divisions").select("team_id, division_id"),
      supabase.from("profiles")
      .select("user_id, email, full_name, is_placeholder")
      .eq("is_disabled", false)
      .ilike("role", "%umpire%"),
    ]).then(([r, d, t, td, p]) => {
      if (r.data) setRounds(r.data);
      if (d.data) setDivisions(d.data);
      if (t.data) setTeams(t.data);
      if (td.data) setTeamDivisions(td.data);
      if (p.data) setUmpires(p.data);
    });
  }, []);

  useEffect(() => {
    if (selectedRound && selectedDivision && !isCustomMode) {
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
  }, [selectedRound, selectedDivision, isCustomMode]);

  useEffect(() => {
    if (selectedFixture) {
      const f = fixtures.find((fx) => fx.id === selectedFixture);
      if (f) { setHomeTeam(f.home_team_id); setAwayTeam(f.away_team_id); }
    }
  }, [selectedFixture, fixtures]);

  useEffect(() => {
    if (selectedDivision && !isCustomMode) {
      const type = divisions.find(d => d.id === selectedDivision)?.division_type;
      setVoteLines(JSON.parse(JSON.stringify(type === 'junior' ? juniorVotes : seniorVotes)));
    }
  }, [selectedDivision, divisions, isCustomMode]);

  const getTeamName = (id: string) => {
    if (isCustomMode) return id; // in custom mode, teamId holds the text name
    return teams.find((t) => t.id === id)?.name || "";
  };

  const matchTeams = () => {
    if (isCustomMode) {
      // Return pseudo-team objects using text names as IDs
      const result: { id: string; name: string; division_id: string | null }[] = [];
      if (customHomeTeam.trim()) result.push({ id: customHomeTeam.trim(), name: customHomeTeam.trim(), division_id: null });
      if (customAwayTeam.trim()) result.push({ id: customAwayTeam.trim(), name: customAwayTeam.trim(), division_id: null });
      return result;
    }
    if (homeTeam && awayTeam) return teams.filter((t) => t.id === homeTeam || t.id === awayTeam);
    return teams;
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!selectedUmpire) errs.push("Umpire name is required");
    if (!proxyReason.trim()) errs.push("A reason is required when submitting on behalf of an umpire");
    if (!selectedRound) errs.push("Round is required");
    if (isCustomMode) {
      if (!customRoundName.trim()) errs.push("Custom round name is required");
      if (!customDivision.trim()) errs.push("Division name is required");
      if (!customHomeTeam.trim()) errs.push("Home team name is required");
      if (!customAwayTeam.trim()) errs.push("Away team name is required");
      if (customHomeTeam.trim() === customAwayTeam.trim()) errs.push("Teams cannot be the same");
    } else {
      if (!selectedDivision) errs.push("Division is required");
      if (!homeTeam || !awayTeam) errs.push("Both teams are required");
      if (homeTeam === awayTeam) errs.push("Teams cannot be the same");
    }
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

    const adminProfile = umpires.find((u) => u.user_id === user?.id);
    const adminName = adminProfile?.full_name || adminProfile?.email || "Admin";

    let finalFixtureId: string | null = null;

    if (!isCustomMode) {
      finalFixtureId = selectedFixture || null;
      if (!finalFixtureId) {
        const { data: newFixture, error: fxErr } = await supabase
          .from("fixtures")
          .insert({ round_id: selectedRound, division_id: selectedDivision, home_team_id: homeTeam, away_team_id: awayTeam })
          .select("id").single();
        if (fxErr || !newFixture) { toast.error("Failed to create fixture"); setSubmitting(false); return; }
        finalFixtureId = newFixture.id;
      }
    }

    const submissionPayload: Record<string, any> = {
      fixture_id: finalFixtureId,
      umpire_id: null,
      round_id: isCustomMode ? null : selectedRound,
      division_id: isCustomMode ? null : selectedDivision,
      home_team_id: isCustomMode ? null : homeTeam,
      away_team_id: isCustomMode ? null : awayTeam,
      submitted_by_admin_id: user?.id,
      submitted_by_admin_name: adminName,
      proxy_submitter_name: selectedUmpire,
      proxy_reason: proxyReason.trim(),
    };

    if (isCustomMode) {
      submissionPayload.custom_round = customRoundName.trim();
      submissionPayload.custom_division = customDivision.trim();
      submissionPayload.custom_home_team = customHomeTeam.trim();
      submissionPayload.custom_away_team = customAwayTeam.trim();
    }

    const { data: submission, error: subErr } = await supabase
      .from("vote_submissions").insert(submissionPayload).select("id").single();

    if (subErr) { toast.error(subErr.message); setSubmitting(false); return; }

    const lines = voteLines.map((vl) => ({
      submission_id: submission.id,
      votes: vl.votes,
      player_name: vl.playerName.trim(),
      player_number: parseInt(vl.playerNumber.trim()),
      team_id: isCustomMode ? null : vl.teamId,
      custom_team: isCustomMode ? vl.teamId : null,
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

  const resetForm = () => {
    setSubmitted(false);
    setStep(1);
    setVoteLines(JSON.parse(JSON.stringify(seniorVotes)));
    setSelectedFixture("");
    setSelectedUmpire("");
    setShowAddUmpire(false);
    setNewUmpireName("");
    setNewUmpireEmail("");
    setProxyReason("");
    setSelectedRound("");
    setSelectedDivision("");
    setHomeTeam("");
    setAwayTeam("");
    setCustomRoundName("");
    setCustomDivision("");
    setCustomDivisionType("senior");
    setCustomHomeTeam("");
    setCustomAwayTeam("");
  };

  const handleAddUmpire = async () => {
    if (!newUmpireName.trim()) return;
    setAddingUmpire(true);
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        full_name: newUmpireName.trim(),
        email: newUmpireEmail.trim() || null,
        role: "umpire",
        is_placeholder: true,
        is_disabled: false,
      })
      .select("user_id, email, full_name, is_placeholder")
      .single();
    if (error) {
      toast.error("Failed to add umpire: " + error.message);
      setAddingUmpire(false);
      return;
    }
    setUmpires((prev) => [...prev, data]);
    setSelectedUmpire(data.full_name || data.email || "");
    setShowAddUmpire(false);
    setNewUmpireName("");
    setNewUmpireEmail("");
    setAddingUmpire(false);
    toast.success("Umpire added and selected");
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
                <div key={vl.label} className={`flex items-center gap-3 p-2 rounded ${vl.votes === Math.max(...voteLines.map(v => v.votes)) ? 'vote-badge-3' : 'vote-badge-1'}`}>
                  <Badge variant={vl.votes === Math.max(...voteLines.map(v => v.votes)) ? "default" : "secondary"} className={vl.votes === Math.max(...voteLines.map(v => v.votes)) ? "bg-gold text-gold-foreground" : ""}>{vl.votes}</Badge>
                  <div className="flex flex-col">
                    <span className="font-medium">{vl.playerName} <span className="text-muted-foreground font-normal">#{vl.playerNumber}</span></span>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{vl.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">{getTeamName(vl.teamId)}</span>
                </div>
              ))}
            </div>
            <Button onClick={resetForm} className="w-full">Submit another vote</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Submit Vote on Behalf of Umpire</h1>

      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between w-full max-w-[220px] text-xs font-medium text-muted-foreground px-1">
          <span className={step >= 1 ? "text-primary" : ""}>Match Info</span>
          <span className={step >= 2 ? "text-primary text-center" : "text-center"}>Vote</span>
          <span className={step >= 3 ? "text-primary text-right" : "text-right"}>Confirm</span>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0" /> {e}
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Match Information</CardTitle>
            <CardDescription>Select the round, division, and fixture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 space-y-2">
              <Label className="text-amber-700 dark:text-amber-300 font-semibold">Submitting on behalf of umpire</Label>
              <Select
                value={selectedUmpire}
                onValueChange={(v) => {
                  if (v === "__add_new__") {
                    setSelectedUmpire("");
                    setShowAddUmpire(true);
                  } else {
                    setSelectedUmpire(v);
                    setShowAddUmpire(false);
                  }
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select umpire" />
                </SelectTrigger>
                <SelectContent>
                  {umpires.map((u) => (
                    <SelectItem key={u.user_id ?? u.full_name} value={u.full_name || u.email || ""}>
                      {u.full_name || u.email}
                      {u.is_placeholder && <span className="ml-2 text-xs text-muted-foreground">(placeholder)</span>}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add_new__">＋ Add new umpire...</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <Label className="text-amber-700 dark:text-amber-300">Reason for submitting on behalf</Label>
                <Textarea
                  placeholder="e.g. Umpire is travelling and asked me to submit"
                  value={proxyReason}
                  onChange={(e) => setProxyReason(e.target.value)}
                  rows={2}
                  className="bg-background"
                />
              </div>

              {showAddUmpire && (
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <Input
                    placeholder="Full name (required)"
                    value={newUmpireName}
                    onChange={(e) => setNewUmpireName(e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    placeholder="Email (optional)"
                    value={newUmpireEmail}
                    onChange={(e) => setNewUmpireEmail(e.target.value)}
                    className="bg-background"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddUmpire} disabled={!newUmpireName.trim() || addingUmpire}>
                      {addingUmpire ? "Adding..." : "Add & Select"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddUmpire(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-amber-600 dark:text-amber-400">This vote will be flagged as admin-submitted</p>
            </div>

            <div className="space-y-2">
              <Label>Round</Label>
              <Select value={selectedRound} onValueChange={(v) => {
                setSelectedRound(v);
                setSelectedDivision("");
                setSelectedFixture("");
                setHomeTeam(""); setAwayTeam("");
                setCustomRoundName(""); setCustomDivision(""); setCustomHomeTeam(""); setCustomAwayTeam("");
              }}>
                <SelectTrigger><SelectValue placeholder="Select round" /></SelectTrigger>
                <SelectContent>
                  {rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  <SelectItem value={CUSTOM_ROUND}>— Custom (free text) —</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isCustomMode ? (
              <>
                <div className="space-y-2">
                  <Label>Custom Round Name</Label>
                  <Input placeholder="e.g. Round 6, Finals, Friendly" value={customRoundName} onChange={(e) => setCustomRoundName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Division</Label>
                  <Input placeholder="e.g. Division 1 Open" value={customDivision} onChange={(e) => setCustomDivision(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Match Type</Label>
                  <Select
                    value={customDivisionType}
                    onValueChange={(v) => setCustomDivisionType(v as "senior" | "junior")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select match type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="senior">Senior (3 votes)</SelectItem>
                      <SelectItem value="junior">Junior (4 votes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Home Team</Label>
                  <Input placeholder="Home team name" value={customHomeTeam} onChange={(e) => setCustomHomeTeam(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Away Team</Label>
                  <Input placeholder="Away team name" value={customAwayTeam} onChange={(e) => setCustomAwayTeam(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Division</Label>
                  <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                    <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                    <SelectContent>{divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {selectedRound && selectedDivision && !manualMode && fixtures.length > 0 && (
                  <div className="space-y-2">
                    <Label>Fixture</Label>
                    <Select value={selectedFixture} onValueChange={setSelectedFixture}>
                      <SelectTrigger><SelectValue placeholder="Select fixture" /></SelectTrigger>
                      <SelectContent>
                        {fixtures.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{teams.find(t => t.id === f.home_team_id)?.name} vs {teams.find(t => t.id === f.away_team_id)?.name}</SelectItem>
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
                        <SelectContent>{teams.filter((t) => (teamDivisionsMap[t.id] || []).includes(selectedDivision)).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Away Team</Label>
                      <Select value={awayTeam} onValueChange={setAwayTeam}>
                        <SelectTrigger><SelectValue placeholder="Select away team" /></SelectTrigger>
                        <SelectContent>{teams.filter((t) => (teamDivisionsMap[t.id] || []).includes(selectedDivision) && t.id !== homeTeam).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}

            <Button className="w-full"
              disabled={
                !selectedUmpire || !selectedRound ||
                (isCustomMode ? (!customRoundName.trim() || !customDivision.trim() || !customHomeTeam.trim() || !customAwayTeam.trim()) :
                (!selectedDivision || (!selectedFixture && !manualMode) || (manualMode && (!homeTeam || !awayTeam))))
              }
              onClick={() => setStep(2)}>
              Next: Player Votes
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Player Votes</CardTitle>
            <CardDescription>
              {isCustomMode ? `${customHomeTeam} vs ${customAwayTeam}` : `${getTeamName(homeTeam)} vs ${getTeamName(awayTeam)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {voteLines.map((vl, idx) => (
              <div key={idx} className={`space-y-3 p-4 rounded-lg ${vl.votes === Math.max(...voteLines.map(v => v.votes)) ? "vote-badge-3" : "vote-badge-1"}`}>
                <div className="flex items-center gap-2">
                  <Badge variant={vl.votes === Math.max(...voteLines.map(v => v.votes)) ? "default" : "secondary"} className={vl.votes === Math.max(...voteLines.map(v => v.votes)) ? "bg-gold text-gold-foreground text-base px-3" : "text-base px-3"}>{vl.votes}</Badge>
                  <span className="font-semibold">{vl.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Player Name</Label>
                    <Input placeholder="Player name" value={vl.playerName} onChange={(e) => updateVoteLine(idx, "playerName", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Number</Label>
                    <Input type="number" min="0" max="99" placeholder="#" value={vl.playerNumber} onChange={(e) => updateVoteLine(idx, "playerNumber", e.target.value)} inputMode="numeric" />
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
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={() => {
                const hasEmpty = voteLines.some(vl => !vl.playerName.trim() || !vl.playerNumber.trim() || !vl.teamId);
                if (hasEmpty) { toast.error("Please fill in all player details before continuing."); return; }
                setErrors([]); setStep(3);
              }} className="flex-1">Next: Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Confirm Your Votes</CardTitle>
            <CardDescription>
              {isCustomMode ? `${customRoundName} — ${customDivision} — ${customHomeTeam} vs ${customAwayTeam}` : `${getTeamName(homeTeam)} vs ${getTeamName(awayTeam)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Submitting on behalf of: {selectedUmpire}</p>
              {isCustomMode && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Custom match — not linked to a scheduled fixture</p>}
              {!isCustomMode && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">This vote will be flagged as admin-submitted</p>}
            </div>
            <div className="space-y-2">
              {voteLines.map((vl, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${vl.votes === Math.max(...voteLines.map(v => v.votes)) ? "vote-badge-3" : "vote-badge-1"}`}>
                  <Badge variant={vl.votes === Math.max(...voteLines.map(v => v.votes)) ? "default" : "secondary"} className={vl.votes === Math.max(...voteLines.map(v => v.votes)) ? "bg-gold text-gold-foreground" : ""}>{vl.votes}</Badge>
                  <div className="flex flex-col">
                    <span className="font-medium">{vl.playerName} <span className="text-muted-foreground ml-1">#{vl.playerNumber}</span></span>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{vl.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">{getTeamName(vl.teamId)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">{submitting ? "Submitting..." : "Submit Votes"}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminVoteSubmit;
