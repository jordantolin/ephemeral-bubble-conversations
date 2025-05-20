
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Custom hook for password recovery operations
 */
export const usePasswordRecovery = () => {
  const [resetEmail, setResetEmail] = useState<string | null>(null);

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

  // Function to verify OTP (one-time password)
  const verifyOTP = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
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
    resetEmail,
    setResetEmail,
    requestPasswordReset,
    verifyOTP,
    confirmPasswordReset,
    updatePassword,
    resendVerificationEmail
  };
};
