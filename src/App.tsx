import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UmpireLogin from "./pages/UmpireLogin";
import AdminLogin from "./pages/AdminLogin";
import ResetPassword from "./pages/ResetPassword";
import UmpireVote from "./pages/UmpireVote";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Submissions from "./pages/admin/Submissions";
import ManageRounds from "./pages/admin/ManageRounds";
import ManageDivisions from "./pages/admin/ManageDivisions";
import ManageTeams from "./pages/admin/ManageTeams";
import ManageFixtures from "./pages/admin/ManageFixtures";
import ManageUsers from "./pages/admin/ManageUsers";
import AuditLog from "./pages/admin/AuditLog";
import AdminVoteSubmit from "./pages/admin/AdminVoteSubmit";
import ManageUmpires from "./pages/admin/ManageUmpires";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/umpire/login" element={<UmpireLogin />} />
            <Route path="/umpire/vote" element={<UmpireVote />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="submit-vote" element={<AdminVoteSubmit />} />
              <Route path="rounds" element={<ManageRounds />} />
              <Route path="divisions" element={<ManageDivisions />} />
              <Route path="teams" element={<ManageTeams />} />
              <Route path="fixtures" element={<ManageFixtures />} />
              <Route path="umpires" element={<ManageUmpires />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="audit" element={<AuditLog />} />
            </Route>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
