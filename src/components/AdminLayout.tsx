import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, FileText, Settings, Users, LogOut, Trophy, MapPin, Calendar, Layers, PlusCircle, KeyRound, Award, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";


const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/submissions", icon: FileText, label: "Submissions" },
  { to: "/admin/submit-vote", icon: PlusCircle, label: "Submit Vote" },
  { to: "/admin/leaderboard", icon: Award, label: "Leaderboard" },
  { to: "/admin/rounds", icon: Calendar, label: "Rounds" },
  { to: "/admin/divisions", icon: Layers, label: "Divisions" },
  { to: "/admin/teams", icon: Trophy, label: "Teams" },
  { to: "/admin/fixtures", icon: MapPin, label: "Fixtures" },
  { to: "/admin/venues", icon: Building2, label: "Venues" },
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
