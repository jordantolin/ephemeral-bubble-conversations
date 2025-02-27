
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
    const confirmEmail = async () => {
      try {
        setIsConfirming(true);
        
        // Try to sign in directly - this will work if email confirmation is disabled in Supabase
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          // If the normal sign in fails due to email confirmation, try to use admin API to confirm
          console.error("Sign in failed:", signInError.message);
          
          if (signInError.message.includes("Email not confirmed")) {
            // This would require a server-side function to confirm the email
            // For now, we'll instruct the user to check their email
            setError("Please check your email to confirm your account before logging in");
          } else {
            setError(signInError.message);
          }
        } else {
          // Successfully signed in
          toast({
            title: "Account created and logged in",
            description: "Welcome to Bubble Trouble!",
          });
          navigate("/");
        }
      } catch (err: any) {
        console.error("Auto confirm error:", err);
        setError(err.message || "Failed to confirm email automatically");
      } finally {
        setIsConfirming(false);
      }
    };

    confirmEmail();
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
          <CardTitle className="text-[#ebbd34]">Email confirmation required</CardTitle>
          <CardDescription>We've sent you a confirmation email</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Please check your inbox at <strong>{email}</strong> and click the confirmation link.</p>
          <p className="text-sm text-gray-500">If you don't see the email, check your spam folder.</p>
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
