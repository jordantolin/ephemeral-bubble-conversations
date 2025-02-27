
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    surname: "",
    username: "",
  });

  // Get redirect path from location state or default to home
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  // Check for verification token in URL
  useEffect(() => {
    const verificationToken = searchParams.get('verification_token');
    if (verificationToken) {
      handleEmailVerification(verificationToken);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(from);
    }
  }, [user, navigate, from]);

  const handleEmailVerification = async (token: string) => {
    setVerifyingToken(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) throw error;

      toast({
        title: "Email verified successfully",
        description: "Your account is now active. Please log in.",
      });

    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired verification link",
        variant: "destructive",
      });
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!loginForm.email || !loginForm.password) {
        throw new Error("Please fill in all fields");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) throw error;

      toast({
        title: "Login successful!",
        description: "Welcome back to Bubble Trouble",
      });
      
      // Navigate to the page the user was trying to access before being redirected to login
      navigate(from);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (
        !registerForm.email ||
        !registerForm.password ||
        !registerForm.confirmPassword ||
        !registerForm.name ||
        !registerForm.surname ||
        !registerForm.username
      ) {
        throw new Error("Please fill in all fields");
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (registerForm.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Check if username already exists
      const { data: existingUsers, error: usernameError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", registerForm.username);
      
      if (usernameError) throw usernameError;
      
      if (existingUsers && existingUsers.length > 0) {
        throw new Error("Username already taken. Please choose another one.");
      }

      // Disable Supabase's auto-email and use our custom email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            full_name: `${registerForm.name} ${registerForm.surname}`,
            name: registerForm.name,
            surname: registerForm.surname,
            username: registerForm.username,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (authError) throw authError;

      if (!authData.user?.id) {
        throw new Error("Registration failed. Please try again.");
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          username: registerForm.username,
          display_name: `${registerForm.name} ${registerForm.surname}`,
        });

      if (profileError) {
        // Attempt to clean up auth if profile creation fails
        await supabase.auth.signOut();
        throw profileError;
      }

      // If the user has a session token, sign them out since we want to verify their email first
      if (authData.session) {
        await supabase.auth.signOut();
      }

      // Now send our custom email
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              email: registerForm.email,
              username: registerForm.username,
              verificationToken: authData.user.confirmation_token
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Custom email error:", errorData);
          // Continue with registration even if custom email fails
        }
      } catch (emailError) {
        console.error("Error sending custom verification email:", emailError);
        // Continue with registration even if custom email fails
      }

      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account before logging in.",
      });
      
      // Reset form
      setRegisterForm({
        email: "",
        password: "",
        confirmPassword: "",
        name: "",
        surname: "",
        username: "",
      });

    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] p-4">
        <div className="text-center">
          <img 
            src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
            alt="Bubble Trouble" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-xl font-bold text-[#ebbd34] mb-4">Verifying your email...</h1>
          <Loader2 className="h-8 w-8 animate-spin text-[#ebbd34] mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
            alt="Bubble Trouble" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#ebbd34]">Bubble Trouble</h1>
          <p className="text-[#ebbd34]/80">Join conversations that matter</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-[#ebbd34]/20 bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-[#ebbd34]">Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to continue</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
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
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit"
                    className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-[#ebbd34]/20 bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-[#ebbd34]">Create an Account</CardTitle>
                <CardDescription>Fill in your details to get started</CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">First Name</Label>
                      <Input
                        id="register-name"
                        name="name"
                        type="text"
                        placeholder="John"
                        value={registerForm.name}
                        onChange={handleRegisterChange}
                        className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-surname">Last Name</Label>
                      <Input
                        id="register-surname"
                        name="surname"
                        type="text"
                        placeholder="Doe"
                        value={registerForm.surname}
                        onChange={handleRegisterChange}
                        className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      name="username"
                      type="text"
                      placeholder="johndoe"
                      value={registerForm.username}
                      onChange={handleRegisterChange}
                      className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="yourname@example.com"
                      value={registerForm.email}
                      onChange={handleRegisterChange}
                      className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={handleRegisterChange}
                      className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <Input
                      id="register-confirm-password"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={handleRegisterChange}
                      className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit"
                    className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Register"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
