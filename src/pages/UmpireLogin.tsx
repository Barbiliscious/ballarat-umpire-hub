import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

type Step = "email" | "signup";

const UmpireLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("check-umpire-email", {
        body: { action: "check", email: email.trim() },
      });

      if (error) {
        toast.error("Failed to check email");
        setLoading(false);
        return;
      }

      if (data?.is_disabled) {
        toast.error("This account has been disabled. Contact an administrator.");
        setLoading(false);
        return;
      }

      if (data?.exists) {
        const { data: signinData, error: signinError } = await supabase.functions.invoke("check-umpire-email", {
          body: { action: "signin", email: email.trim() },
        });

        if (signinError || signinData?.error || !signinData?.hashed_token) {
          toast.error(signinData?.error || signinError?.message || "Failed to sign in");
          setLoading(false);
          return;
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: signinData.hashed_token,
          type: "email",
        });

        if (verifyError) {
          toast.error(verifyError.message);
          setLoading(false);
          return;
        }

        navigate("/umpire/vote");
      } else {
        setStep("signup");
      }
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  };

  const handleSignupAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("check-umpire-email", {
      body: {
        action: "create-and-signin",
        email: email.trim(),
        full_name: fullName.trim(),
      },
    });

    if (error || data?.error || !data?.hashed_token) {
      toast.error(data?.error || error?.message || "Failed to create account");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: data.hashed_token,
      type: "email",
    });

    if (verifyError) {
      toast.error(verifyError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/umpire/vote");
  };

  const resetToEmail = () => {
    setStep("email");
    setFullName("");
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="border-b bg-primary">
        <div className="container flex h-14 items-center relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-primary-foreground hover:bg-accent"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <span className="absolute left-1/2 -translate-x-1/2 text-primary-foreground font-bold tracking-wide uppercase text-sm">Umpire Portal</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Umpire Sign In</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">After each match, use this to record the best players in your game.</p>
            <CardDescription>
              {step === "email" && "Enter your email to get started"}
              {step === "signup" && "Just enter your name to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Email */}
            {step === "email" && (
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="umpire@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Checking..." : "Continue"}
                </Button>
              </form>
            )}

            {/* Step 2: New user signup */}
            {step === "signup" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Welcome! What's your name?
                </p>
                <form onSubmit={handleSignupAndLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full text-base font-semibold py-6" disabled={loading}>
                    {loading ? "Continuing..." : "Continue to voting"}
                  </Button>
                </form>
                <Button type="button" variant="link" size="sm" className="w-full" onClick={resetToEmail}>
                  Use a different email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UmpireLogin;
