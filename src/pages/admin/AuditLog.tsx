import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const AuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("audit_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setLogs(data);
      });
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Timestamp</TableHead><TableHead>Table</TableHead><TableHead>Action</TableHead><TableHead>Record ID</TableHead><TableHead>Details</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit entries yet</TableCell></TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">{new Date(log.changed_at).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{log.table_name}</TableCell>
                <TableCell>
                  <Badge variant={log.action === "DELETE" ? "destructive" : log.action === "INSERT" ? "default" : "secondary"}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{log.record_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-xs max-w-xs truncate">
                  {log.new_data ? JSON.stringify(log.new_data).slice(0, 80) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AuditLog;
