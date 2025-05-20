
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Custom hook for authentication operations
 */
export const useAuthOperations = () => {
  const { toast } = useToast();

  // Function to sign in user
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: 'Sign in failed',
          description: error.message,
          variant: 'destructive'
        });
      }
      
      return { data, error };
    } catch (error: any) {
      console.error('Error in signIn:', error);
      toast({
        title: 'Authentication error',
        description: error.message || 'Please try again later',
        variant: 'destructive'
      });
      return { error };
    }
  };

  // Function to sign up user
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive'
        });
      } else if (data?.user && !data.user.confirmed_at) {
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link',
        });
      }
      
      return { data, error };
    } catch (error: any) {
      console.error('Error in signUp:', error);
      toast({
        title: 'Registration error',
        description: error.message || 'Please try again later',
        variant: 'destructive'
      });
      return { error };
    }
  };

  // Function to sign out user - fixed to return Promise<void>
  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: 'Sign out failed',
          description: error.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error in signOut:', error);
      toast({
        title: 'Sign out error',
        description: error.message || 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  return {
    signIn,
    signUp,
    signOut
  };
};
