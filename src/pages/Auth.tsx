
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { VerifyingEmail } from "@/components/auth/VerifyingEmail";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Get redirect path from location state or default to home
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  // Check for verification tokens in URL
  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('verification_token');
    const type = searchParams.get('type');
    const userId = searchParams.get('user_id');
    
    if (token && (type === 'signup' || type === 'recovery' || !type)) {
      handleEmailVerification(token, type || 'signup', userId);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/"); // Take them to the home page
    }
  }, [user, navigate]);

  // Handle email verification
  const handleEmailVerification = async (token: string, type: string, userId: string | null) => {
    setVerifyingToken(true);
    try {
      console.log(`Verifying ${type} token:`, token);
      
      // For signup verification
      if (type === 'signup') {
        // First try standard verification
        let { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });

        if (error) {
          // If standard verification fails, try email verification
          console.error("Standard verification failed:", error);
          
          const { error: emailVerificationError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
          });
          
          if (emailVerificationError) {
            throw emailVerificationError;
          }
        }
      }
      // Add handling for password recovery if needed
      
      toast({
        title: "Email verified successfully",
        description: "Your account is now active. Please log in.",
      });
      
      // Switch to login tab after successful verification
      setActiveTab("login");

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

  if (verifyingToken) {
    return <VerifyingEmail />;
  }

  return (
    <AuthLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <LoginForm />
        </TabsContent>

        <TabsContent value="register">
          <RegisterForm />
        </TabsContent>
      </Tabs>
    </AuthLayout>
  );
}
