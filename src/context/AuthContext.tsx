
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  updated_at: string;
  created_at: string;
}

// Define the type for raw profile data from Supabase
interface RawProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at?: string; // Make updated_at optional since it might not exist in the raw data
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch profile data
  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!data) {
        console.log('No profile found for user:', userId);
        return null;
      }

      console.log('Profile data received:', data);
      
      // Type the raw data and ensure updated_at is present
      const rawData = data as RawProfileData;
      const profileWithUpdatedAt: Profile = {
        id: rawData.id,
        username: rawData.username || '',
        display_name: rawData.display_name || '',
        avatar_url: rawData.avatar_url,
        created_at: rawData.created_at,
        updated_at: rawData.updated_at || rawData.created_at // Fallback to created_at if updated_at is missing
      };

      return profileWithUpdatedAt;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('AuthProvider initializing...');
    let mounted = true;
    
    async function getInitialSession() {
      try {
        console.log('Getting initial session...');
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (data.session) {
          console.log('Valid session found, setting user');
          setUser(data.session.user);
          
          if (data.session.user.id) {
            const profileData = await fetchProfile(data.session.user.id);
            if (mounted && profileData) {
              setProfile(profileData);
            }
          }
        } else {
          console.log('No valid session found');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (mounted) {
          console.log('Setting isLoading to false');
          setIsLoading(false);
        }
      }
    }
    
    getInitialSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          
          if (event === 'SIGNED_IN') {
            console.log('User signed in, fetching profile');
            const profileData = await fetchProfile(session.user.id);
            if (mounted && profileData) {
              setProfile(profileData);
            }
          }
        } else {
          setUser(null);
          setProfile(null);
          
          if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            navigate('/auth');
          }
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up AuthProvider...');
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Set up real-time subscription for profile updates when user changes
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('Setting up real-time profile subscription for user:', user.id);
    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Real-time profile update received:', payload);
          if (payload.new) {
            // Type the raw data from real-time updates
            const rawData = payload.new as RawProfileData;
            const updatedProfile: Profile = {
              id: rawData.id,
              username: rawData.username || '',
              display_name: rawData.display_name || '',
              avatar_url: rawData.avatar_url,
              created_at: rawData.created_at,
              updated_at: rawData.updated_at || rawData.created_at
            };
            setProfile(updatedProfile);
          }
        }
      )
      .subscribe();

    return () => {
      profileChannel.unsubscribe();
    };
  }, [user?.id]);

  const signIn = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert('Check your email for the login link!');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: email.split('@')[0],
            display_name: email.split('@')[0],
          }
        }
      });
      if (error) throw error;
      alert('Check your email for the verification link!');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [user, profile, isLoading]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
