import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ManageUsers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]).then(([p, r]) => {
      if (p.data) setProfiles(p.data);
      if (r.data) setRoles(r.data);
    });
  }, []);

  const getUserRoles = (userId: string) =>
    roles.filter((r) => r.user_id === userId).map((r) => r.role);

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Users</h1>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Roles</TableHead><TableHead>First Login</TableHead><TableHead>Last Login</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.email}</TableCell>
                <TableCell>{p.full_name || "—"}</TableCell>
                <TableCell>
                  {getUserRoles(p.user_id).map((r) => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">{r}</Badge>
                  ))}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.first_login ? new Date(p.first_login).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.last_login ? new Date(p.last_login).toLocaleDateString() : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ManageUsers;
