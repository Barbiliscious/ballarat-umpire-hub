import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Download, Lock, Unlock, CheckCircle, Trash2, Eye } from "lucide-react";
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
  is_approved: boolean;
  is_deleted: boolean;
  deleted_by: string | null;
  deleted_at: string | null;
  submitted_at: string;
  submitted_by_admin_id: string | null;
  submitted_by_admin_name: string | null;
  proxy_submitter_id: string | null;
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

const Submissions = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [voteLines, setVoteLines] = useState<VoteLine[]>([]);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; email: string; full_name: string | null }[]>([]);
  const [filterRound, setFilterRound] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchAll = async () => {
    const [subsRes, linesRes, roundsRes, divsRes, teamsRes, profilesRes] = await Promise.all([
      supabase.from("vote_submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("vote_lines").select("*"),
      supabase.from("rounds").select("id, name").order("round_number"),
      supabase.from("divisions").select("id, name").order("name"),
      supabase.from("teams").select("id, name").order("name"),
      supabase.from("profiles").select("user_id, email, full_name"),
    ]);
    if (subsRes.data) setSubmissions(subsRes.data as Submission[]);
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
    if (!showDeleted && s.is_deleted) return false;
    if (showDeleted && !s.is_deleted) return false;
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

  const approveSubmission = async (sub: Submission) => {
    const { error } = await supabase
      .from("vote_submissions")
      .update({ is_approved: true })
      .eq("id", sub.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Submission approved");
      fetchAll();
    }
  };

  const softDelete = async (sub: Submission) => {
    const { error } = await supabase
      .from("vote_submissions")
      .update({
        is_deleted: true,
        deleted_by: user?.id,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Submission deleted");
      fetchAll();
    }
  };

  const restoreSubmission = async (sub: Submission) => {
    const { error } = await supabase
      .from("vote_submissions")
      .update({ is_deleted: false, deleted_by: null, deleted_at: null })
      .eq("id", sub.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Submission restored");
      fetchAll();
    }
  };

  const exportCsv = () => {
    const rows = [["Round", "Division", "Umpire", "Home Team", "Away Team", "Votes", "Player", "Number", "Team", "Status", "Submitted"]];
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
          s.is_approved ? "Approved" : "Pending",
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
      <div className="flex flex-wrap gap-3 items-center">
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
        <div className="flex items-center gap-2">
          <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} />
          <Label htmlFor="show-deleted" className="text-sm">Show Deleted</Label>
        </div>
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
                const isAdminSubmitted = !!s.submitted_by_admin_id;
                const isProxySubmitted = !!s.proxy_submitter_id && !s.submitted_by_admin_id;
                return (
                  <TableRow
                    key={s.id}
                    className={`${s.is_deleted ? "opacity-50 line-through" : ""} ${isAdminSubmitted ? "bg-amber-50 dark:bg-amber-950/20" : ""} ${isProxySubmitted ? "border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/10" : ""}`}
                  >
                    <TableCell className="font-medium">{getName(rounds, s.round_id)}</TableCell>
                    <TableCell>{getName(divisions, s.division_id)}</TableCell>
                    <TableCell>
                      <div>
                        {getUmpire(s.umpire_id)}
                        {isAdminSubmitted && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                            Submitted by: {s.submitted_by_admin_name}
                          </div>
                        )}
                        {s.is_deleted && s.deleted_by && (
                          <div className="text-xs text-destructive font-medium mt-0.5">
                            Deleted by: {getUmpire(s.deleted_by)}
                          </div>
                        )}
                      </div>
                    </TableCell>
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
                      <div className="space-y-1">
                        <Badge variant={s.is_approved ? "default" : "secondary"} className={s.is_approved ? "bg-success" : "bg-amber-500 text-white"}>
                          {s.is_approved ? "Approved" : "Pending"}
                        </Badge>
                        {s.is_locked && (
                          <Badge variant="outline" className="ml-1">Locked</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.is_deleted ? (
                        <Button variant="ghost" size="sm" onClick={() => restoreSubmission(s)} title="Restore">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          {!s.is_approved && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Approve" className="text-success hover:text-success">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve Submission</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to approve this submission? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => approveSubmission(s)}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => toggleLock(s)} title={s.is_locked ? "Reopen" : "Lock"}>
                            {s.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Delete" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this submission? It will be hidden but can be restored later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => softDelete(s)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Submissions;
