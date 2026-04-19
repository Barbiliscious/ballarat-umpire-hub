import { useNavigate } from "react-router-dom";
import { Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-primary">
        <div className="container flex h-16 items-center justify-center">
          <h1 className="text-xl font-bold text-primary-foreground tracking-wide uppercase">
            Umpire Portal
          </h1>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-3xl w-full text-center space-y-10">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-foreground md:text-5xl">
              Ballarat Hockey Association
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Umpires — submit your best player votes after each match
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 max-w-lg mx-auto">
            {/* Umpire Gate */}
            <button
              onClick={() => navigate("/umpire/login")}
              className="group relative flex flex-col items-center gap-4 rounded-lg border-2 border-primary bg-primary p-8 text-primary-foreground transition-all hover:bg-accent active:scale-[0.98]"
            >
              <Users className="h-10 w-10" />
              <div className="space-y-1">
                <span className="text-lg font-semibold">Umpire Login</span>
                <p className="text-sm opacity-80">Submit your 3-2-1 best player votes</p>
              </div>
            </button>

            {/* Admin Gate */}
            <button
              onClick={() => navigate("/admin/login")}
              className="group relative flex flex-col items-center gap-4 rounded-lg border-2 border-primary bg-background p-8 text-foreground transition-all hover:bg-secondary active:scale-[0.98]"
            >
              <Shield className="h-10 w-10 text-primary" />
              <div className="space-y-1">
                <span className="text-lg font-semibold">Admin Portal</span>
                <p className="text-sm text-muted-foreground">Manage rounds, fixtures and results</p>
              </div>
            </button>
          </div>
        </div>
      </main>

    </div>
  );
};

export default Index;
