
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AchievementType, GamificationContextType, GamificationProfile } from "@/types/gamification";
import { calculateLevel } from "@/utils/profileUtils";
import { validateAchievements } from "@/utils/achievementUtils";
import { 
  createNewUserProfile, 
  defaultProfile, 
  fetchUserGamificationProfile, 
  updateAchievementsInDB, 
  updateDailyStreakInDB, 
  updatePointsInDB, 
  updateProfileWithAchievementPointsInDB 
} from "@/services/gamificationService";
import { supabase } from "@/integrations/supabase/client";

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<GamificationProfile>(defaultProfile);
  const [recentAchievement, setRecentAchievement] = useState<AchievementType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch user's gamification profile
  const fetchGamificationProfile = async () => {
    if (!user) {
      setProfile(defaultProfile);
      setIsLoading(false);
      return;
    }

    try {
      // Get profile from service
      const userProfile = await fetchUserGamificationProfile(user.id);
      
      // Update the profile in the database if streak changed
      if (userProfile.dailyStreak !== profile.dailyStreak || userProfile.lastActive !== profile.lastActive) {
        await updateDailyStreakInDB(user.id, userProfile.dailyStreak, userProfile.lastActive);
        
        // Check if streak achievement unlocked
        if (userProfile.dailyStreak >= 3) {
          await checkAchievement('daily-streak-3', userProfile.dailyStreak);
        }
      }
      
      setProfile(userProfile);
      
      // Set up subscription for reflect counts
      setupReflectionSubscription();
    } catch (error) {
      console.error("Error fetching gamification profile:", error);
      
      try {
        // Try to create a new profile
        const newProfile = await createNewUserProfile(user.id);
        setProfile(newProfile);
      } catch (createError) {
        console.error("Error creating new profile:", createError);
        // Use default profile if there's an error
        setProfile(defaultProfile);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Setup subscription to track reflections on user's bubbles
  const setupReflectionSubscription = async () => {
    if (!user) return;
    
    try {
      // Get user's bubbles
      const { data: userBubbles } = await supabase
        .from('bubbles')
        .select('id, name')
        .eq('username', user.email);
      
      if (userBubbles && userBubbles.length > 0) {
        // Store bubble IDs for tracking reflections
        userBubbles.forEach(bubble => {
          if (!localStorage.getItem(`bubble_created_${bubble.id}`)) {
            localStorage.setItem(`bubble_created_${bubble.id}`, JSON.stringify({
              id: bubble.id,
              name: bubble.name,
              createdAt: new Date().toISOString(),
              reflections: 0
            }));
          }
        });
        
        // Set up subscription for reflects
        const reflectsSubscription = supabase
          .channel('reflects-changes')
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'reflects' },
            async (payload) => {
              // Check if the reflection is for one of our bubbles
              const reflection = payload.new as any;
              if (!reflection || !reflection.bubble_id) return;
              
              const bubbleKey = `bubble_created_${reflection.bubble_id}`;
              const bubbleData = localStorage.getItem(bubbleKey);
              
              if (bubbleData) {
                const bubble = JSON.parse(bubbleData);
                bubble.reflections += 1;
                localStorage.setItem(bubbleKey, JSON.stringify(bubble));
                
                // Check for popular bubble achievement
                if (bubble.reflections >= 5) {
                  await checkAchievement('popular-bubble', bubble.reflections);
                }
              }
              
              // Also check if the user should get the reflection master achievement
              if (reflection.username === user.email) {
                await incrementAchievementProgress('reflection-master');
              }
            }
          )
          .subscribe();
          
        // Clean up subscription on unmount
        return () => {
          supabase.removeChannel(reflectsSubscription);
        };
      }
    } catch (error) {
      console.error("Error setting up reflection subscription:", error);
    }
  };

  // Add points to user's profile
  const addPoints = async (amount: number, category?: 'bubble' | 'reflection' | 'message') => {
    if (!user) return false;
    
    try {
      const newPoints = profile.points + amount;
      const newLevel = calculateLevel(newPoints);
      
      // Create updated profile
      const updatedProfile = {
        ...profile,
        points: newPoints,
        level: newLevel,
        bubblePoints: category === 'bubble' ? profile.bubblePoints + amount : profile.bubblePoints,
        reflectionPoints: category === 'reflection' ? profile.reflectionPoints + amount : profile.reflectionPoints,
        messagePoints: category === 'message' ? profile.messagePoints + amount : profile.messagePoints,
      };
      
      // Update database
      await updatePointsInDB(
        user.id, 
        updatedProfile.points, 
        updatedProfile.level,
        updatedProfile.bubblePoints,
        updatedProfile.reflectionPoints,
        updatedProfile.messagePoints
      );
      
      // Show level up toast if level increased
      if (newLevel > profile.level) {
        toast({
          title: "Level Up! 🎉",
          description: `You've reached level ${newLevel}!`,
          variant: "default",
        });
      }
      
      // Update state
      setProfile(updatedProfile);
      return true;
    } catch (error) {
      console.error("Error adding points:", error);
      return false;
    }
  };

  // Check and unlock achievement
  const checkAchievement = async (id: string, progressValue?: number): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const achievementIndex = profile.achievements.findIndex(a => a.id === id);
      if (achievementIndex === -1) return false;
      
      const achievement = profile.achievements[achievementIndex];
      
      // Skip if already unlocked
      if (achievement.unlocked) return false;
      
      // If this is a progress-based achievement, update progress
      let unlocked = false;
      let updatedAchievement = {...achievement};
      
      if (achievement.progress !== undefined && achievement.maxProgress !== undefined) {
        // If progressValue is provided, use it directly, otherwise increment by 1
        const newProgress = progressValue !== undefined ? progressValue : (achievement.progress + 1);
        updatedAchievement.progress = newProgress;
        unlocked = newProgress >= achievement.maxProgress;
      } else {
        // Simple achievement, just unlock it
        unlocked = true;
      }
      
      if (unlocked) {
        updatedAchievement.unlocked = true;
        
        // Create updated achievements array
        const updatedAchievements = [...profile.achievements];
        updatedAchievements[achievementIndex] = updatedAchievement;
        
        // Add achievement points to user profile
        const newPoints = profile.points + achievement.points;
        const newLevel = calculateLevel(newPoints);
        
        // Create updated profile
        const updatedProfile = {
          ...profile,
          points: newPoints,
          level: newLevel,
          achievements: updatedAchievements
        };
        
        // Update database with combined point and achievement update
        await updateProfileWithAchievementPointsInDB(
          user.id,
          updatedProfile.points,
          updatedProfile.level,
          updatedAchievements
        );
        
        // Show toast for achievement
        toast({
          title: "Achievement Unlocked! 🏆",
          description: `${achievement.name}: ${achievement.description}`,
          variant: "default",
        });
        
        // Set recent achievement for animation
        setRecentAchievement(updatedAchievement);
        
        // Update state
        setProfile(updatedProfile);
        return true;
      } else if (achievement.progress !== updatedAchievement.progress) {
        // Progress updated but not unlocked
        const updatedAchievements = [...profile.achievements];
        updatedAchievements[achievementIndex] = updatedAchievement;
        
        // Update achievements in database
        await updateAchievementsInDB(user.id, updatedAchievements);
        
        // Update state
        setProfile({
          ...profile,
          achievements: updatedAchievements
        });
      }
    } catch (error) {
      console.error("Error checking achievement:", error);
    }
    
    return false;
  };

  // Increment progress for an achievement
  const incrementAchievementProgress = async (id: string, amount: number = 1): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const achievementIndex = profile.achievements.findIndex(a => a.id === id);
      if (achievementIndex === -1) return false;
      
      const achievement = profile.achievements[achievementIndex];
      
      // Skip if already unlocked or not a progress-based achievement
      if (achievement.unlocked || achievement.progress === undefined || achievement.maxProgress === undefined) {
        return false;
      }
      
      // Calculate new progress
      const newProgress = Math.min(achievement.progress + amount, achievement.maxProgress);
      
      // Check if achievement unlocked
      if (newProgress >= achievement.maxProgress) {
        return await checkAchievement(id, newProgress);
      } else {
        // Just update progress
        const updatedAchievement = {
          ...achievement,
          progress: newProgress
        };
        
        const updatedAchievements = [...profile.achievements];
        updatedAchievements[achievementIndex] = updatedAchievement;
        
        // Update achievements in database
        await updateAchievementsInDB(user.id, updatedAchievements);
        
        // Update state
        setProfile({
          ...profile,
          achievements: updatedAchievements
        });
      }
    } catch (error) {
      console.error("Error incrementing achievement progress:", error);
    }
    
    return false;
  };

  // Track message sending for the Social Butterfly achievement
  const trackMessageSent = async () => {
    if (!user) return;
    
    try {
      // Add points for sending a message
      await addPoints(5, 'message');
      
      // Increment progress for Social Butterfly achievement
      await incrementAchievementProgress('social-butterfly');
    } catch (error) {
      console.error("Error tracking message:", error);
    }
  };

  // Reset recent achievement
  const resetRecentAchievement = () => {
    setRecentAchievement(null);
  };

  // Refresh gamification profile
  const refreshGamificationProfile = async () => {
    setIsRefreshing(true);
    await fetchGamificationProfile();
  };

  // Initialize profile on user change
  useEffect(() => {
    fetchGamificationProfile();
  }, [user]);

  // Auto refresh profile every 5 minutes
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchGamificationProfile();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [user]);

  return (
    <GamificationContext.Provider
      value={{
        profile,
        achievements: validateAchievements(profile.achievements),
        recentAchievement,
        isLoading: isLoading || isRefreshing,
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

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
};
