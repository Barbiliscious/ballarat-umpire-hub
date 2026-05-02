import { useEffect, useMemo, useState } from "react";
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
import { Search, Download, Lock, Unlock, CheckCircle, Trash2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type SubmissionSortKey = "round" | "division" | "umpire" | "match" | "submittedBy" | "status" | "submitted";
type SortDirection = "asc" | "desc";

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
  const [profilesMap, setProfilesMap] = useState<Record<string, { email: string; full_name: string | null }>>({});
  const [filterRound, setFilterRound] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [sortKey, setSortKey] = useState<SubmissionSortKey>("submitted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchAll = async () => {
    const subsRes = await supabase.from("vote_submissions").select("*").order("submitted_at", { ascending: false });
    const fetchedSubmissions = (subsRes.data as Submission[]) || [];
    setSubmissions(fetchedSubmissions);

    const userIds = new Set<string>();
    fetchedSubmissions.forEach(s => {
      if (s.umpire_id) userIds.add(s.umpire_id);
      if (s.deleted_by) userIds.add(s.deleted_by);
      if (s.proxy_submitter_id) userIds.add(s.proxy_submitter_id);
      if (s.submitted_by_admin_id) userIds.add(s.submitted_by_admin_id);
    });
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uniqueUserIds = Array.from(userIds).filter(id => uuidRegex.test(id));

    const [linesRes, roundsRes, divsRes, teamsRes, profilesRes, authEmailsRes] = await Promise.all([
      supabase.from("vote_lines").select("*"),
      supabase.from("rounds").select("id, name").order("round_number"),
      supabase.from("divisions").select("id, name").order("name"),
      supabase.from("teams").select("id, name").order("name"),
      uniqueUserIds.length > 0
        ? supabase.from("profiles").select("user_id, email, full_name").in("user_id", uniqueUserIds)
        : Promise.resolve({ data: [] }),
      uniqueUserIds.length > 0
        ? supabase.rpc('get_auth_emails' as any, { user_ids: uniqueUserIds })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (linesRes.data) setVoteLines(linesRes.data);
    if (roundsRes.data) setRounds(roundsRes.data);
    if (divsRes.data) setDivisions(divsRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    
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
  };

  useEffect(() => { fetchAll(); }, []);

  const getName = (list: { id: string; name: string }[], id: string) => list.find((i) => i.id === id)?.name || "—";
  const getUmpireName = (s: Submission) => {
    const isProxy = !!s.proxy_submitter_id || !!s.submitted_by_admin_id;
    if (isProxy) return s.umpire_id;
    const p = profilesMap[s.umpire_id];
    return p ? p.email : s.umpire_id;
  };

  const getSubmittedBy = (s: Submission) => {
    const isAdminSubmitted = !!s.submitted_by_admin_id;
    const isProxySubmitted = !!s.proxy_submitter_id && !s.submitted_by_admin_id;
    if (!isProxySubmitted && !isAdminSubmitted) return "Self";
    if (isAdminSubmitted) {
      return profilesMap[s.submitted_by_admin_id!]?.email || s.submitted_by_admin_name || "Admin";
    }
    return profilesMap[s.proxy_submitter_id!]?.email || s.proxy_submitter_name || "Proxy";
  };

  const formatSubmittedAt = (submittedAt: string) => (
    submittedAt
      ? new Date(submittedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })
      : "â€”"
  );

  const handleSort = (key: SubmissionSortKey) => {
    if (sortKey === key) {
      setSortDirection(current => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection(key === "submitted" ? "desc" : "asc");
  };

  const renderSortHeader = (key: SubmissionSortKey, label: string) => (
    <button
      type="button"
      className="flex items-center gap-1 text-left font-medium text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => handleSort(key)}
    >
      <span>{label}</span>
      {sortKey === key && (
        sortDirection === "asc"
          ? <ChevronUp className="h-3.5 w-3.5" />
          : <ChevronDown className="h-3.5 w-3.5" />
      )}
    </button>
  );

  const filtered = useMemo(() => {
    const filteredSubmissions = submissions.filter((s) => {
      if (!includeDeleted && s.is_deleted) return false;
      if (filterRound !== "all" && s.round_id !== filterRound) return false;
      if (filterDivision !== "all" && s.division_id !== filterDivision) return false;
      if (search) {
        const q = search.toLowerCase();
        const umpire = getUmpireName(s).toLowerCase();
        const homeTeam = getName(teams, s.home_team_id).toLowerCase();
        const awayTeam = getName(teams, s.away_team_id).toLowerCase();
        if (!umpire.includes(q) && !homeTeam.includes(q) && !awayTeam.includes(q)) return false;
      }
      return true;
    });

    return [...filteredSubmissions].sort((a, b) => {
      let result = 0;
      if (sortKey === "round") {
        result = getName(rounds, a.round_id).localeCompare(getName(rounds, b.round_id));
      } else if (sortKey === "division") {
        result = getName(divisions, a.division_id).localeCompare(getName(divisions, b.division_id));
      } else if (sortKey === "umpire") {
        result = getUmpireName(a).localeCompare(getUmpireName(b));
      } else if (sortKey === "match") {
        const matchA = `${getName(teams, a.home_team_id)} vs ${getName(teams, a.away_team_id)}`;
        const matchB = `${getName(teams, b.home_team_id)} vs ${getName(teams, b.away_team_id)}`;
        result = matchA.localeCompare(matchB);
      } else if (sortKey === "submittedBy") {
        result = getSubmittedBy(a).localeCompare(getSubmittedBy(b));
      } else if (sortKey === "status") {
        result = Number(Boolean(a.is_approved)) - Number(Boolean(b.is_approved));
      } else if (sortKey === "submitted") {
        result = new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime();
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [divisions, filterDivision, filterRound, includeDeleted, profilesMap, rounds, search, sortDirection, sortKey, submissions, teams]);

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
          getUmpireName(s),
          getName(teams, s.home_team_id),
          getName(teams, s.away_team_id),
          String(vl.votes),
          vl.player_name,
          String(vl.player_number),
          getName(teams, vl.team_id),
          s.is_approved ? "Approved" : "Pending",
          formatSubmittedAt(s.submitted_at),
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="include-deleted-submissions" className="text-sm font-medium">Include deleted</Label>
            <Switch id="include-deleted-submissions" checked={includeDeleted} onCheckedChange={setIncludeDeleted} />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{renderSortHeader("round", "Round")}</TableHead>
                <TableHead>{renderSortHeader("division", "Division")}</TableHead>
                <TableHead>{renderSortHeader("umpire", "Umpire")}</TableHead>
                <TableHead>{renderSortHeader("match", "Match")}</TableHead>
                <TableHead>{renderSortHeader("submittedBy", "Submitted By")}</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>{renderSortHeader("status", "Status")}</TableHead>
                <TableHead>{renderSortHeader("submitted", "Submitted")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No submissions found</TableCell></TableRow>
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
                        {getUmpireName(s)}
                        {s.is_deleted && s.deleted_by && (
                          <div className="text-xs text-destructive font-medium mt-0.5">
                            Deleted by: {profilesMap[s.deleted_by]?.email || "Unknown"}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {getName(teams, s.home_team_id)} vs {getName(teams, s.away_team_id)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (!isProxySubmitted && !isAdminSubmitted) return <span>Self</span>;

                        let proxyEmail = "";
                        let proxyReason = "";
                        if (isAdminSubmitted) {
                          proxyEmail = profilesMap[s.submitted_by_admin_id!]?.email || s.submitted_by_admin_name || "Admin";
                          proxyReason = "Admin submission";
                        } else if (isProxySubmitted) {
                          proxyEmail = profilesMap[s.proxy_submitter_id!]?.email || s.proxy_submitter_name || "Proxy";
                          proxyReason = s.proxy_reason || "";
                        }

                        return (
                          <div>
                            <div>{proxyEmail}</div>
                            {proxyReason && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {proxyReason}
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                    <TableCell className="text-sm text-muted-foreground">
                      {s.submitted_at
                        ? formatSubmittedAt(s.submitted_at)
                        : "—"}
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
