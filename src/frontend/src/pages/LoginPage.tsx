import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Leaf } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";

export default function LoginPage() {
  const { login } = useAuth();
  const { actor } = useActor();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const profile = actor ? await actor.getCallerUserProfile() : null;
      if (profile) {
        login({ name: profile.name, email: profile.email, role: profile.role });
      } else {
        // First time - create a basic profile
        const name = email.split("@")[0];
        const newProfile = { name, email, role: "user" };
        if (actor) await actor.saveCallerUserProfile(newProfile);
        login(newProfile);
      }
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #0F2A3A 0%, #142D3E 50%, #0F2A3A 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#14B8A6" }}
          >
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white">
            Mahara CRM
          </h1>
          <p className="text-sm mt-1" style={{ color: "#C7D2DE" }}>
            School Enrollment Management
          </p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@maharaschool.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-ocid="login.input"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-ocid="login.input"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: "#14B8A6" }}
                disabled={loading}
                data-ocid="login.submit_button"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-medium"
                style={{ color: "#14B8A6" }}
                data-ocid="login.register.link"
              >
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
