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
  round_id: string | null;
  division_id: string | null;
  umpire_id: string;
  custom_round: string | null;
  custom_division: string | null;
  proxy_umpire_name: string | null;
  proxy_submitter_name: string | null;
  submitted_by_admin_id: string | null;
  submitted_by_admin_name: string | null;
  proxy_submitter_id: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ submissions: 0, pending: 0, approved: 0, umpires: 0, teams: 0, rounds: 0 });
  const [pendingSubs, setPendingSubs] = useState<PendingSubmission[]>([]);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { email: string; full_name: string | null }>>({});

  useEffect(() => {
    const load = async () => {
      const [subs, pending, approved, umps, teams, rounds, pendingList, roundsList, divsList] =
        await Promise.all([
          supabase.from("vote_submissions").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("vote_submissions").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("is_approved", false),
          supabase.from("vote_submissions").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("is_approved", true),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("teams").select("id", { count: "exact", head: true }),
          supabase.from("rounds").select("id", { count: "exact", head: true }),
          supabase.from("vote_submissions")
            .select("id, submitted_at, round_id, division_id, umpire_id, custom_round, custom_division, proxy_umpire_name, proxy_submitter_name, submitted_by_admin_id, submitted_by_admin_name")
            .eq("is_deleted", false)
            .eq("is_approved", false)
            .order("submitted_at", { ascending: false })
            .limit(10),
          supabase.from("rounds").select("id, name"),
          supabase.from("divisions").select("id, name"),
        ]);

      setStats({
        submissions: subs.count || 0,
        pending: pending.count || 0,
        approved: approved.count || 0,
        umpires: umps.count || 0,
        teams: teams.count || 0,
        rounds: rounds.count || 0,
      });

      const fetchedPending = (pendingList.data as PendingSubmission[]) || [];
      if (roundsList.data) setRounds(roundsList.data);
      if (divsList.data) setDivisions(divsList.data);

      // Collect the unique umpire IDs from the pending submissions list
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const umpireIds = Array.from(
        new Set(
          fetchedPending
            .map((s) => s.umpire_id)
            .filter((id) => uuidRegex.test(id))
        )
      );

      const [profilesRes, authEmailsRes] = await Promise.all([
        umpireIds.length > 0
          ? supabase.from("profiles").select("user_id, email, full_name").in("user_id", umpireIds)
          : Promise.resolve({ data: [] }),
        umpireIds.length > 0
          ? supabase.rpc('get_auth_emails' as any, { user_ids: umpireIds })
          : Promise.resolve({ data: [], error: null }),
      ]);

      const pMap: Record<string, { email: string; full_name: string | null }> = {};
      if (profilesRes.data) {
        profilesRes.data.forEach((p) => {
          pMap[p.user_id] = { email: p.email, full_name: p.full_name };
        });
      }

      // Safely overlay the authentic auth emails if the function exists
      if (authEmailsRes && authEmailsRes.data && !authEmailsRes.error) {
        (authEmailsRes.data as any[]).forEach((ae) => {
          if (!pMap[ae.id]) {
            pMap[ae.id] = { email: ae.email, full_name: null };
          } else {
            pMap[ae.id].email = ae.email; // Override with true auth email
          }
        });
      } else if (authEmailsRes && authEmailsRes.error) {
        console.warn("Auth emails RPC missing or failed:", authEmailsRes.error.message);
      }

      setProfilesMap(pMap);
      setPendingSubs(fetchedPending);
    };

    load();
  }, []);

  const getName = (list: { id: string; name: string }[], id: string) => list.find((i) => i.id === id)?.name || "—";
  const getUmpire = (s: PendingSubmission) => {
    if (s.submitted_by_admin_id || s.proxy_submitter_id) {
      if (s.proxy_umpire_name) return s.proxy_umpire_name;
      if (s.umpire_id && profilesMap[s.umpire_id]) {
        const p = profilesMap[s.umpire_id];
        return p.full_name || p.email;
      }
      return s.proxy_submitter_name || s.submitted_by_admin_name || "Unknown";
    }
    const p = profilesMap[s.umpire_id];
    return p?.full_name || p?.email || s.umpire_id?.slice(0, 8) || "—";
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
                    <Badge variant="secondary">{s.round_id ? getName(rounds, s.round_id) : (s.custom_round || "—")}</Badge>
                    <span className="text-sm font-medium">{s.division_id ? getName(divisions, s.division_id) : (s.custom_division || "—")}</span>
                    <span className="text-sm text-muted-foreground">{getUmpire(s)}</span>
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
