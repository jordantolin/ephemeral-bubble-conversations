
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Info, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
    color: "text-gray-400",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/");
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate("/");
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const checkPasswordStrength = (password: string) => {
    // Reset if empty
    if (!password) {
      setPasswordStrength({
        score: 0,
        message: "",
        color: "text-gray-400"
      });
      return;
    }

    let score = 0;
    let feedback = [];

    // Length check
    if (password.length < 8) {
      feedback.push("Use at least 8 characters");
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      feedback.push("Add uppercase letters");
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      feedback.push("Add lowercase letters");
    } else {
      score += 1;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      feedback.push("Add numbers");
    } else {
      score += 1;
    }

    // Special character check
    if (!/[^A-Za-z0-9]/.test(password)) {
      feedback.push("Add special characters");
    } else {
      score += 1;
    }

    let message = "";
    let color = "";

    // Determine strength message based on score
    if (score <= 1) {
      message = "Very Weak";
      color = "text-red-500";
    } else if (score === 2) {
      message = "Weak";
      color = "text-orange-500";
    } else if (score === 3) {
      message = "Fair";
      color = "text-yellow-500";
    } else if (score === 4) {
      message = "Good";
      color = "text-green-400";
    } else {
      message = "Strong";
      color = "text-green-600";
    }

    setPasswordStrength({
      score,
      message: message + (feedback.length > 0 ? `: ${feedback[0]}` : ""),
      color
    });
  };

  const validateForm = () => {
    if (!email || !password) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const validateSignUpForm = () => {
    if (!validateForm()) return false;

    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username",
        variant: "destructive",
      });
      return false;
    }

    if (username.length < 3 || username.length > 20) {
      toast({
        title: "Invalid username",
        description: "Username must be between 3 and 20 characters",
        variant: "destructive",
      });
      return false;
    }

    if (!fullName.trim()) {
      toast({
        title: "Full name required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return false;
    }

    if (passwordStrength.score < 3) {
      toast({
        title: "Password not strong enough",
        description: passwordStrength.message,
        variant: "destructive",
      });
      return false;
    }

    if (!acceptedTerms) {
      toast({
        title: "Terms not accepted",
        description: "Please accept the terms and conditions",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignUpForm()) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          },
          emailRedirectTo: window.location.origin, // Redirect to the app after confirmation
        },
      });
      
      if (error) throw error;

      // Create a profile entry in the users table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            full_name: fullName,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }

        // Send a custom welcome email via our function
        try {
          const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
            body: { 
              email, 
              name: fullName, 
              username 
            }
          });
          
          if (emailError) {
            console.error("Error sending welcome email:", emailError);
          }
        } catch (emailError) {
          console.error("Failed to call send-welcome-email function:", emailError);
        }
      }
      
      // Save the email for the success message
      setSignupEmail(email);
      setSignupSuccess(true);
      
      toast({
        title: "Account created!",
        description: "Please check your email for verification.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          // Handle the specific case of unconfirmed email
          toast({
            title: "Email not confirmed",
            description: "Please check your inbox and confirm your email before signing in.",
            variant: "destructive",
          });
          throw new Error("Please verify your email before signing in");
        }
        throw error;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmationEmail = async () => {
    if (!signupEmail) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Confirmation email resent",
        description: "Please check your inbox for the verification link",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show success screen after signup
  if (signupSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-block">
              <img
                src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                alt="Bubble Trouble"
                className="mx-auto h-16 w-16"
              />
              <h1 className="mt-4 text-3xl font-bold text-[#ebbd34]">Bubble Trouble</h1>
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-[#ebbd34]/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-[#ebbd34]" />
              </div>
              <h2 className="text-2xl font-bold text-[#ebbd34]">Verify Your Email</h2>
              <p className="mt-2 text-[#ebbd34]/70">
                We've sent a verification link to <span className="font-medium">{signupEmail}</span>
              </p>
            </div>
            
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Check your inbox</AlertTitle>
              <AlertDescription className="text-blue-700">
                You'll receive an email from <span className="font-medium">bubbletroubleapp@gmail.com</span> with a verification link.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <Button
                onClick={resendConfirmationEmail}
                className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                disabled={loading}
              >
                {loading ? "Sending..." : "Resend Confirmation Email"}
              </Button>
              
              <div className="text-center">
                <button
                  onClick={() => setSignupSuccess(false)}
                  className="text-sm text-[#ebbd34] hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <img
              src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
              alt="Bubble Trouble"
              className="mx-auto h-16 w-16"
            />
            <h1 className="mt-4 text-3xl font-bold text-[#ebbd34]">Bubble Trouble</h1>
          </Link>
          <p className="mt-2 text-[#ebbd34]/70">Sign in to join the bubble conversations!</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="signin" className="rounded-lg text-[#ebbd34]">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-[#ebbd34]">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="signin-email" className="text-[#ebbd34]">
                    Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signin-password" className="text-[#ebbd34]">
                    Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="signup-email" className="text-[#ebbd34] flex items-center">
                    Email <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="signup-username" className="text-[#ebbd34] flex items-center">
                    Username <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="BubbleExplorer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                    minLength={3}
                    maxLength={20}
                  />
                  <p className="text-xs text-[#ebbd34]/60 mt-1">
                    3-20 characters. This will be your public identifier.
                  </p>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="signup-fullname" className="text-[#ebbd34] flex items-center">
                    Full Name <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="signup-password" className="text-[#ebbd34] flex items-center">
                    Password <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                    required
                    className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                    minLength={8}
                  />
                  {password && (
                    <div className="flex items-center mt-1 text-xs">
                      <div className="w-full h-1.5 bg-gray-200 rounded-full mr-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            passwordStrength.score === 1 ? "bg-red-500" : 
                            passwordStrength.score === 2 ? "bg-orange-500" : 
                            passwordStrength.score === 3 ? "bg-yellow-500" : 
                            passwordStrength.score === 4 ? "bg-green-400" : 
                            passwordStrength.score === 5 ? "bg-green-600" : "bg-gray-300"
                          }`} 
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className={passwordStrength.color}>{passwordStrength.message}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="signup-confirm-password" className="text-[#ebbd34] flex items-center">
                    Confirm Password <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20 ${
                      confirmPassword && password !== confirmPassword ? "border-red-500" : ""
                    }`}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Passwords don't match
                    </p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-500 mt-1 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Passwords match
                    </p>
                  )}
                </div>
                
                <div className="flex items-start space-x-2 mt-4">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 border-[#ebbd34]/20"
                    required
                  />
                  <Label htmlFor="terms" className="text-xs text-[#ebbd34]/80 font-normal">
                    I agree to the <Link to="#" className="underline text-[#ebbd34] hover:text-[#ebbd34]/70">Terms of Service</Link> and <Link to="#" className="underline text-[#ebbd34] hover:text-[#ebbd34]/70">Privacy Policy</Link>. <span className="text-red-500">*</span>
                  </Label>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white mt-4"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
                
                <div className="text-xs text-center text-[#ebbd34]/60 mt-4 flex items-center justify-center">
                  <Info className="w-3 h-3 mr-1" /> Fields marked with <span className="text-red-500 mx-1">*</span> are required
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
