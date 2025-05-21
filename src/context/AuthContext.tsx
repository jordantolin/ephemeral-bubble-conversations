
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileUpdateData {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<{ success: boolean; error: any | null }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: any }>;
}

// Create context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();

  // Define the fetchProfile function outside of useEffect
  const fetchProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      console.log("Profile data received:", data);
      setProfile(data);
    } catch (error) {
      console.error("Unexpected error fetching profile:", error);
    }
  };

  useEffect(() => {
    console.log("Setting up auth state change listener");
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", session);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (data: ProfileUpdateData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile",
        variant: "destructive",
      });
      return { success: false, error: "Not authenticated" };
    }

    try {
      const updates = {
        ...data,
        id: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast({
          title: "Error updating profile",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error };
      }

      // Refresh profile data
      fetchProfile(user.id);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      return { success: true, error: null };
    } catch (error) {
      console.error("Unexpected error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload an avatar",
        variant: "destructive",
      });
      return { success: false, error: "Not authenticated" };
    }

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return { success: false, error: "Invalid file type" };
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to the dedicated avatars bucket
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error("Error uploading avatar:", error);
        toast({
          title: "Error uploading avatar",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error };
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { success, error: updateError } = await updateProfile({ avatar_url: publicUrl });
      
      if (!success) {
        return { success: false, error: updateError };
      }
      
      toast({
        title: "Avatar updated",
        description: "Your avatar has been updated successfully",
      });
      
      return { success: true, url: publicUrl };
    } catch (error) {
      console.error("Unexpected error uploading avatar:", error);
      toast({
        title: "Error uploading avatar",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear any stored profile data
      setProfile(null);
      
      // Redirect to home
      window.location.href = "/";
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error signing out",
        description: "An error occurred while signing out",
        variant: "destructive",
      });
    }
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    signOut,
    updateProfile,
    uploadAvatar
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// useAuth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
