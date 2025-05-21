
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  GamificationProfile, 
  GamificationContextType,
  AchievementType 
} from '@/types/gamification';
import { defaultAchievements } from '@/utils/achievementUtils';
import { 
  fetchUserGamificationProfile, 
  createNewUserProfile 
} from '@/services/gamificationService';
import { useGamificationActions } from '@/hooks/useGamificationActions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Create context with default value
const GamificationContext = createContext<GamificationContextType>({
  profile: {
    level: 1,
    points: 0,
    bubblePoints: 0,
    reflectionPoints: 0,
    messagePoints: 0,
    achievements: defaultAchievements,
    dailyStreak: 0,
    lastActive: new Date().toISOString()
  },
  achievements: defaultAchievements,
  recentAchievement: null,
  isLoading: false,
  addPoints: async () => false,
  checkAchievement: async () => false,
  incrementAchievementProgress: async () => false,
  trackMessageSent: async () => {},
  resetRecentAchievement: () => {},
  refreshGamificationProfile: async () => {}
});

// Provider component
export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<GamificationProfile>({
    level: 1,
    points: 0,
    bubblePoints: 0,
    reflectionPoints: 0,
    messagePoints: 0,
    achievements: defaultAchievements,
    dailyStreak: 0,
    lastActive: new Date().toISOString()
  });
  const [achievements, setAchievements] = useState<AchievementType[]>(defaultAchievements);
  const [recentAchievement, setRecentAchievement] = useState<AchievementType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  
  // Reset recent achievement
  const resetRecentAchievement = () => {
    setRecentAchievement(null);
  };
  
  // Use the gamification actions hook with extra parameters
  const { 
    addPoints, 
    checkAchievement, 
    incrementAchievementProgress, 
    trackMessageSent 
  } = useGamificationActions({
    user,
    profile,
    achievements,
    setProfile,
    setAchievements,
    setRecentAchievement,
    toast
  });
  
  // Fetch or create user profile with retry mechanism
  const fetchProfile = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    console.log("Fetching gamification profile for user:", user.id);
    
    try {
      let userProfile = await fetchUserGamificationProfile(user.id);
      
      if (!userProfile || !userProfile.achievements || userProfile.achievements.length === 0) {
        console.log("No valid profile found, creating a new one...");
        
        // No valid profile found, create a new one
        userProfile = await createNewUserProfile(user.id);
        
        toast({
          title: "Welcome!",
          description: "Your gamification profile has been created. Earn points by participating!",
          duration: 5000,
        });
      }
      
      console.log("Profile loaded successfully:", userProfile);
      setProfile(userProfile);
      setAchievements(userProfile.achievements || defaultAchievements);
      setFetchAttempts(0); // Reset attempts on success
    } catch (error) {
      console.error("Error fetching gamification profile:", error);
      
      // Check if the profile exists at all
      try {
        const { data } = await supabase
          .from('gamification_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (!data) {
          console.log("Creating new profile as none exists");
          // Create a new profile if it doesn't exist
          try {
            const newProfile = await createNewUserProfile(user.id);
            setProfile(newProfile);
            setAchievements(newProfile.achievements);
            
            toast({
              title: "Welcome!",
              description: "Your gamification profile has been created. Earn points by participating!",
              duration: 5000,
            });
            
            setFetchAttempts(0); // Reset attempts on success
          } catch (createError) {
            console.error("Error creating new profile:", createError);
            handleFetchError();
          }
        } else {
          handleFetchError();
        }
      } catch (err) {
        console.error("Error checking profile existence:", err);
        handleFetchError();
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle fetch errors with retry mechanism
  const handleFetchError = () => {
    if (fetchAttempts < 3) {
      const newAttempts = fetchAttempts + 1;
      setFetchAttempts(newAttempts);
      
      // Exponential backoff for retries
      const delay = Math.pow(2, newAttempts) * 1000;
      console.log(`Retrying profile fetch in ${delay}ms (attempt ${newAttempts}/3)`);
      
      setTimeout(() => {
        fetchProfile();
      }, delay);
      
      // Only show error toast on final attempt
      if (newAttempts === 3) {
        toast({
          title: "Error",
          description: "Failed to load your gamification profile after multiple attempts.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Fetch profile when user changes
  useEffect(() => {
    console.log("User state changed, fetching profile if user exists");
    setFetchAttempts(0); // Reset attempts when user changes
    
    if (user) {
      fetchProfile();
    } else {
      setIsLoading(false); // Not loading if no user
    }
  }, [user]);
  
  // Refresh gamification profile
  const refreshGamificationProfile = async () => {
    console.log("Manual refresh of gamification profile requested");
    setFetchAttempts(0); // Reset attempts on manual refresh
    await fetchProfile();
  };
  
  return (
    <GamificationContext.Provider
      value={{
        profile,
        achievements,
        recentAchievement,
        isLoading,
        addPoints,
        checkAchievement,
        incrementAchievementProgress,
        trackMessageSent,
        resetRecentAchievement,
        refreshGamificationProfile
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

// Hook for using gamification context
export const useGamification = () => useContext(GamificationContext);
