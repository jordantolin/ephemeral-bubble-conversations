
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoConfirmEmail } from "./AutoConfirmEmail";
import { useNavigate } from "react-router-dom";

export function RegisterForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredCredentials, setRegisteredCredentials] = useState<{email: string, password: string} | null>(null);
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    surname: "",
    username: "",
  });
  const [formErrors, setFormErrors] = useState<{
    password?: string;
    username?: string;
    email?: string;
  }>({});

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value,
    });
    
    // Clear errors when field is changed
    if (formErrors[e.target.name as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: undefined,
      });
    }
  };

  // Password strength validation
  const validatePassword = (password: string): boolean => {
    // Require at least 8 characters, one uppercase, one lowercase, one number
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasMinLength) {
      setFormErrors(prev => ({...prev, password: "Password must be at least 8 characters"}));
      return false;
    }
    
    if (!(hasUpperCase && hasLowerCase && hasNumber)) {
      setFormErrors(prev => ({
        ...prev, 
        password: "Password must include uppercase, lowercase, and numbers"
      }));
      return false;
    }
    
    return true;
  };

  // Username validation
  const validateUsername = (username: string): boolean => {
    // Only allow letters, numbers, and underscores, 3-20 characters
    const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
    
    if (!isValid) {
      setFormErrors(prev => ({
        ...prev, 
        username: "Username must be 3-20 characters and contain only letters, numbers, and underscores"
      }));
      return false;
    }
    
    return true;
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    if (!isValid) {
      setFormErrors(prev => ({...prev, email: "Please enter a valid email address"}));
      return false;
    }
    
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    try {
      // Field presence validation
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

      // Validate password match
      if (registerForm.password !== registerForm.confirmPassword) {
        setFormErrors(prev => ({...prev, password: "Passwords do not match"}));
        throw new Error("Passwords do not match");
      }

      // Validate password strength
      if (!validatePassword(registerForm.password)) {
        throw new Error("Password doesn't meet security requirements");
      }

      // Validate username format
      if (!validateUsername(registerForm.username)) {
        throw new Error("Username format is invalid");
      }

      // Validate email format
      if (!validateEmail(registerForm.email)) {
        throw new Error("Email format is invalid");
      }

      // Check if username already exists
      const { data: existingUsers, error: usernameError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", registerForm.username);
      
      if (usernameError) {
        console.error("Error checking username:", usernameError);
        throw new Error("Error checking username availability");
      }
      
      if (existingUsers && existingUsers.length > 0) {
        setFormErrors(prev => ({...prev, username: "Username already taken"}));
        throw new Error("Username already taken. Please choose another one.");
      }

      // Try to check if user already exists with the same email
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: registerForm.email,
          password: registerForm.password,
        });
        
        if (!signInError && signInData.user) {
          // If we can sign in directly, user already exists and is confirmed
          toast({
            title: "Welcome back!",
            description: "You're now logged in with your existing account.",
          });
          navigate("/");
          return;
        }
      } catch (loginErr) {
        // If login fails, proceed with registration
        console.log("Login check failed, continuing with registration:", loginErr);
      }

      // Create the user in Supabase Auth with email_confirm set to true
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          emailRedirectTo: window.location.origin + "/auth", // Redirect to auth page after confirmation
          data: {
            username: registerForm.username,
            full_name: `${registerForm.name} ${registerForm.surname}`,
            name: registerForm.name,
            surname: registerForm.surname,
          },
        },
      });

      if (authError) {
        // Check for specific errors
        if (authError.message.includes("already registered")) {
          // If already registered, try forcing a login anyway
          const { data: forceLoginData, error: forceLoginError } = await supabase.auth.signInWithPassword({
            email: registerForm.email,
            password: registerForm.password,
          });
          
          if (forceLoginError) {
            if (forceLoginError.message.includes("Email not confirmed")) {
              // Handle the case where email is registered but not confirmed
              setFormErrors(prev => ({...prev, email: "Account exists but email not confirmed"}));
              throw new Error("An account with this email already exists but isn't verified. Please check your email for verification link or try logging in.");
            } else {
              setFormErrors(prev => ({...prev, email: "Email already in use with different password"}));
              throw new Error("An account with this email already exists. Please use a different email or try logging in.");
            }
          } else {
            // Successfully logged in with existing account
            toast({
              title: "Welcome back!",
              description: "You're now logged in with your existing account.",
            });
            navigate("/");
            return;
          }
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Registration failed. Please try again.");
      }

      console.log("Registration successful, user created:", authData.user);
      
      // If registration was successful but email confirmation is required
      if (authData.user && !authData.session) {
        toast({
          title: "Account created",
          description: "Please check your email for a verification link to complete registration.",
        });
        
        // Set credentials for auto-confirmation
        setRegisteredCredentials({
          email: registerForm.email,
          password: registerForm.password
        });
        
        // Show auto-confirm component
        setRegistrationComplete(true);
        return;
      }
      
      // If we got a session back, user is automatically logged in
      if (authData.session) {
        toast({
          title: "Account created and logged in",
          description: "Welcome to Bubble Trouble!",
        });
        navigate("/");
        return;
      }

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

  // If registration is complete, show auto-confirm component
  if (registrationComplete && registeredCredentials) {
    return <AutoConfirmEmail 
      email={registeredCredentials.email} 
      password={registeredCredentials.password} 
    />;
  }

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
              className={`border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20 ${formErrors.username ? "border-red-500" : ""}`}
              required
            />
            {formErrors.username && (
              <p className="text-sm text-red-500 mt-1">{formErrors.username}</p>
            )}
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
              className={`border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20 ${formErrors.email ? "border-red-500" : ""}`}
              required
            />
            {formErrors.email && (
              <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>
            )}
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
              className={`border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20 ${formErrors.password ? "border-red-500" : ""}`}
              required
            />
            {formErrors.password ? (
              <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters and include uppercase, lowercase, and numbers
              </p>
            )}
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
