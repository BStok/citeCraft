import { useState } from "react";
import { useLocation } from "wouter";
import { apiFetch, setToken, loginWithGoogle } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!username || !password) return;
    setLoading(true);

    try {
      const path = isRegister ? "/auth/register" : "/auth/login";

      let res: Response;
      if (isRegister) {
        res = await apiFetch(path, {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
      } else {
        const form = new URLSearchParams();
        form.append("username", username);
        form.append("password", password);
        res = await apiFetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Error",
          description: data.detail || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      setToken(data.access_token);
      localStorage.setItem("username", data.username);
      navigate("/app");
    } catch (e) {
      toast({
        title: "Error",
        description: "Could not connect to server.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Google login handler
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const data = await loginWithGoogle();
      setToken(data.token); // backend returns your JWT
      navigate("/app");
    } catch (e) {
      toast({
        title: "Error",
        description: "Google login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {isRegister ? "Create an account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Sign up to start using CiteCraft"
              : "Sign in to your CiteCraft account"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ✅ Google Login Button */}
          <Button
            className="w-full"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="text-center text-sm text-muted-foreground">or</div>

          {/* Existing form */}
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
              ? "Register"
              : "Login"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <button
              className="text-primary underline"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Login" : "Register"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}