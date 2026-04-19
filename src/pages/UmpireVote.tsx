import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, CheckCircle2, AlertCircle, User } from "lucide-react";
import { toast } from "sonner";

interface Round { id: string; name: string; round_number: number; }
interface Division { id: string; name: string; }
interface Team { id: string; name: string; short_name: string | null; division_id: string | null; }
interface Fixture { id: string; home_team_id: string; away_team_id: string; venue: string | null; match_date: string | null; }
interface UmpireProfile { user_id: string; full_name: string | null; email: string; }

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

const UmpireVote = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

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

  // Name prompt state
  const [profileLoading, setProfileLoading] = useState(true);
  const [needsName, setNeedsName] = useState(false);
  const [umpireName, setUmpireName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [myFullName, setMyFullName] = useState("");

  // Proxy state
  const [isProxy, setIsProxy] = useState(false);
  const [proxyUmpireId, setProxyUmpireId] = useState("");
  const [proxyReason, setProxyReason] = useState("");
  const [umpireProfiles, setUmpireProfiles] = useState<UmpireProfile[]>([]);
  const [selectedProxyName, setSelectedProxyName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/umpire/login");
  }, [user, authLoading, navigate]);

  // Check profile for name & load own name
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data?.full_name) {
          setNeedsName(true);
        } else {
          setMyFullName(data.full_name);
        }
        setProfileLoading(false);
      });
  }, [user]);

  // Load umpire profiles for proxy dropdown
  useEffect(() => {
    if (!user || !isProxy) return;
    supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("role", "umpire")
      .neq("user_id", user.id)
      .then(({ data }) => {
        if (data) setUmpireProfiles(data);
      });
  }, [user, isProxy]);

  const handleSaveName = async () => {
    if (!umpireName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: umpireName.trim() })
      .eq("user_id", user!.id);
    setSavingName(false);
    if (error) {
      toast.error(error.message);
    } else {
      setNeedsName(false);
      setMyFullName(umpireName.trim());
      toast.success("Name saved!");
    }
  };

  useEffect(() => {
    supabase.from("rounds").select("*").eq("is_active", true).order("round_number").then(({ data }) => {
      if (data) setRounds(data);
    });
    supabase.from("divisions").select("*").eq("is_active", true).order("name").then(({ data }) => {
      if (data) setDivisions(data);
    });
    supabase.from("teams").select("*").eq("is_active", true).order("name").then(({ data }) => {
      if (data) setTeams(data);
    });
  }, []);

  useEffect(() => {
    if (selectedRound && selectedDivision) {
      supabase
        .from("fixtures")
        .select("*")
        .eq("round_id", selectedRound)
        .eq("division_id", selectedDivision)
        .eq("is_locked", false)
        .then(({ data }) => {
          if (data) setFixtures(data);
          if (!data || data.length === 0) setManualMode(true);
          else setManualMode(false);
        });
    }
  }, [selectedRound, selectedDivision]);

  useEffect(() => {
    if (selectedFixture) {
      const f = fixtures.find((fx) => fx.id === selectedFixture);
      if (f) {
        setHomeTeam(f.home_team_id);
        setAwayTeam(f.away_team_id);
      }
    }
  }, [selectedFixture, fixtures]);

  const getTeamName = (id: string) => teams.find((t) => t.id === id)?.name || "";

  const matchTeams = () => {
    if (homeTeam && awayTeam) {
      return teams.filter((t) => t.id === homeTeam || t.id === awayTeam);
    }
    return teams;
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!selectedRound) errs.push("Round is required");
    if (!selectedDivision) errs.push("Division is required");
    if (!homeTeam || !awayTeam) errs.push("Both home and away teams are required");
    if (homeTeam === awayTeam) errs.push("Home and away teams cannot be the same");

    // Match date validation
    const fixture = fixtures.find((f) => f.id === selectedFixture);
    if (fixture?.match_date) {
      const matchDate = new Date(fixture.match_date);
      if (matchDate > new Date()) {
        errs.push("Votes cannot be submitted before the match date");
      }
    }

    // Proxy validation
    if (isProxy) {
      if (!proxyUmpireId) errs.push("You must select the umpire you are submitting for");
      if (!proxyReason.trim()) errs.push("A reason is required when submitting on behalf of another umpire");
    }

    const names = new Set<string>();
    voteLines.forEach((vl) => {
      if (!vl.playerName.trim()) errs.push(`Player name for ${vl.votes}-vote is required`);
      if (!vl.playerNumber.trim()) errs.push(`Player number for ${vl.votes}-vote is required`);
      if (vl.playerNumber && !/^\d+$/.test(vl.playerNumber.trim()))
        errs.push(`Player number for ${vl.votes}-vote must be numeric`);
      if (!vl.teamId) errs.push(`Team for ${vl.votes}-vote is required`);
      const key = `${vl.playerName.trim().toLowerCase()}-${vl.playerNumber.trim()}-${vl.teamId}`;
      if (names.has(key)) errs.push("Same player cannot appear twice");
      names.add(key);
    });
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSubmitting(true);

    const fixtureId = selectedFixture || null;

    let finalFixtureId = fixtureId;
    if (!finalFixtureId) {
      const { data: newFixture, error: fxErr } = await supabase
        .from("fixtures")
        .insert({
          round_id: selectedRound,
          division_id: selectedDivision,
          home_team_id: homeTeam,
          away_team_id: awayTeam,
        })
        .select("id")
        .single();
      if (fxErr || !newFixture) {
        toast.error("Failed to create fixture");
        setSubmitting(false);
        return;
      }
      finalFixtureId = newFixture.id;
    }

    const submissionData: any = {
      fixture_id: finalFixtureId,
      umpire_id: isProxy ? proxyUmpireId : user!.id,
      round_id: selectedRound,
      division_id: selectedDivision,
      home_team_id: homeTeam,
      away_team_id: awayTeam,
    };

    if (isProxy) {
      submissionData.proxy_submitter_id = user!.id;
      submissionData.proxy_submitter_name = myFullName || user!.email;
      submissionData.proxy_reason = proxyReason.trim();
    }

    const { data: submission, error: subErr } = await supabase
      .from("vote_submissions")
      .insert(submissionData)
      .select("id")
      .single();

    if (subErr) {
      if (subErr.message.includes("duplicate")) {
        toast.error("Votes have already been submitted for this match");
      } else {
        toast.error(subErr.message);
      }
      setSubmitting(false);
      return;
    }

    const lines = voteLines.map((vl) => ({
      submission_id: submission.id,
      votes: vl.votes,
      player_name: vl.playerName.trim(),
      player_number: parseInt(vl.playerNumber.trim()),
      team_id: vl.teamId,
    }));

    const { error: linesErr } = await supabase.from("vote_lines").insert(lines);

    if (linesErr) {
      toast.error("Failed to save vote lines");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSubmitted(true);
    toast.success("Votes submitted successfully!");
  };

  const updateVoteLine = (index: number, field: keyof VoteLine, value: string) => {
    setVoteLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  if (authLoading || profileLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  // First-time name prompt
  if (needsName) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col">
        <header className="border-b bg-primary">
          <div className="container flex h-14 items-center justify-between">
            <span className="text-sm font-medium text-primary-foreground">Umpire Portal</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-accent">
              <LogOut className="mr-1 h-4 w-4" /> Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Welcome!</CardTitle>
              <CardDescription>Please enter your name to continue. This will be remembered for future sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Full Name</Label>
                <Input
                  value={umpireName}
                  onChange={(e) => setUmpireName(e.target.value)}
                  placeholder="Enter your name"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                />
              </div>
              <Button onClick={handleSaveName} disabled={savingName} className="w-full">
                {savingName ? "Saving..." : "Continue"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col">
        <header className="border-b bg-primary">
          <div className="container flex h-14 items-center justify-between">
            <span className="text-sm font-medium text-primary-foreground">Umpire Portal</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-accent">
              <LogOut className="mr-1 h-4 w-4" /> Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center animate-fade-in">
            <CardContent className="pt-8 pb-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
              <h2 className="text-2xl font-bold">Votes Submitted</h2>
              {isProxy && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">Vote submitted on behalf of {selectedProxyName}</p>
                  <p className="italic mt-1">{proxyReason}</p>
                </div>
              )}
              <div className="space-y-2 text-left bg-secondary p-4 rounded-lg">
                {voteLines.map((vl) => (
                  <div key={vl.votes} className={`flex items-center gap-3 p-2 rounded ${vl.votes === 3 ? 'vote-badge-3' : vl.votes === 2 ? 'vote-badge-2' : 'vote-badge-1'}`}>
                    <Badge variant={vl.votes === 3 ? "default" : "secondary"} className={vl.votes === 3 ? "bg-gold text-gold-foreground" : ""}>
                      {vl.votes}
                    </Badge>
                    <span className="font-medium">{vl.playerName}</span>
                    <span className="text-muted-foreground">#{vl.playerNumber}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{getTeamName(vl.teamId)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Button onClick={() => { setSubmitted(false); setStep(1); setVoteLines(JSON.parse(JSON.stringify(emptyVotes))); setSelectedFixture(""); setIsProxy(false); setProxyUmpireId(""); setProxyReason(""); }} className="w-full">
                  Submit another vote
                </Button>
                <Button variant="outline" onClick={() => navigate("/umpire/history")} className="w-full">
                  View my submission history
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="border-b bg-primary">
        <div className="container flex h-14 items-center justify-between">
          <span className="text-sm font-medium text-primary-foreground">Umpire Portal</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/umpire/history")} className="text-primary-foreground hover:bg-accent text-xs">
              History
            </Button>
            <span className="text-xs text-primary-foreground/70">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-accent">
              <LogOut className="mr-1 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-lg py-8 space-y-6">
        {/* Steps indicator */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {s}
                </div>
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

        {/* Step 1: Match Info */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Match Information</CardTitle>
              <CardDescription>Select the round, division, and fixture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Proxy toggle */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/50">
                <Checkbox
                  id="proxy-toggle"
                  checked={isProxy}
                  onCheckedChange={(checked) => {
                    setIsProxy(!!checked);
                    if (!checked) {
                      setProxyUmpireId("");
                      setProxyReason("");
                    }
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="proxy-toggle" className="text-sm font-medium cursor-pointer">
                    I am submitting this vote on behalf of another umpire
                  </Label>
                  {isProxy && (
                    <p className="text-xs text-muted-foreground">
                      The vote will be recorded under the selected umpire's name
                    </p>
                  )}
                </div>
              </div>

              {isProxy && (
                <>
                  <div className="space-y-2">
                    <Label>Select umpire you are submitting for</Label>
                    <Input 
                      list="umpire-suggestions" 
                      placeholder="Type or select umpire name"
                      value={selectedProxyName}
                      onChange={(e) => {
                        setSelectedProxyName(e.target.value);
                        const profile = umpireProfiles.find((p) => (p.full_name || p.email) === e.target.value);
                        if (profile) {
                          setProxyUmpireId(profile.user_id);
                        } else {
                          setProxyUmpireId("");
                        }
                      }}
                    />
                    <datalist id="umpire-suggestions">
                      {umpireProfiles.map((p) => (
                        <option key={p.user_id} value={p.full_name || p.email || ""} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason for submitting on behalf *</Label>
                    <Textarea
                      value={proxyReason}
                      onChange={(e) => setProxyReason(e.target.value)}
                      placeholder="e.g. Umpire is travelling and asked me to submit"
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Round</Label>
                <Select value={selectedRound} onValueChange={setSelectedRound}>
                  <SelectTrigger><SelectValue placeholder="Select round" /></SelectTrigger>
                  <SelectContent>
                    {rounds.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Division</Label>
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
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
                        {teams.filter((t) => t.division_id === selectedDivision).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Away Team</Label>
                    <Select value={awayTeam} onValueChange={setAwayTeam}>
                      <SelectTrigger><SelectValue placeholder="Select away team" /></SelectTrigger>
                      <SelectContent>
                        {teams.filter((t) => t.division_id === selectedDivision && t.id !== homeTeam).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button
                className="w-full"
                disabled={!selectedRound || !selectedDivision || (!selectedFixture && !manualMode) || (manualMode && (!homeTeam || !awayTeam))}
                onClick={() => setStep(2)}
              >
                Next: Player Votes
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Votes */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Player Votes</CardTitle>
              <CardDescription>
                {getTeamName(homeTeam)} vs {getTeamName(awayTeam)}
              </CardDescription>
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
                      <Input
                        placeholder="Player name"
                        value={vl.playerName}
                        onChange={(e) => updateVoteLine(idx, "playerName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Number</Label>
                      <Input
                        placeholder="#"
                        value={vl.playerNumber}
                        onChange={(e) => updateVoteLine(idx, "playerNumber", e.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Team</Label>
                    <Select value={vl.teamId} onValueChange={(v) => updateVoteLine(idx, "teamId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                      <SelectContent>
                        {matchTeams().map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => { setErrors([]); setStep(3); }} className="flex-1">
                  Next: Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Confirm Your Votes</CardTitle>
              <CardDescription>
                {getTeamName(homeTeam)} vs {getTeamName(awayTeam)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProxy && (
                <div className="p-3 rounded-lg border border-purple-300 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Submitting on behalf of: {selectedProxyName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">{proxyReason}</p>
                </div>
              )}
              <div className="space-y-2">
                {voteLines.map((vl) => (
                  <div key={vl.votes} className={`flex items-center gap-3 p-3 rounded-lg ${vl.votes === 3 ? "vote-badge-3" : vl.votes === 2 ? "vote-badge-2" : "vote-badge-1"}`}>
                    <Badge variant={vl.votes === 3 ? "default" : "secondary"} className={vl.votes === 3 ? "bg-gold text-gold-foreground" : ""}>
                      {vl.votes}
                    </Badge>
                    <div>
                      <span className="font-medium">{vl.playerName}</span>
                      <span className="text-muted-foreground ml-2">#{vl.playerNumber}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">{getTeamName(vl.teamId)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? "Submitting..." : "Submit Votes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default UmpireVote;
