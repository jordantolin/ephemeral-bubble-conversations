
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

  // Check for verification tokens in URL (both standard and custom)
  useEffect(() => {
    // Check for the standard Supabase verification token
    const standardVerificationToken = searchParams.get('verification_token');
    // Check for our custom verification token
    const customVerificationToken = searchParams.get('custom_verification_token');
    const userId = searchParams.get('user_id');

    if (standardVerificationToken) {
      handleStandardEmailVerification(standardVerificationToken);
    } else if (customVerificationToken && userId) {
      handleCustomEmailVerification(customVerificationToken, userId);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/"); // Take them to the home page which should show the 3D bubble world
    }
  }, [user, navigate]);

  // Handle standard Supabase verification
  const handleStandardEmailVerification = async (token: string) => {
    setVerifyingToken(true);
    try {
      console.log("Verifying standard token:", token);
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) throw error;

      console.log("Standard verification successful:", data);
      toast({
        title: "Email verified successfully",
        description: "Your account is now active. Please log in to enter your 3D bubble world.",
      });
      
      // Switch to login tab after successful verification
      setActiveTab("login");

    } catch (error: any) {
      console.error("Standard verification error:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired verification link",
        variant: "destructive",
      });
    } finally {
      setVerifyingToken(false);
    }
  };

  // Handle our custom verification method
  const handleCustomEmailVerification = async (token: string, userId: string) => {
    setVerifyingToken(true);
    try {
      console.log("Verifying custom token for user:", userId);
      
      // Retrieve the user to check the token
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError) {
        console.error("Error fetching user:", userError);
        throw new Error("Invalid user ID");
      }
      
      // Verify the token matches what we stored in metadata
      const storedToken = userData.user.user_metadata?.verification_token;
      const tokenExpires = userData.user.user_metadata?.verification_token_expires_at;
      
      if (!storedToken || storedToken !== token) {
        throw new Error("Invalid verification token");
      }
      
      if (tokenExpires && new Date(tokenExpires) < new Date()) {
        throw new Error("Verification token has expired");
      }
      
      // Token is valid, confirm the user's email
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );
      
      if (updateError) {
        throw updateError;
      }
      
      console.log("Custom verification successful for user:", userId);
      toast({
        title: "Email verified successfully",
        description: "Your account is now active. Please log in to enter your 3D bubble world.",
      });
      
      // Switch to login tab after successful verification
      setActiveTab("login");
      
    } catch (error: any) {
      console.error("Custom verification error:", error);
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
