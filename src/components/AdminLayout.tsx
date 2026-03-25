import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, FileText, Settings, Users, LogOut, Trophy, MapPin, Calendar, Layers, PlusCircle, KeyRound, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/submissions", icon: FileText, label: "Submissions" },
  { to: "/admin/submit-vote", icon: PlusCircle, label: "Submit Vote" },
  { to: "/admin/rounds", icon: Calendar, label: "Rounds" },
  { to: "/admin/divisions", icon: Layers, label: "Divisions" },
  { to: "/admin/teams", icon: Trophy, label: "Teams" },
  { to: "/admin/fixtures", icon: MapPin, label: "Fixtures" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/audit", icon: Settings, label: "Audit Log" },
];

const AdminLayout = () => {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password changed successfully");
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-secondary">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="font-bold text-sm uppercase tracking-wider text-sidebar-primary">BHA Admin</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChangePassword(true)}
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <KeyRound className="mr-2 h-4 w-4" /> Change Password
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden border-b bg-primary p-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-primary-foreground uppercase">BHA Admin</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setShowChangePassword(true)} className="text-primary-foreground">
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 mt-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap ${
                    isActive ? "bg-accent text-accent-foreground font-medium" : "text-primary-foreground/70"
                  }`
                }
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="w-full">
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLayout;
