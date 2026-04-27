import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Trophy, Calendar, Clock, CheckCircle } from "lucide-react";

interface PendingSubmission {
  id: string;
  submitted_at: string;
  round_id: string;
  division_id: string;
  umpire_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ submissions: 0, pending: 0, approved: 0, umpires: 0, teams: 0, rounds: 0 });
  const [pendingSubs, setPendingSubs] = useState<PendingSubmission[]>([]);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string | null; email: string }[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("vote_submissions").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      supabase.from("vote_submissions").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("is_approved", false),
      supabase.from("vote_submissions").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("is_approved", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("rounds").select("id", { count: "exact", head: true }),
      supabase.from("vote_submissions").select("id, submitted_at, round_id, division_id, umpire_id").eq("is_deleted", false).eq("is_approved", false).order("submitted_at", { ascending: false }).limit(10),
      supabase.from("rounds").select("id, name"),
      supabase.from("divisions").select("id, name"),
      supabase.from("profiles").select("user_id, full_name, email"),
    ]).then(([subs, pending, approved, umps, teams, rounds, pendingList, roundsList, divsList, profilesList]) => {
      setStats({
        submissions: subs.count || 0,
        pending: pending.count || 0,
        approved: approved.count || 0,
        umpires: umps.count || 0,
        teams: teams.count || 0,
        rounds: rounds.count || 0,
      });
      if (pendingList.data) setPendingSubs(pendingList.data as PendingSubmission[]);
      if (roundsList.data) setRounds(roundsList.data);
      if (divsList.data) setDivisions(divsList.data);
      if (profilesList.data) setProfiles(profilesList.data);
    });
  }, []);

  const getName = (list: { id: string; name: string }[], id: string) => list.find((i) => i.id === id)?.name || "—";
  const getUmpire = (uid: string) => {
    const p = profiles.find((pr) => pr.user_id === uid);
    return p?.full_name || p?.email || uid.slice(0, 8);
  };

  const cards = [
    { label: "Total Submissions", value: stats.submissions, icon: FileText, color: "text-primary" },
    { label: "Pending Approval", value: stats.pending, icon: Clock, color: "text-amber-500" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-success" },
    { label: "Registered Umpires", value: stats.umpires, icon: Users, color: "text-primary" },
    { label: "Teams", value: stats.teams, icon: Trophy, color: "text-primary" },
    { label: "Rounds", value: stats.rounds, icon: Calendar, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Pending Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Submissions Needing Approval</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSubs.length === 0 ? (
            <div className="flex items-center gap-2 text-success py-4">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">All submissions are approved — nothing pending.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingSubs.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <Badge variant="secondary">{getName(rounds, s.round_id)}</Badge>
                    <span className="text-sm font-medium">{getName(divisions, s.division_id)}</span>
                    <span className="text-sm text-muted-foreground">{getUmpire(s.umpire_id)}</span>
                    <span className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString("en-AU")}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin/submissions")}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
