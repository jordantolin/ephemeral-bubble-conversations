
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
        navigate("/"); // This will redirect to the homepage which shows the 3D world
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          // When the user signs in, immediately redirect to the homepage
          navigate("/");
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const checkPasswordStrength = (password: string) => {
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
      feedback.push("Usa almeno 8 caratteri");
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      feedback.push("Aggiungi lettere maiuscole");
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      feedback.push("Aggiungi lettere minuscole");
    } else {
      score += 1;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      feedback.push("Aggiungi numeri");
    } else {
      score += 1;
    }

    // Special character check
    if (!/[^A-Za-z0-9]/.test(password)) {
      feedback.push("Aggiungi caratteri speciali");
    } else {
      score += 1;
    }

    let message = "";
    let color = "";

    // Determine strength message based on score
    if (score <= 1) {
      message = "Molto debole";
      color = "text-red-500";
    } else if (score === 2) {
      message = "Debole";
      color = "text-orange-500";
    } else if (score === 3) {
      message = "Discreta";
      color = "text-yellow-500";
    } else if (score === 4) {
      message = "Buona";
      color = "text-green-400";
    } else {
      message = "Forte";
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
        title: "Campi obbligatori mancanti",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Formato email non valido",
        description: "Inserisci un indirizzo email valido",
        variant: "destructive",
      });
      return false;
    }

    if (password.length < 8) {
      toast({
        title: "Password troppo corta",
        description: "La password deve contenere almeno 8 caratteri",
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
        title: "Username richiesto",
        description: "Inserisci un username",
        variant: "destructive",
      });
      return false;
    }

    if (username.length < 3 || username.length > 20) {
      toast({
        title: "Username non valido",
        description: "L'username deve essere tra 3 e 20 caratteri",
        variant: "destructive",
      });
      return false;
    }

    if (!fullName.trim()) {
      toast({
        title: "Nome completo richiesto",
        description: "Inserisci il tuo nome completo",
        variant: "destructive",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Le password non coincidono",
        description: "Assicurati che le password corrispondano",
        variant: "destructive",
      });
      return false;
    }

    if (passwordStrength.score < 3) {
      toast({
        title: "Password non abbastanza forte",
        description: passwordStrength.message,
        variant: "destructive",
      });
      return false;
    }

    if (!acceptedTerms) {
      toast({
        title: "Termini non accettati",
        description: "Accetta i termini e le condizioni",
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
      // Lowercase the email to ensure consistency
      const lowerCaseEmail = email.toLowerCase();
      
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: lowerCaseEmail,
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

      // Skip profile creation for now due to RLS policy issues
      // We'll handle it after the user verifies their email
      
      // Save the email for the success message
      setSignupEmail(lowerCaseEmail);
      setSignupSuccess(true);
      
      toast({
        title: "Account creato!",
        description: "Controlla la tua email per la verifica.",
      });
      
      console.log("Registration successful, verification email should be sent by Supabase");
      
      // Try our custom email function as a backup
      try {
        console.log("Trying to send custom welcome email via Edge Function");
        const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
          body: { 
            email: lowerCaseEmail, 
            name: fullName, 
            username 
          }
        });
        
        if (emailError) {
          console.error("Error sending custom welcome email:", emailError);
        } else {
          console.log("Custom welcome email request sent successfully");
        }
      } catch (emailError) {
        console.error("Failed to call send-welcome-email function:", emailError);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Errore",
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
        email: email.toLowerCase(), // Use lowercase for consistency
        password,
      });
      
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          // Handle the specific case of unconfirmed email
          toast({
            title: "Email non confermata",
            description: "Controlla la tua casella di posta e conferma la tua email prima di accedere.",
            variant: "destructive",
          });
          throw new Error("Verifica la tua email prima di accedere");
        }
        throw error;
      }
    } catch (error: any) {
      toast({
        title: "Errore",
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
      console.log("Attempting to resend verification email to:", signupEmail);
      // Use Supabase built-in resend
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      console.log("Supabase resend successful");
      
      // Also try our custom email function
      try {
        console.log("Trying to send custom welcome email via Edge Function");
        await supabase.functions.invoke('send-welcome-email', {
          body: { 
            email: signupEmail, 
            name: fullName || username,
            username 
          }
        });
        console.log("Custom resend request sent successfully");
      } catch (customEmailError) {
        console.error("Error sending custom welcome email:", customEmailError);
      }
      
      toast({
        title: "Email di conferma inviata",
        description: "Controlla la tua casella di posta per il link di verifica",
      });
    } catch (error: any) {
      console.error("Error resending verification email:", error);
      toast({
        title: "Errore",
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
              <h2 className="text-2xl font-bold text-[#ebbd34]">Verifica la tua Email</h2>
              <p className="mt-2 text-[#ebbd34]/70">
                Abbiamo inviato un link di verifica a <span className="font-medium">{signupEmail}</span>
              </p>
            </div>
            
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Controlla la tua casella di posta</AlertTitle>
              <AlertDescription className="text-blue-700">
                Riceverai un'email da noreply@mail.app.supabase.io o bubbletroubleapp@gmail.com con un link di verifica.
                <br /><br />
                <strong>Controlla anche nella cartella spam/junk se non la trovi.</strong>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <Button
                onClick={resendConfirmationEmail}
                className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                disabled={loading}
              >
                {loading ? "Invio in corso..." : "Invia nuovamente l'email di conferma"}
              </Button>
              
              <div className="text-center">
                <button
                  onClick={() => setSignupSuccess(false)}
                  className="text-sm text-[#ebbd34] hover:underline"
                >
                  Torna al login
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
          <p className="mt-2 text-[#ebbd34]/70">Accedi per partecipare alle conversazioni bubble!</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="signin" className="rounded-lg text-[#ebbd34]">
                Accedi
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-[#ebbd34]">
                Registrati
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
                    placeholder="tua@email.com"
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
                  {loading ? "Accesso in corso..." : "Accedi"}
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
                    placeholder="tua@email.com"
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
                    3-20 caratteri. Sarà il tuo identificatore pubblico.
                  </p>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="signup-fullname" className="text-[#ebbd34] flex items-center">
                    Nome Completo <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="Mario Rossi"
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
                    Conferma Password <span className="text-red-500 ml-1">*</span>
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
                      <AlertCircle className="w-3 h-3 mr-1" /> Le password non coincidono
                    </p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-500 mt-1 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Le password coincidono
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
                    Accetto i <Link to="#" className="underline text-[#ebbd34] hover:text-[#ebbd34]/70">Termini di Servizio</Link> e la <Link to="#" className="underline text-[#ebbd34] hover:text-[#ebbd34]/70">Privacy Policy</Link>. <span className="text-red-500">*</span>
                  </Label>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white mt-4"
                  disabled={loading}
                >
                  {loading ? "Creazione account..." : "Registrati"}
                </Button>
                
                <div className="text-xs text-center text-[#ebbd34]/60 mt-4 flex items-center justify-center">
                  <Info className="w-3 h-3 mr-1" /> I campi contrassegnati con <span className="text-red-500 mx-1">*</span> sono obbligatori
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
