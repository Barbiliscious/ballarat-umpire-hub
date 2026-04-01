import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search } from "lucide-react";

interface VoteLineRow {
  votes: number;
  player_name: string;
  player_number: number;
  team_id: string;
  submission_id: string;
}

interface SubmissionRow {
  id: string;
  round_id: string;
  division_id: string;
  is_approved: boolean;
  is_deleted: boolean;
}

interface LeaderEntry {
  playerName: string;
  playerNumber: number;
  teamId: string;
  threeVotes: number;
  twoVotes: number;
  oneVotes: number;
  total: number;
}

const Leaderboard = () => {
  const [voteLines, setVoteLines] = useState<VoteLineRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [filterRound, setFilterRound] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("vote_submissions").select("id, round_id, division_id, is_approved, is_deleted"),
      supabase.from("vote_lines").select("votes, player_name, player_number, team_id, submission_id"),
      supabase.from("rounds").select("id, name").order("round_number"),
      supabase.from("divisions").select("id, name").order("name"),
      supabase.from("teams").select("id, name").order("name"),
    ]).then(([subsRes, linesRes, roundsRes, divsRes, teamsRes]) => {
      if (subsRes.data) setSubmissions(subsRes.data as SubmissionRow[]);
      if (linesRes.data) setVoteLines(linesRes.data as VoteLineRow[]);
      if (roundsRes.data) setRounds(roundsRes.data);
      if (divsRes.data) setDivisions(divsRes.data);
      if (teamsRes.data) setTeams(teamsRes.data);
    });
  }, []);

  const getName = (list: { id: string; name: string }[], id: string) => list.find((i) => i.id === id)?.name || "—";

  const leaderboard = useMemo(() => {
    // Filter approved, non-deleted submissions
    const approvedIds = new Set(
      submissions
        .filter((s) => s.is_approved && !s.is_deleted)
        .filter((s) => filterRound === "all" || s.round_id === filterRound)
        .filter((s) => filterDivision === "all" || s.division_id === filterDivision)
        .map((s) => s.id)
    );

    const map = new Map<string, LeaderEntry>();
    voteLines
      .filter((vl) => approvedIds.has(vl.submission_id))
      .forEach((vl) => {
        const key = `${vl.player_name.trim().toLowerCase()}-${vl.player_number}-${vl.team_id}`;
        if (!map.has(key)) {
          map.set(key, {
            playerName: vl.player_name,
            playerNumber: vl.player_number,
            teamId: vl.team_id,
            threeVotes: 0,
            twoVotes: 0,
            oneVotes: 0,
            total: 0,
          });
        }
        const entry = map.get(key)!;
        if (vl.votes === 3) entry.threeVotes++;
        else if (vl.votes === 2) entry.twoVotes++;
        else if (vl.votes === 1) entry.oneVotes++;
        entry.total = entry.threeVotes * 3 + entry.twoVotes * 2 + entry.oneVotes * 1;
      });

    let entries = Array.from(map.values()).sort((a, b) => b.total - a.total);

    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter((e) => e.playerName.toLowerCase().includes(q));
    }

    return entries;
  }, [voteLines, submissions, filterRound, filterDivision, search]);

  const exportCsv = () => {
    const rows = [["Rank", "Player Name", "Number", "Team", "3-votes", "2-votes", "1-votes", "Total Points"]];
    leaderboard.forEach((e, i) => {
      rows.push([
        String(i + 1),
        e.playerName,
        String(e.playerNumber),
        getName(teams, e.teamId),
        String(e.threeVotes),
        String(e.twoVotes),
        String(e.oneVotes),
        String(e.total),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaderboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search player name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player Name</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">3-votes</TableHead>
                <TableHead className="text-center">2-votes</TableHead>
                <TableHead className="text-center">1-votes</TableHead>
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No approved votes found
                  </TableCell>
                </TableRow>
              )}
              {leaderboard.map((e, i) => (
                <TableRow key={`${e.playerName}-${e.playerNumber}-${e.teamId}`}>
                  <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{e.playerName}</TableCell>
                  <TableCell>#{e.playerNumber}</TableCell>
                  <TableCell>{getName(teams, e.teamId)}</TableCell>
                  <TableCell className="text-center">{e.threeVotes}</TableCell>
                  <TableCell className="text-center">{e.twoVotes}</TableCell>
                  <TableCell className="text-center">{e.oneVotes}</TableCell>
                  <TableCell className="text-center font-bold text-lg">{e.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
