import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { LayoutDashboard, FileText, Settings, Users, LogOut, Trophy, MapPin, Calendar, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/submissions", icon: FileText, label: "Submissions" },
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

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [user, isAdmin, isLoading, navigate]);

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
        <div className="p-3 border-t border-sidebar-border">
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
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
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
    </div>
  );
};

export default AdminLayout;
