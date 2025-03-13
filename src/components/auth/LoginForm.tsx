
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface LocationState {
  from?: {
    pathname: string;
  };
}

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // Get redirect path from location state or default to home
  const from = (location.state as LocationState)?.from?.pathname || "/";

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear error when user starts typing
    if (error) setError(null);
    
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!loginForm.email) {
        throw new Error("Email is required");
      }
      
      if (!loginForm.password) {
        throw new Error("Password is required");
      }

      console.log("Attempting login for:", loginForm.email);
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (authError) {
        console.error("Login error:", authError);
        throw authError;
      }

      toast({
        title: "Login successful!",
        description: "Welcome back to Bubble Trouble",
      });
      
      // Navigate to the page the user was trying to access before being redirected to login
      navigate(from);
    } catch (error: any) {
      console.error("Login process error:", error);
      setError(error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-[#ebbd34]/20 bg-white/80 backdrop-blur-md w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-[#ebbd34]">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex items-start">
                <div className="py-1">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                </div>
                <div>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              placeholder="yourname@example.com"
              value={loginForm.email}
              onChange={handleLoginChange}
              className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
              required
              aria-invalid={error && !loginForm.email ? "true" : "false"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={loginForm.password}
              onChange={handleLoginChange}
              className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
              required
              aria-invalid={error && !loginForm.password ? "true" : "false"}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button 
            type="submit"
            className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>
          <p className="text-sm text-gray-500">
            Don't have an account? <a href="/auth?tab=register" className="text-[#ebbd34] hover:underline">Sign up</a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
