
import * as React from 'react';

// Define the User type
type User = {
  id: string;
  email: string;
};

// Define the Profile type
import { Profile } from '@/types/profile';

// Define the Auth context type
type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any } | undefined>;
  signUp: (email: string, password: string) => Promise<{ error: any } | undefined>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: any } | undefined>;
  verifyOTP: (email: string, token: string, type: 'email' | 'recovery') => Promise<{ error: any } | undefined>;
  confirmPasswordReset: (password: string) => Promise<{ error: any } | undefined>;
  updatePassword: (password: string) => Promise<{ error: any } | undefined>;
  resendVerificationEmail: (email: string) => Promise<{ error: any } | undefined>;
};

// Import Supabase client
import { supabase } from '@/integrations/supabase/client';

// Create the Auth context
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Create the Auth provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // State for user, profile, loading state, and reset state
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [resetEmail, setResetEmail] = React.useState<string | null>(null);

  // Function to fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        // Make sure data conforms to the Profile interface by adding display_name if missing
        const profileData: Profile = {
          ...data,
          display_name: data.username // Use username as display_name if it's missing
        };
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  // Effect to listen for auth state changes
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && session.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    // Initialize auth state
    const initializeAuth = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
        });
        await fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    };

    initializeAuth();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to sign in user
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { error };
    }
  };

  // Function to sign up user
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { error };
    }
  };

  // Function to sign out user
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error in signOut:', error);
    }
  };

  // Function to request password reset
  const requestPasswordReset = async (email: string) => {
    try {
      setResetEmail(email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      return { error };
    } catch (error) {
      console.error('Error in requestPasswordReset:', error);
      return { error };
    }
  };

  // Function to verify OTP (one-time password) for email verification or recovery
  const verifyOTP = async (email: string, token: string, type: 'email' | 'recovery') => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      });
      
      return { error };
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      return { error };
    }
  };

  // Function to confirm password reset
  const confirmPasswordReset = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error in confirmPasswordReset:', error);
      return { error };
    }
  };

  // Function to update password
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error in updatePassword:', error);
      return { error };
    }
  };

  // Function to resend verification email
  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      return { error };
    } catch (error) {
      console.error('Error in resendVerificationEmail:', error);
      return { error };
    }
  };

  // Provide the auth context
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        verifyOTP,
        confirmPasswordReset,
        updatePassword,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the Auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
