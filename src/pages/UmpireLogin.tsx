import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, MailCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Step = "email" | "login" | "signup" | "magic-sent";

const UmpireLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  // Login state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Signup state
  const [fullName, setFullName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

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
        setStep("login");
      } else {
        setStep("signup");
      }
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/umpire/vote");
    }
  };

  const handleSendMagicLink = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + "/umpire/vote",
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setStep("magic-sent");
      toast.success("Check your email for the sign-in link");
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent");
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (signupPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (signupPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("check-umpire-email", {
      body: {
        action: "create",
        email: email.trim(),
        password: signupPassword,
        full_name: fullName.trim(),
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to create account");
      setLoading(false);
      return;
    }

    // Now sign in
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: signupPassword,
    });

    setLoading(false);
    if (signInErr) {
      toast.error("Account created but sign-in failed. Try logging in.");
      setStep("login");
    } else {
      navigate("/umpire/vote");
    }
  };

  const resetToEmail = () => {
    setStep("email");
    setPassword("");
    setSignupPassword("");
    setConfirmPassword("");
    setFullName("");
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="border-b bg-primary">
        <div className="container flex h-14 items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-primary-foreground hover:bg-accent"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Umpire Sign In</CardTitle>
            <CardDescription>
              {step === "email" && "Enter your email to get started"}
              {step === "login" && "Enter your password to sign in"}
              {step === "signup" && "Create your umpire account"}
              {step === "magic-sent" && "We've sent a sign-in link to your email"}
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

            {/* Step 2a: Existing user login */}
            {step === "login" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Signing in as <strong>{email}</strong>
                </p>
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Forgot password?
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleSendMagicLink}
                    disabled={loading}
                  >
                    Send me a one-time link instead
                  </Button>
                </div>
                <Button type="button" variant="link" size="sm" className="w-full" onClick={resetToEmail}>
                  Use a different email
                </Button>
              </div>
            )}

            {/* Step 2b: New user signup */}
            {step === "signup" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Creating account for <strong>{email}</strong>
                </p>
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name *</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="signupPassword"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Create a password (min 6 chars)"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating..." : "Create account"}
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleSendMagicLink}
                  disabled={loading}
                >
                  Send me a one-time link instead
                </Button>
                <Button type="button" variant="link" size="sm" className="w-full" onClick={resetToEmail}>
                  Use a different email
                </Button>
              </div>
            )}

            {/* Magic link sent */}
            {step === "magic-sent" && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <MailCheck className="h-12 w-12 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the link in the email sent to <strong>{email}</strong> to sign in.
                </p>
                <Button type="button" variant="ghost" className="w-full" onClick={resetToEmail}>
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
