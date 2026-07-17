import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/BrandHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const USERNAME_RE = /^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/;
const USERNAME_DOMAIN = "users.vbooka.local";
const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) return toast.error("Username must look like firstname.lastname");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(u), password });
    setLoading(false);
    if (error) return toast.error("Invalid username or password");
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) return toast.error("Enter your recovery email");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("If that email is on file, a reset link has been sent.");
    setShowForgot(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) {
      return toast.error("Username must be firstname.lastname (letters only, e.g. ally.mhando)");
    }
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      return toast.error("Recovery email is not valid");
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(u),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          department,
          username: u,
          recovery_email: recoveryEmail.trim().toLowerCase() || null,
        },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return toast.error("That username is already taken");
      }
      return toast.error(error.message);
    }
    toast.success("Account created! Signing you in…");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader />
      <div className="container mx-auto flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Staff & Invigilator access</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in with your Mzumbe University email. Students don't need an account —{" "}
              <Link to="/find-exam" className="text-primary underline">look up your exam here</Link>.
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                {showForgot ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-reset">Email for reset instructions</Label>
                      <Input
                        id="email-reset"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        placeholder="you@mzumbe.ac.tz"
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll email you a secure link to set a new password.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending…" : "Send reset link"}
                    </Button>
                    <button
                      type="button"
                      className="w-full text-center text-sm text-primary underline"
                      onClick={() => setShowForgot(false)}
                    >
                      Back to sign in
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-in">Email</Label>
                      <Input id="email-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@mzumbe.ac.tz" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pass-in">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-primary underline"
                          onClick={() => { setResetEmail(email); setShowForgot(true); }}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input id="pass-in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                )}
              </TabsContent>


              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-up">Full name</Label>
                    <Input id="name-up" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Dr. Jane Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept-up">Department</Label>
                    <Input id="dept-up" value={department} onChange={(e) => setDepartment(e.target.value)} required placeholder="e.g. School of Business" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-up">University email</Label>
                    <Input id="email-up" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@mzumbe.ac.tz" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-up">Password</Label>
                    <Input id="pass-up" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                    <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
