
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
  const [isLoading, setIsLoading] = useState(false); // Start with isLoading false to prevent initial loading screen
  const navigate = useNavigate();

  // Fetch profile data
  const fetchProfile = async (userId: string) => {
    try {
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
        // Return a default profile if none exists
        return {
          id: userId,
          username: user?.email?.split('@')[0] || '',
          display_name: user?.email?.split('@')[0] || '',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Profile;
      }

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
      // Return a default profile on error
      return {
        id: userId,
        username: user?.email?.split('@')[0] || '',
        display_name: user?.email?.split('@')[0] || '',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Profile;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        // Get the initial session
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        const currentUser = data.session?.user || null;
        setUser(currentUser);
        
        if (currentUser?.id) {
          const profileData = await fetchProfile(currentUser.id);
          if (mounted && profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    // Run auth initialization
    initAuth();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser?.id) {
          if (event === 'SIGNED_IN') {
            const profileData = await fetchProfile(currentUser.id);
            if (mounted && profileData) {
              setProfile(profileData);
            }
          }
        } else {
          setProfile(null);
          if (event === 'SIGNED_OUT') {
            navigate('/auth');
          }
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate, user?.email]);

  // Set up real-time subscription for profile updates
  useEffect(() => {
    if (!user?.id) return;
    
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
          if (payload.new) {
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
