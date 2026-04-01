import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";

interface Submission {
  id: string;
  round_id: string;
  division_id: string;
  home_team_id: string;
  away_team_id: string;
  submitted_at: string;
  is_approved: boolean;
  proxy_submitter_name: string | null;
  proxy_reason: string | null;
}

interface VoteLine {
  id: string;
  submission_id: string;
  votes: number;
  player_name: string;
  player_number: number;
  team_id: string;
}

const UmpireHistory = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [voteLines, setVoteLines] = useState<VoteLine[]>([]);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) navigate("/umpire/login");
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("vote_submissions").select("id, round_id, division_id, home_team_id, away_team_id, submitted_at, is_approved, proxy_submitter_name, proxy_reason").eq("umpire_id", user.id).eq("is_deleted", false).order("submitted_at", { ascending: false }),
      supabase.from("vote_lines").select("*"),
      supabase.from("rounds").select("id, name"),
      supabase.from("divisions").select("id, name"),
      supabase.from("teams").select("id, name"),
    ]).then(([subsRes, linesRes, roundsRes, divsRes, teamsRes]) => {
      if (subsRes.data) setSubmissions(subsRes.data as Submission[]);
      if (linesRes.data) setVoteLines(linesRes.data);
      if (roundsRes.data) setRounds(roundsRes.data);
      if (divsRes.data) setDivisions(divsRes.data);
      if (teamsRes.data) setTeams(teamsRes.data);
      setLoading(false);
    });
  }, [user]);

  const getName = (list: { id: string; name: string }[], id: string) => list.find((i) => i.id === id)?.name || "—";

  if (isLoading || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="border-b bg-primary">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/umpire/vote")} className="text-primary-foreground hover:bg-accent">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Vote
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-accent">
            <LogOut className="mr-1 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl py-8 space-y-6">
        <h1 className="text-2xl font-bold">My Submission History</h1>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              You haven't submitted any votes yet.
            </CardContent>
          </Card>
        ) : (
          submissions.map((s) => {
            const lines = voteLines.filter((vl) => vl.submission_id === s.id).sort((a, b) => b.votes - a.votes);
            return (
              <Card key={s.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">
                      {getName(rounds, s.round_id)} — {getName(divisions, s.division_id)}
                    </CardTitle>
                    <Badge variant={s.is_approved ? "default" : "secondary"} className={s.is_approved ? "bg-success" : "bg-amber-500 text-white"}>
                      {s.is_approved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getName(teams, s.home_team_id)} vs {getName(teams, s.away_team_id)} — {new Date(s.submitted_at).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {lines.map((vl) => (
                      <div key={vl.id} className="flex items-center gap-3 text-sm">
                        <Badge variant={vl.votes === 3 ? "default" : "secondary"} className={vl.votes === 3 ? "bg-gold text-gold-foreground" : ""}>
                          {vl.votes}
                        </Badge>
                        <span className="font-medium">{vl.player_name}</span>
                        <span className="text-muted-foreground">#{vl.player_number}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{getName(teams, vl.team_id)}</span>
                      </div>
                    ))}
                  </div>
                  {s.proxy_submitter_name && (
                    <p className="text-sm text-muted-foreground italic mt-3">
                      Submitted on your behalf by {s.proxy_submitter_name} — Reason: {s.proxy_reason}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
};

export default UmpireHistory;
