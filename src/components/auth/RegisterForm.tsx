
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    surname: "",
    username: "",
  });

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Basic form validation
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

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            username: registerForm.username,
            full_name: `${registerForm.name} ${registerForm.surname}`,
            name: registerForm.name,
            surname: registerForm.surname,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Registration failed. Please try again.");
      }

      // Sign out the user so they can verify their email
      await supabase.auth.signOut();

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
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
}
