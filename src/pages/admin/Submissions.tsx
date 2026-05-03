import React, { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Download, Lock, Unlock, CheckCircle, Trash2, Eye, ChevronDown, ChevronUp } from "lucide-react";
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
  proxy_umpire_name: string | null;
  custom_round: string | null;
  custom_division: string | null;
  custom_home_team: string | null;
  custom_away_team: string | null;
}

interface VoteLine {
  id: string;
  submission_id: string;
  votes: number;
  player_name: string;
  player_number: number;
  team_id: string;
}

interface VoteEdit {
  id: string;
  submission_id: string;
  changed_by_id: string;
  changed_at: string;
  field_name: string;
  original_value: string | null;
  new_value: string | null;
}

interface EditableLine {
  id: string;
  votes: number;
  player_name: string;
  player_number: number;
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
  const [showDeleted, setShowDeleted] = useState(false);
  const [voteEdits, setVoteEdits] = useState<VoteEdit[]>([]);
  const [expandedEditHistory, setExpandedEditHistory] = useState<string | null>(null);
  const [approveDialogSub, setApproveDialogSub] = useState<Submission | null>(null);
  const [editRoundId, setEditRoundId] = useState("");
  const [editDivisionId, setEditDivisionId] = useState("");
  const [editHomeTeamId, setEditHomeTeamId] = useState("");
  const [editAwayTeamId, setEditAwayTeamId] = useState("");
  const [editCustomRound, setEditCustomRound] = useState("");
  const [editCustomDivision, setEditCustomDivision] = useState("");
  const [editCustomHomeTeam, setEditCustomHomeTeam] = useState("");
  const [editCustomAwayTeam, setEditCustomAwayTeam] = useState("");
  const [editLines, setEditLines] = useState<EditableLine[]>([]);
  const [approveSaving, setApproveSaving] = useState(false);

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
    const [linesRes, roundsRes, divsRes, teamsRes, profilesRes, authEmailsRes, editsRes] = await Promise.all([
      supabase.from("vote_lines").select("*"),
      supabase.from("rounds").select("id, name").order("round_number"),
      supabase.from("divisions").select("id, name").order("name"),
      supabase.from("teams").select("id, name").order("name"),
      uniqueUserIds.length > 0 ? supabase.from("profiles").select("user_id, email, full_name").in("user_id", uniqueUserIds) : Promise.resolve({ data: [] }),
      uniqueUserIds.length > 0 ? supabase.rpc('get_auth_emails' as any, { user_ids: uniqueUserIds }) : Promise.resolve({ data: [], error: null }),
      supabase.from("vote_edits").select("*"),
    ]);
    if (linesRes.data) setVoteLines(linesRes.data);
    if (roundsRes.data) setRounds(roundsRes.data);
    if (divsRes.data) setDivisions(divsRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (editsRes.data) setVoteEdits(editsRes.data as VoteEdit[]);
    const pMap: Record<string, { email: string; full_name: string | null }> = {};
    if (profilesRes.data) profilesRes.data.forEach((p) => { pMap[p.user_id] = { email: p.email, full_name: p.full_name }; });
    if (authEmailsRes && authEmailsRes.data && !authEmailsRes.error) {
      (authEmailsRes.data as any[]).forEach((ae) => {
        if (!pMap[ae.id]) pMap[ae.id] = { email: ae.email, full_name: null };
        else pMap[ae.id].email = ae.email;
      });
    } else if (authEmailsRes && authEmailsRes.error) {
      console.warn("Auth emails RPC missing or failed:", authEmailsRes.error.message);
    }
    setProfilesMap(pMap);
  };

  useEffect(() => { fetchAll(); }, []);

  const getName = (list: { id: string; name: string }[], id: string) => list.find((i) => i.id === id)?.name || "—";

  const getUmpireName = (s: Submission) => {
    if (s.submitted_by_admin_id || s.proxy_submitter_id) {
      return s.proxy_umpire_name || s.proxy_submitter_name || "Unknown";
    }
    const p = profilesMap[s.umpire_id];
    return p ? (p.full_name || p.email) : s.umpire_id;
  };

