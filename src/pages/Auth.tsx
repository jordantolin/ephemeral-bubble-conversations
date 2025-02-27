
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

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
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
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

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
                  <Label htmlFor="signup-email" className="text-[#ebbd34]">
                    Email
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
                  <Label htmlFor="signup-password" className="text-[#ebbd34]">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
