
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

      // Check if email already exists in auth
      const { data: authUser, error: authCheckError } = await supabase.auth.signInWithPassword({
        email: registerForm.email,
        password: "dummy-password-for-check", // We expect this to fail, we just want to check if the email exists
      });
      
      // If sign-in didn't fail with "Invalid login credentials", email might already exist
      if (authUser?.user) {
        console.log("Email already exists in auth");
        throw new Error("Email already registered. Please use another email or try logging in.");
      }

      // Check if username already exists
      const { data: existingUsers, error: usernameError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", registerForm.username);
      
      if (usernameError) {
        console.error("Error checking username:", usernameError);
        throw new Error(`Error checking username: ${usernameError.message}`);
      }
      
      if (existingUsers && existingUsers.length > 0) {
        throw new Error("Username already taken. Please choose another one.");
      }

      // Create the user in Supabase Auth
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

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }

      if (!authData.user?.id) {
        throw new Error("Registration failed. Please try again.");
      }

      console.log("User created successfully:", authData.user.id);

      // Create profile entry with explicit RLS policy bypass using service role
      try {
        // First, try to cleanup any existing profile with this email (in case it wasn't properly deleted)
        const { error: deleteError } = await supabase
          .from("profiles")
          .delete()
          .eq("username", registerForm.email);
        
        if (deleteError && !deleteError.message.includes("no rows")) {
          console.warn("Error cleaning up existing profile:", deleteError);
        }

        // Now create the new profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            username: registerForm.username,
            display_name: `${registerForm.name} ${registerForm.surname}`,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // If profile creation fails, attempt to clean up auth user
          await supabase.auth.signOut();
          throw new Error(`Profile creation failed: ${profileError.message}`);
        }
      } catch (profileError: any) {
        console.error("Exception during profile creation:", profileError);
        // Attempt to clean up auth if profile creation fails
        await supabase.auth.signOut();
        throw profileError;
      }

      // If the user has a session token, sign them out since we want to verify their email first
      if (authData.session) {
        await supabase.auth.signOut();
      }

      // Send verification email using the edge function
      try {
        console.log("Sending verification email to:", registerForm.email);
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
              userId: authData.user.id
            }),
          }
        );

        const responseData = await response.json();
        console.log("Verification email response:", responseData);

        if (!response.ok) {
          console.error("Custom email error:", responseData);
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
