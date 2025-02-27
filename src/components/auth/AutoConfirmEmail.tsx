
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AutoConfirmEmailProps {
  email: string;
  password: string;
}

export function AutoConfirmEmail({ email, password }: AutoConfirmEmailProps) {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    const attemptAutoLogin = async () => {
      try {
        setIsConfirming(true);
        
        // First - try direct login
        console.log("Attempting direct login for:", email);
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          console.error("Direct login failed:", signInError.message);
          
          // If we get "Email not confirmed" error, try a workaround
          if (signInError.message.includes("Email not confirmed")) {
            // Try to get user by email (for apps with custom confirmation flow)
            const { data: userData, error: userError } = await supabase.auth.signUp({
              email,
              password
            });
            
            if (userError) {
              console.error("User lookup failed:", userError);
              throw userError;
            }
            
            // If user exists but needs email confirmation
            if (userData.user) {
              // If Email not confirmed error and user exists, we'll show a specific message
              setError("Your account exists but needs email confirmation. Please check your inbox.");
              return;
            } else {
              throw new Error("Could not complete registration. Please try again.");
            }
          } else {
            throw signInError;
          }
        } else {
          // Successfully signed in
          console.log("Auto-login successful");
          toast({
            title: "Account created and logged in",
            description: "Welcome to Bubble Trouble!",
          });
          navigate("/");
        }
      } catch (err: any) {
        console.error("Auto-login error:", err);
        setError(err.message || "Failed to log in automatically");
      } finally {
        setIsConfirming(false);
      }
    };

    attemptAutoLogin();
  }, [email, password, toast, navigate]);

  const handleTryAgain = () => {
    window.location.href = "/auth";
  };

  if (isConfirming) {
    return (
      <Card className="border-[#ebbd34]/20 bg-white/80 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-[#ebbd34]">Setting up your account...</CardTitle>
          <CardDescription>This will only take a moment</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <Loader2 className="h-12 w-12 animate-spin text-[#ebbd34]" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-[#ebbd34]/20 bg-white/80 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-[#ebbd34]">Email verification bypassed</CardTitle>
          <CardDescription>Your account has been created</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">We tried to automatically log you in with <strong>{email}</strong> but couldn't complete the process.</p>
          <p className="text-sm text-gray-500">Please try logging in manually, or check your email for a verification link.</p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleTryAgain}
            className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
          >
            Back to login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
