import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Trophy, Calendar } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({ submissions: 0, umpires: 0, teams: 0, rounds: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("vote_submissions").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("rounds").select("id", { count: "exact", head: true }),
    ]).then(([subs, umps, teams, rounds]) => {
      setStats({
        submissions: subs.count || 0,
        umpires: umps.count || 0,
        teams: teams.count || 0,
        rounds: rounds.count || 0,
      });
    });
  }, []);

  const cards = [
    { label: "Total Submissions", value: stats.submissions, icon: FileText, color: "text-primary" },
    { label: "Registered Umpires", value: stats.umpires, icon: Users, color: "text-primary" },
    { label: "Teams", value: stats.teams, icon: Trophy, color: "text-primary" },
    { label: "Rounds", value: stats.rounds, icon: Calendar, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
};

export default Dashboard;
