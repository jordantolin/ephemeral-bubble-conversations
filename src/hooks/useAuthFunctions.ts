
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/auth';
import { Profile } from '@/types/profile';

export const useAuthFunctions = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resetEmail, setResetEmail] = useState<string | null>(null);

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

  return {
    user,
    setUser,
    profile, 
    setProfile,
    isLoading,
    setIsLoading,
    resetEmail,
    setResetEmail,
    fetchProfile,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    verifyOTP,
    confirmPasswordReset,
    updatePassword,
    resendVerificationEmail
  };
};