  const filtered = submissions.filter((s) => {
    if (!showDeleted && s.is_deleted) return false;
    if (showDeleted && !s.is_deleted) return false;
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

  const toggleLock = async (sub: Submission) => {
    const { error } = await supabase.from("vote_submissions").update({ is_locked: !sub.is_locked }).eq("id", sub.id);
    if (error) toast.error(error.message);
    else { toast.success(sub.is_locked ? "Submission reopened" : "Submission locked"); fetchAll(); }
  };

  const openApproveDialog = (sub: Submission) => {
    const lines = voteLines.filter(vl => vl.submission_id === sub.id).sort((a, b) => b.votes - a.votes);
    setApproveDialogSub(sub);
    setEditRoundId(sub.round_id);
    setEditDivisionId(sub.division_id);
    setEditHomeTeamId(sub.home_team_id);
    setEditAwayTeamId(sub.away_team_id);
    setEditCustomRound(sub.custom_round || "");
    setEditCustomDivision(sub.custom_division || "");
    setEditCustomHomeTeam(sub.custom_home_team || "");
    setEditCustomAwayTeam(sub.custom_away_team || "");
    setEditLines(lines.map(l => ({ id: l.id, votes: l.votes, player_name: l.player_name, player_number: l.player_number })));
  };

  const handleApproveWithEdits = async () => {
    if (!approveDialogSub) return;
    setApproveSaving(true);
    const sub = approveDialogSub;
    const isCustomSub = !!sub.custom_round || !sub.round_id;
    const edits: { field_name: string; original_value: string; new_value: string }[] = [];
    if (!isCustomSub) {
      if (editRoundId !== sub.round_id) edits.push({ field_name: "round", original_value: getName(rounds, sub.round_id), new_value: getName(rounds, editRoundId) });
      if (editDivisionId !== sub.division_id) edits.push({ field_name: "division", original_value: getName(divisions, sub.division_id), new_value: getName(divisions, editDivisionId) });
      if (editHomeTeamId !== sub.home_team_id) edits.push({ field_name: "home_team", original_value: getName(teams, sub.home_team_id), new_value: getName(teams, editHomeTeamId) });
      if (editAwayTeamId !== sub.away_team_id) edits.push({ field_name: "away_team", original_value: getName(teams, sub.away_team_id), new_value: getName(teams, editAwayTeamId) });
    } else {
      if (editCustomRound !== (sub.custom_round || "")) edits.push({ field_name: "custom_round", original_value: sub.custom_round || "", new_value: editCustomRound });
      if (editCustomDivision !== (sub.custom_division || "")) edits.push({ field_name: "custom_division", original_value: sub.custom_division || "", new_value: editCustomDivision });
      if (editCustomHomeTeam !== (sub.custom_home_team || "")) edits.push({ field_name: "custom_home_team", original_value: sub.custom_home_team || "", new_value: editCustomHomeTeam });
      if (editCustomAwayTeam !== (sub.custom_away_team || "")) edits.push({ field_name: "custom_away_team", original_value: sub.custom_away_team || "", new_value: editCustomAwayTeam });
    }
    const originalLines = voteLines.filter(vl => vl.submission_id === sub.id).sort((a, b) => b.votes - a.votes);
    editLines.forEach((el, i) => {
      const orig = originalLines[i];
      if (!orig) return;
      if (el.player_name !== orig.player_name) edits.push({ field_name: `vote_${el.votes}_name`, original_value: orig.player_name, new_value: el.player_name });
      if (Number(el.player_number) !== Number(orig.player_number)) edits.push({ field_name: `vote_${el.votes}_number`, original_value: String(orig.player_number), new_value: String(el.player_number) });
    });
    const updatePayload = isCustomSub
      ? { custom_round: editCustomRound, custom_division: editCustomDivision, custom_home_team: editCustomHomeTeam, custom_away_team: editCustomAwayTeam, is_approved: true }
      : { round_id: editRoundId, division_id: editDivisionId, home_team_id: editHomeTeamId, away_team_id: editAwayTeamId, is_approved: true };
    const { error: subErr } = await supabase.from("vote_submissions").update(updatePayload).eq("id", sub.id);
    if (subErr) { toast.error(subErr.message); setApproveSaving(false); return; }
    for (const el of editLines) {
      await supabase.from("vote_lines").update({ player_name: el.player_name, player_number: Number(el.player_number) }).eq("id", el.id);
    }
    if (edits.length > 0 && user) {
      await supabase.from("vote_edits").insert(edits.map(e => ({ submission_id: sub.id, changed_by_id: user.id, ...e })));
    }
    toast.success(edits.length > 0 ? "Changes saved and submission approved" : "Submission approved");
    setApproveDialogSub(null);
    setApproveSaving(false);
    fetchAll();
  };

  const softDelete = async (sub: Submission) => {
    const { error } = await supabase.from("vote_submissions").update({ is_deleted: true, deleted_by: user?.id, deleted_at: new Date().toISOString() }).eq("id", sub.id);
    if (error) toast.error(error.message);
    else { toast.success("Submission deleted"); fetchAll(); }
  };

  const restoreSubmission = async (sub: Submission) => {
    const { error } = await supabase.from("vote_submissions").update({ is_deleted: false, deleted_by: null, deleted_at: null }).eq("id", sub.id);
    if (error) toast.error(error.message);
    else { toast.success("Submission restored"); fetchAll(); }
  };

  const exportCsv = () => {
    const rows = [["Round", "Division", "Umpire", "Home Team", "Away Team", "Votes", "Player", "Number", "Team", "Status", "Submitted"]];
    filtered.forEach((s) => {
      const lines = voteLines.filter((vl) => vl.submission_id === s.id);
      lines.forEach((vl) => {
        rows.push([getName(rounds, s.round_id), getName(divisions, s.division_id), getUmpireName(s), getName(teams, s.home_team_id), getName(teams, s.away_team_id), String(vl.votes), vl.player_name, String(vl.player_number), getName(teams, vl.team_id), s.is_approved ? "Approved" : "Pending", new Date(s.submitted_at).toLocaleDateString()]);
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vote-submissions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search umpire or team..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterRound} onValueChange={setFilterRound}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Rounds" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Rounds</SelectItem>{rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Divisions" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Divisions</SelectItem>{divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
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
                <TableHead>Round</TableHead><TableHead>Division</TableHead><TableHead>Umpire</TableHead>
                <TableHead>Match</TableHead><TableHead>Submitted By</TableHead><TableHead>Votes</TableHead>
                <TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (<TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No submissions found</TableCell></TableRow>)}
              {filtered.map((s) => {
                const lines = voteLines.filter((vl) => vl.submission_id === s.id).sort((a, b) => b.votes - a.votes);
                const isAdminSubmitted = !!s.submitted_by_admin_id;
                const isProxySubmitted = !!s.proxy_submitter_id && !s.submitted_by_admin_id;
                const subEdits = voteEdits.filter(e => e.submission_id === s.id);
                const isEditExpanded = expandedEditHistory === s.id;
                return (
                  <React.Fragment key={s.id}>
                    <TableRow className={`${s.is_deleted ? "opacity-50 line-through" : ""} ${isAdminSubmitted ? "bg-amber-50 dark:bg-amber-950/20" : ""} ${isProxySubmitted ? "border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/10" : ""}`}>
                      <TableCell className="font-medium">{s.round_id ? getName(rounds, s.round_id) : (s.custom_round || "—")}</TableCell>
                      <TableCell>{s.division_id ? getName(divisions, s.division_id) : (s.custom_division || "—")}</TableCell>
                      <TableCell>
                        <div>
                          {getUmpireName(s)}
                          {s.is_deleted && s.deleted_by && (<div className="text-xs text-destructive font-medium mt-0.5">Deleted by: {profilesMap[s.deleted_by]?.email || "Unknown"}</div>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{(s.home_team_id ? getName(teams, s.home_team_id) : s.custom_home_team) || "—"} vs {(s.away_team_id ? getName(teams, s.away_team_id) : s.custom_away_team) || "—"}</TableCell>
                      <TableCell>
                        {(() => {
                          if (!isProxySubmitted && !isAdminSubmitted) return <span>Self</span>;
                          let proxyEmail = "";
                          let proxyReason = "";
                          if (isAdminSubmitted) { proxyEmail = profilesMap[s.submitted_by_admin_id!]?.email || s.submitted_by_admin_name || "Admin"; proxyReason = "Admin submission"; }
                          else if (isProxySubmitted) { proxyEmail = profilesMap[s.proxy_submitter_id!]?.email || s.proxy_submitter_name || "Proxy"; proxyReason = s.proxy_reason || ""; }
                          return (<div><div>{proxyEmail}</div>{proxyReason && <div className="text-xs text-muted-foreground mt-0.5">{proxyReason}</div>}</div>);
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {lines.map((vl) => (<div key={vl.id} className="text-xs"><span className="font-semibold">{vl.votes}:</span> {vl.player_name} #{vl.player_number}</div>))}
                          {subEdits.length > 0 && (
                            <button className="mt-1 text-xs text-blue-500 hover:underline flex items-center gap-1" onClick={(e) => { e.stopPropagation(); setExpandedEditHistory(isEditExpanded ? null : s.id); }}>
                              {isEditExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {subEdits.length} edit{subEdits.length !== 1 ? "s" : ""}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={s.is_approved ? "default" : "secondary"} className={s.is_approved ? "bg-success" : "bg-amber-500 text-white"}>{s.is_approved ? "Approved" : "Pending"}</Badge>
                          {s.is_locked && <Badge variant="outline" className="ml-1">Locked</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.submitted_at ? new Date(s.submitted_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" }) : "—"}</TableCell>
                      <TableCell className="text-right">
                        {s.is_deleted ? (
                          <Button variant="ghost" size="sm" onClick={() => restoreSubmission(s)} title="Restore"><Eye className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            {!s.is_approved && (
                              <Button variant="ghost" size="sm" title="Approve" className="text-success hover:text-success" onClick={() => openApproveDialog(s)}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => toggleLock(s)} title={s.is_locked ? "Reopen" : "Lock"}>
                              {s.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Delete" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Submission</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this submission? It will be hidden but can be restored later.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => softDelete(s)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {isEditExpanded && subEdits.length > 0 && (
                      <TableRow className="bg-blue-50/50 dark:bg-blue-950/10">
                        <TableCell colSpan={9} className="py-3 px-6">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Edit History</p>
                          <div className="space-y-1.5">
                            {subEdits.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()).map(e => (
                              <div key={e.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground">{new Date(e.changed_at).toLocaleDateString("en-AU")}</span>
                                <span className="font-medium">{profilesMap[e.changed_by_id]?.email || "Admin"}</span>
                                <span className="text-muted-foreground">changed</span>
                                <span className="font-medium">{e.field_name.replace(/_/g, " ")}</span>
                                <span className="text-muted-foreground">from</span>
                                <span className="line-through text-red-500">{e.original_value || "—"}</span>
                                <span className="text-muted-foreground">to</span>
                                <span className="text-green-600 font-medium">{e.new_value || "—"}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!approveDialogSub} onOpenChange={(open) => !open && setApproveDialogSub(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review & Approve Submission</DialogTitle></DialogHeader>
          {approveDialogSub && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Review and correct any details before approving.</p>
              {(() => {
                const isCustomSub = !!approveDialogSub.custom_round || !approveDialogSub.round_id;
                return (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Round</Label>
                      {isCustomSub ? (
                        <Input value={editCustomRound} onChange={e => setEditCustomRound(e.target.value)} placeholder="Round name" />
                      ) : (
                        <Select value={editRoundId} onValueChange={setEditRoundId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{rounds.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Division</Label>
                      {isCustomSub ? (
                        <Input value={editCustomDivision} onChange={e => setEditCustomDivision(e.target.value)} placeholder="Division name" />
                      ) : (
                        <Select value={editDivisionId} onValueChange={setEditDivisionId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Home Team</Label>
                      {isCustomSub ? (
                        <Input value={editCustomHomeTeam} onChange={e => setEditCustomHomeTeam(e.target.value)} placeholder="Home team name" />
                      ) : (
                        <Select value={editHomeTeamId} onValueChange={setEditHomeTeamId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Away Team</Label>
                      {isCustomSub ? (
                        <Input value={editCustomAwayTeam} onChange={e => setEditCustomAwayTeam(e.target.value)} placeholder="Away team name" />
                      ) : (
                        <Select value={editAwayTeamId} onValueChange={setEditAwayTeamId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Votes</Label>
                      {editLines.map((line, i) => (
                        <div key={line.id} className="flex items-center gap-2">
                          <span className="w-10 text-sm font-bold text-primary shrink-0">{line.votes}pts</span>
                          <Input value={line.player_name} onChange={e => setEditLines(prev => prev.map((l, idx) => idx === i ? { ...l, player_name: e.target.value } : l))} placeholder="Player name" className="flex-1" />
                          <Input value={String(line.player_number)} onChange={e => setEditLines(prev => prev.map((l, idx) => idx === i ? { ...l, player_number: Number(e.target.value) } : l))} placeholder="#" className="w-20" type="number" />
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setApproveDialogSub(null)} disabled={approveSaving}>Cancel</Button>
            <Button onClick={handleApproveWithEdits} disabled={approveSaving}>{approveSaving ? "Saving..." : "Approve"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submissions;
