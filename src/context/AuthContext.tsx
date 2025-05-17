
import React, { createContext, useContext, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthFunctions } from '@/hooks/useAuthFunctions';
import { AuthContextType } from '@/types/auth';

// Create the Auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the Auth provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Get auth functions and state from custom hook
  const { 
    user, 
    setUser, 
    profile, 
    setProfile,
    isLoading, 
    setIsLoading, 
    fetchProfile,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    verifyOTP,
    confirmPasswordReset,
    updatePassword,
    resendVerificationEmail
  } = useAuthFunctions();

  // Effect to listen for auth state changes
  useEffect(() => {
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
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
