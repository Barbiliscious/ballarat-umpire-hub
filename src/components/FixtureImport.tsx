import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, UploadCloud, XCircle, AlertTriangle } from "lucide-react";

export interface FixtureImportProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  divisions: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  existingFixtures: { round_id: string; division_id: string; home_team_id: string; away_team_id: string | null }[];
  existingRounds: { id: string; name: string; round_number: number }[];
}

export interface ParsedRow {
  rowNumber: number;
  rawData: any;
  roundNumber: number | null;
  roundName: string;
  date: string;
  time: string;
  venue: string;
  pitch: string;
  gradeName: string;
  homeTeamName: string;
  awayTeamName: string;
  umpire1: string;
  umpire2: string;
  
  resolvedDivisionId: string | null;
  resolvedHomeTeamId: string | null;
  resolvedAwayTeamId: string | null;
  resolvedRoundId: string | null;
  willCreateRound: boolean;

  errors: string[];
  warnings: string[];
}

const FixtureImport: React.FC<FixtureImportProps> = ({
  open,
  onClose,
  onImportComplete,
  divisions,
  teams,
  existingFixtures,
  existingRounds,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [createdRoundsCount, setCreatedRoundsCount] = useState(0);
  const [importedFixturesCount, setImportedFixturesCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setImporting(false);
    setImportDone(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
      onClose();
    }
  };

  const parseDate = (dateStr: string | number): string | null => {
    if (!dateStr) return null;
    
    // If Excel serial date
    if (typeof dateStr === "number") {
      const date = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    const str = String(dateStr).trim();
    
    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    
    // Check DD/MM/YYYY
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }

    return null;
  };

  const validateRows = (rows: any[]): ParsedRow[] => {
    const validated: ParsedRow[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header
      const errors: string[] = [];
      const warnings: string[] = [];

      const rawRoundNumber = row.round_number;
      const rawDate = row.date;
      const rawTime = row.time;
      const rawVenue = row.venue;
      const rawPitch = row.pitch;
      const rawGrade = row.grade;
      const rawHomeTeam = row.home_team;
      
      const roundName = row.round_name ? String(row.round_name).trim() : `Round ${rawRoundNumber}`;
      const awayTeamName = row.away_team ? String(row.away_team).trim() : "";
      const umpire1 = row.umpire_1 ? String(row.umpire_1).trim() : "";
      const umpire2 = row.umpire_2 ? String(row.umpire_2).trim() : "";

      // Required fields
      let roundNumber: number | null = null;
      if (rawRoundNumber === undefined || rawRoundNumber === null || rawRoundNumber === "") {
        errors.push("round_number is required");
      } else {
        roundNumber = Number(rawRoundNumber);
        if (isNaN(roundNumber)) {
          errors.push("round_number must be a number");
          roundNumber = null;
        }
      }

      if (!rawDate) errors.push("date is required");
      if (!rawTime) errors.push("time is required");
      if (!rawVenue) errors.push("venue is required");
      if (!rawPitch) errors.push("pitch is required");
      if (!rawGrade) errors.push("grade is required");
      if (!rawHomeTeam) errors.push("home_team is required");

      const parsedDateStr = parseDate(rawDate);
      if (rawDate && !parsedDateStr) {
        errors.push(`Date '${rawDate}' is not a valid date. Use DD/MM/YYYY format.`);
      }

      // Time parsing (basic HH:mm format checking)
      let timeStr = String(rawTime || "").trim();
      // Excel sometimes gives time as fraction of a day
      if (typeof rawTime === "number") {
        const totalSeconds = Math.round(rawTime * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }

      // Round Lookup
      let resolvedRoundId: string | null = null;
      let willCreateRound = false;
      if (roundNumber !== null) {
        const existingRound = existingRounds.find(r => r.round_number === roundNumber);
        if (existingRound) {
          resolvedRoundId = existingRound.id;
        } else {
          willCreateRound = true;
          warnings.push(`Round ${roundNumber} not found — will be created as '${roundName}'`);
        }
      }

      // Division Lookup
      let resolvedDivisionId: string | null = null;
      if (rawGrade) {
        const gradeStr = String(rawGrade).trim().toLowerCase();
        const existingDiv = divisions.find(d => d.name.toLowerCase() === gradeStr);
        if (existingDiv) {
          resolvedDivisionId = existingDiv.id;
        } else {
          errors.push(`Division '${rawGrade}' not found in the app. Check spelling or add this division first.`);
        }
      }

      // Home Team Lookup
      let resolvedHomeTeamId: string | null = null;
      if (rawHomeTeam) {
        const homeStr = String(rawHomeTeam).trim().toLowerCase();
        const existingHome = teams.find(t => t.name.toLowerCase() === homeStr);
        if (existingHome) {
          resolvedHomeTeamId = existingHome.id;
        } else {
          errors.push(`Home team '${rawHomeTeam}' not found. Check spelling or add this team first.`);
        }
      }

      // Away Team Lookup
      let resolvedAwayTeamId: string | null = null;
      if (awayTeamName) {
        const awayStr = awayTeamName.toLowerCase();
        const existingAway = teams.find(t => t.name.toLowerCase() === awayStr);
        if (existingAway) {
          resolvedAwayTeamId = existingAway.id;
        } else {
          errors.push(`Away team '${awayTeamName}' not found.`);
        }
      }

      // Duplicates
      if (errors.length === 0 && resolvedRoundId && resolvedDivisionId && resolvedHomeTeamId) {
        const isDuplicate = existingFixtures.some(f => 
          f.round_id === resolvedRoundId && 
          f.division_id === resolvedDivisionId && 
          f.home_team_id === resolvedHomeTeamId && 
          f.away_team_id === resolvedAwayTeamId
        );
        if (isDuplicate) {
          warnings.push("This fixture already exists — it will be skipped on import.");
        }
      }

      validated.push({
        rowNumber,
        rawData: row,
        roundNumber,
        roundName,
        date: parsedDateStr || "",
        time: timeStr,
        venue: rawVenue ? String(rawVenue).trim() : "",
        pitch: rawPitch ? String(rawPitch).trim() : "",
        gradeName: rawGrade ? String(rawGrade).trim() : "",
        homeTeamName: rawHomeTeam ? String(rawHomeTeam).trim() : "",
        awayTeamName,
        umpire1,
        umpire2,
        resolvedDivisionId,
        resolvedHomeTeamId,
        resolvedAwayTeamId,
        resolvedRoundId,
        willCreateRound,
        errors,
        warnings,
      });
    });

    // Same team twice check
    const roundGroups = validated.reduce((acc, row) => {
      if (row.roundNumber !== null) {
        if (!acc[row.roundNumber]) acc[row.roundNumber] = [];
        acc[row.roundNumber].push(row);
      }
      return acc;
    }, {} as Record<number, ParsedRow[]>);

    Object.values(roundGroups).forEach(groupRows => {
      const teamCounts: Record<string, number> = {};
      groupRows.forEach(row => {
        if (row.homeTeamName) teamCounts[row.homeTeamName] = (teamCounts[row.homeTeamName] || 0) + 1;
        if (row.awayTeamName) teamCounts[row.awayTeamName] = (teamCounts[row.awayTeamName] || 0) + 1;
      });
      groupRows.forEach(row => {
        if (row.homeTeamName && teamCounts[row.homeTeamName] > 1 && !row.errors.includes(`Home team '${row.homeTeamName}' not found. Check spelling or add this team first.`)) {
          if (!row.warnings.some(w => w.includes(row.homeTeamName) && w.includes('more than once'))) {
             row.warnings.push(`'${row.homeTeamName}' appears more than once in Round ${row.roundNumber}`);
          }
        }
        if (row.awayTeamName && teamCounts[row.awayTeamName] > 1 && !row.errors.includes(`Away team '${row.awayTeamName}' not found.`)) {
           if (!row.warnings.some(w => w.includes(row.awayTeamName) && w.includes('more than once'))) {
             row.warnings.push(`'${row.awayTeamName}' appears more than once in Round ${row.roundNumber}`);
           }
        }
      });
    });

    return validated;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    try {
      const buffer = await selected.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const validated = validateRows(jsonData);
      setParsedRows(validated);
    } catch (err: any) {
      toast.error("Failed to parse Excel file: " + err.message);
      resetState();
    }
  };

  const handleImport = async () => {
    setImporting(true);

    const validRows = parsedRows.filter(r => r.errors.length === 0 && !r.warnings.includes("This fixture already exists — it will be skipped on import."));
    
    // Group new rounds
    const roundsToCreate = new Map<number, string>(); // roundNumber -> roundName
    validRows.forEach(r => {
      if (r.willCreateRound && r.roundNumber !== null) {
        if (!roundsToCreate.has(r.roundNumber)) {
          roundsToCreate.set(r.roundNumber, r.roundName);
        }
      }
    });

    const newRoundMap = new Map<number, string>(); // roundNumber -> new UUID

    try {
      // Create new rounds
      if (roundsToCreate.size > 0) {
        const roundInserts = Array.from(roundsToCreate.entries()).map(([num, name]) => ({
          round_number: num,
          name: name
        }));

        const { data: newRounds, error: roundError } = await supabase
          .from("rounds")
          .insert(roundInserts)
          .select();

        if (roundError) throw roundError;

        if (newRounds) {
          newRounds.forEach(r => {
            newRoundMap.set(r.round_number, r.id);
          });
          setCreatedRoundsCount(newRounds.length);
        }
      }

      // Insert fixtures
      const fixtureInserts = validRows.map(r => {
        const finalRoundId = r.resolvedRoundId || newRoundMap.get(r.roundNumber!);
        
        let matchDateStr = null;
        if (r.date && r.time) {
          // ensure time format is somewhat clean
          let timePart = r.time;
          if (timePart.split(':').length === 2) timePart += ":00";
          
          try {
            const dateObj = new Date(`${r.date}T${timePart}`);
            if (!isNaN(dateObj.getTime())) {
              matchDateStr = dateObj.toISOString();
            }
          } catch (e) {
            // fallback
          }
        }

        return {
          round_id: finalRoundId,
          division_id: r.resolvedDivisionId,
          home_team_id: r.resolvedHomeTeamId,
          away_team_id: r.resolvedAwayTeamId,
          venue: r.venue,
          pitch: r.pitch,
          umpire_club_1: r.umpire1 || null,
          umpire_club_2: r.umpire2 || null,
          is_bye: !r.awayTeamName,
          is_locked: false,
          match_date: matchDateStr
        };
      });

      if (fixtureInserts.length > 0) {
        const { error: fixtureError } = await supabase
          .from("fixtures")
          .insert(fixtureInserts);

        if (fixtureError) throw fixtureError;
      }

      setImportedFixturesCount(fixtureInserts.length);
      setImportDone(true);
      onImportComplete();

    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    // Fetch live data from Supabase
    const [{ data: divData }, { data: teamData }, { data: roundData }] = 
      await Promise.all([
        supabase.from('divisions').select('name').order('name'),
        supabase.from('teams').select('name').order('name'),
        supabase.from('rounds').select('name', 'round_number').order('round_number'),
      ]);

    const divisions = [...new Set((divData || []).map(d => d.name))];
    const teams = [...new Set((teamData || []).map(t => t.name))];
    const rounds = (roundData || []).map(r => `Round ${r.round_number} – ${r.name}`);

    // Build the workbook using SheetJS
    const wb = XLSX.utils.book_new();

    // SHEET 1: Blank template with headers
    const templateHeaders = [
      [
        'round_number *',
        'round_name (optional)',
        'date *',
        'time *',
        'venue *',
        'pitch *',
        'grade *',
        'home_team *',
        'away_team (Leave blank for bye)',
        'umpire_1',
        'umpire_2',
      ],
    ];
    const templateSheet = XLSX.utils.aoa_to_sheet(templateHeaders);

    // Set column widths for readability
    templateSheet['!cols'] = [
      { wch: 16 }, { wch: 22 }, { wch: 12 }, { wch: 8 },
      { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 20 },
      { wch: 28 }, { wch: 20 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, templateSheet, 'Fixture Import');

    // SHEET 2: Allowed Values — built from live database data
    // Find the longest column to size the rows correctly
    const maxRows = Math.max(divisions.length, teams.length, rounds.length, 1);

    // Build rows: header row first, then data rows
    const allowedRows: (string | null)[][] = [
      ['Grade (Division)', 'Teams', 'Existing Rounds'],
    ];
    for (let i = 0; i < maxRows; i++) {
      allowedRows.push([
        divisions[i] ?? null,
        teams[i] ?? null,
        rounds[i] ?? null,
      ]);
    }

    const allowedSheet = XLSX.utils.aoa_to_sheet(allowedRows);
    allowedSheet['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, allowedSheet, 'Allowed Values');

    // Trigger download
    XLSX.writeFile(wb, 'fixture_import_template.xlsx');
  };

  const totalErrors = parsedRows.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = parsedRows.reduce((sum, r) => sum + r.warnings.length, 0);
  const totalReady = parsedRows.filter(r => r.errors.length === 0).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex justify-between items-center w-full pr-4">
            <DialogTitle>Import Fixtures</DialogTitle>
            {!file && !importDone && (
              <Button variant="outline" size="sm" onClick={() => { downloadTemplate(); }}>
                Download Template
              </Button>
            )}
          </div>
        </DialogHeader>

        {!file && !importDone && (
          <div className="flex-1 overflow-auto p-1">
            <div 
              className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">Click to select your fixture spreadsheet (.xlsx)</h3>
              <p className="text-sm text-muted-foreground">Upload an Excel file with your schedule.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            <div className="mt-6 text-sm text-muted-foreground bg-muted/30 p-4 rounded-md">
              <p className="font-semibold mb-2">Required Columns:</p>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">round_number</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">date</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">time</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">venue</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">pitch</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">grade</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">home_team</code>
              
              <p className="font-semibold mt-4 mb-2">Optional Columns:</p>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">round_name</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">away_team</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">umpire_1</code>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">umpire_2</code>
            </div>
          </div>
        )}

        {file && !importDone && (
          <div className="flex flex-col flex-1 overflow-hidden min-h-[400px]">
            <div className="flex items-center gap-4 mb-4 text-sm bg-muted/30 p-3 rounded-lg border">
              <span className={`font-semibold ${totalReady > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {totalReady} rows ready
              </span>
              <span className="text-muted-foreground">|</span>
              <span className={`font-semibold ${totalErrors > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {totalErrors} errors
              </span>
              <span className="text-muted-foreground">|</span>
              <span className={`font-semibold ${totalWarnings > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {totalWarnings} warnings
              </span>
              <Button variant="link" size="sm" className="ml-auto" onClick={resetState}>
                Choose a different file
              </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-md relative">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-16">Row #</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Home vs Away</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((r, i) => (
                    <React.Fragment key={i}>
                      <TableRow className={r.errors.length > 0 ? "bg-destructive/5 hover:bg-destructive/10" : ""}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell>{r.roundName}</TableCell>
                        <TableCell>{r.gradeName || "—"}</TableCell>
                        <TableCell>
                          <span className="font-medium">{r.homeTeamName || "—"}</span>
                          <span className="text-muted-foreground mx-2">vs</span>
                          <span className="font-medium">{r.awayTeamName || "BYE"}</span>
                        </TableCell>
                        <TableCell>
                          {r.date} {r.time}
                        </TableCell>
                        <TableCell>
                          {r.errors.length > 0 ? (
                            <Badge variant="destructive" className="flex w-max items-center gap-1">
                              <XCircle className="h-3 w-3" /> {r.errors.length} Error(s)
                            </Badge>
                          ) : r.warnings.length > 0 ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-600 flex w-max items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Warning
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white flex w-max items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Ready
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {(r.errors.length > 0 || r.warnings.length > 0) && (
                        <TableRow className={r.errors.length > 0 ? "bg-destructive/5 hover:bg-destructive/5" : "bg-muted/10 hover:bg-muted/10"}>
                          <TableCell colSpan={6} className="p-2 border-b">
                            <ul className="text-xs space-y-1 list-disc list-inside px-2">
                              {r.errors.map((err, errIdx) => (
                                <li key={`err-${errIdx}`} className="text-destructive font-medium">{err}</li>
                              ))}
                              {r.warnings.map((warn, warnIdx) => (
                                <li key={`warn-${warnIdx}`} className="text-amber-600">{warn}</li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="pt-4 mt-auto">
              {totalErrors > 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Fix {totalErrors} error(s) before importing. Check division names, team names, and date formats.
                  </p>
                  <Button disabled>Import</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Rows with "already exists" warnings will be safely skipped.
                  </p>
                  <Button 
                    onClick={handleImport} 
                    disabled={importing || parsedRows.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {importing ? "Importing..." : `Import ${totalReady} fixtures`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {importDone && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Import Complete</h2>
            <p className="text-muted-foreground">
              Successfully added {importedFixturesCount} fixtures to the database.
            </p>
            {createdRoundsCount > 0 && (
              <p className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
                {createdRoundsCount} new round(s) were created automatically.
              </p>
            )}
            <Button onClick={() => handleOpenChange(false)} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FixtureImport;
