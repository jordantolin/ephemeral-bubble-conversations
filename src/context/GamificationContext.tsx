
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Award, Star, Trophy, Target, Gift } from "lucide-react";

// Define achievement types
export type AchievementIconType = 'award' | 'star' | 'trophy' | 'target' | 'gift';

export type AchievementType = {
  id: string;
  name: string;
  description: string;
  iconType: AchievementIconType;
  points: number;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

// Serializable version for database storage
export type SerializableAchievement = Omit<AchievementType, 'icon'>;

// Define user gamification profile
export type GamificationProfile = {
  level: number;
  points: number;
  bubblePoints: number;
  reflectionPoints: number;
  messagePoints: number;
  achievements: AchievementType[];
  dailyStreak: number;
  lastActive: string;
};

// Helper function to get icon component from icon type
const getIconComponent = (iconType: AchievementIconType) => {
  switch (iconType) {
    case 'award':
      return <Award className="h-6 w-6 text-[#ebbd34]" />;
    case 'star':
      return <Star className="h-6 w-6 text-[#ebbd34]" />;
    case 'trophy':
      return <Trophy className="h-6 w-6 text-[#ebbd34]" />;
    case 'target':
      return <Target className="h-6 w-6 text-[#ebbd34]" />;
    case 'gift':
      return <Gift className="h-6 w-6 text-[#ebbd34]" />;
    default:
      return <Trophy className="h-6 w-6 text-[#ebbd34]" />;
  }
};

// Default achievements
const defaultAchievements: AchievementType[] = [
  {
    id: "first-bubble",
    name: "Bubble Creator",
    description: "Create your first bubble",
    iconType: 'award',
    points: 100,
    unlocked: false
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Send 10 messages in bubbles",
    iconType: 'star',
    points: 50,
    unlocked: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: "reflection-master",
    name: "Reflection Master",
    description: "Reflect on 5 different bubbles",
    iconType: 'trophy',
    points: 75,
    unlocked: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: "daily-streak-3",
    name: "Regular Bubbler",
    description: "Log in for 3 consecutive days",
    iconType: 'target',
    points: 150,
    unlocked: false,
    progress: 0,
    maxProgress: 3
  },
  {
    id: "popular-bubble",
    name: "Popular Bubble",
    description: "Create a bubble that gets 5+ reflections",
    iconType: 'gift',
    points: 200,
    unlocked: false,
    progress: 0,
    maxProgress: 5
  }
];

// Default gamification profile
const defaultProfile: GamificationProfile = {
  level: 1,
  points: 0,
  bubblePoints: 0,
  reflectionPoints: 0,
  messagePoints: 0,
  achievements: defaultAchievements,
  dailyStreak: 0,
  lastActive: new Date().toISOString()
};

type GamificationContextType = {
  profile: GamificationProfile;
  achievements: AchievementType[];
  recentAchievement: AchievementType | null;
  isLoading: boolean;
  addPoints: (amount: number, category?: 'bubble' | 'reflection' | 'message') => Promise<void>;
  checkAchievement: (id: string, progress?: number) => Promise<boolean>;
  incrementAchievementProgress: (id: string, amount?: number) => Promise<boolean>;
  resetRecentAchievement: () => void;
  refreshGamificationProfile: () => Promise<void>;
  getAchievementIcon: (achievement: AchievementType) => React.ReactNode;
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<GamificationProfile>(defaultProfile);
  const [recentAchievement, setRecentAchievement] = useState<AchievementType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate level based on points
  const calculateLevel = (points: number): number => {
    return Math.floor(Math.sqrt(points / 100)) + 1;
  };

  // Get icon component for an achievement
  const getAchievementIcon = (achievement: AchievementType): React.ReactNode => {
    return getIconComponent(achievement.iconType);
  };

  // Update daily streak
  const updateDailyStreak = (currentProfile: GamificationProfile): GamificationProfile => {
    const today = new Date();
    const lastActive = new Date(currentProfile.lastActive);
    
    // Check if last activity was yesterday
    const isYesterday = 
      today.getDate() - lastActive.getDate() === 1 || 
      (today.getDate() === 1 && 
        lastActive.getDate() === new Date(
          lastActive.getFullYear(), 
          lastActive.getMonth() + 1, 
          0
        ).getDate());
    
    // Check if last activity was today
    const isToday = 
      today.getDate() === lastActive.getDate() && 
      today.getMonth() === lastActive.getMonth() && 
      today.getFullYear() === lastActive.getFullYear();
    
    if (isYesterday) {
      // Increment streak if last active yesterday
      return {
        ...currentProfile,
        dailyStreak: currentProfile.dailyStreak + 1,
        lastActive: today.toISOString()
      };
    } else if (!isToday) {
      // Reset streak if not active yesterday or today
      return {
        ...currentProfile,
        dailyStreak: 1,
        lastActive: today.toISOString()
      };
    }
    
    // If already active today, just return the current profile
    return {
      ...currentProfile,
      lastActive: today.toISOString()
    };
  };

  // Fetch user's gamification profile
  const fetchGamificationProfile = async () => {
    if (!user) {
      setProfile(defaultProfile);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gamification_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Parse stored achievements and add icons
        let storedAchievements: AchievementType[] = 
          Array.isArray(data.achievements) 
            ? data.achievements.map((a: any) => ({
                ...a,
                iconType: a.iconType || 'trophy' // Ensure iconType exists
              }))
            : defaultAchievements;
        
        // Create profile with updated daily streak
        const updatedProfile = updateDailyStreak({
          level: data.level || 1,
          points: data.points || 0,
          bubblePoints: data.bubble_points || 0,
          reflectionPoints: data.reflection_points || 0,
          messagePoints: data.message_points || 0,
          achievements: storedAchievements,
          dailyStreak: data.daily_streak || 0,
          lastActive: data.last_active || new Date().toISOString()
        });
        
        // Update the profile in the database if streak changed
        if (updatedProfile.dailyStreak !== data.daily_streak) {
          await supabase
            .from('gamification_profiles')
            .update({
              daily_streak: updatedProfile.dailyStreak,
              last_active: updatedProfile.lastActive
            })
            .eq('user_id', user.id);
          
          // Check if streak achievement unlocked
          if (updatedProfile.dailyStreak >= 3) {
            await checkAchievement('daily-streak-3', updatedProfile.dailyStreak);
          }
        }
        
        setProfile(updatedProfile);
      } else {
        // Create new profile for user
        const newProfile = {
          ...defaultProfile,
          dailyStreak: 1,
          lastActive: new Date().toISOString()
        };
        
        await supabase
          .from('gamification_profiles')
          .insert({
            user_id: user.id,
            level: newProfile.level,
            points: newProfile.points,
            bubble_points: newProfile.bubblePoints,
            reflection_points: newProfile.reflectionPoints,
            message_points: newProfile.messagePoints,
            achievements: newProfile.achievements,
            daily_streak: newProfile.dailyStreak,
            last_active: newProfile.lastActive
          });
          
        setProfile(newProfile);
      }
    } catch (error) {
      console.error("Error fetching gamification profile:", error);
      // Use default profile if there's an error
      setProfile(defaultProfile);
    } finally {
      setIsLoading(false);
    }
  };

  // Add points to user's profile
  const addPoints = async (amount: number, category?: 'bubble' | 'reflection' | 'message') => {
    if (!user) return;
    
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
      await supabase
        .from('gamification_profiles')
        .update({
          points: updatedProfile.points,
          level: updatedProfile.level,
          bubble_points: updatedProfile.bubblePoints,
          reflection_points: updatedProfile.reflectionPoints,
          message_points: updatedProfile.messagePoints
        })
        .eq('user_id', user.id);
      
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
    } catch (error) {
      console.error("Error adding points:", error);
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
        
        // Update database
        await supabase
          .from('gamification_profiles')
          .update({
            points: updatedProfile.points,
            level: updatedProfile.level,
            achievements: updatedAchievements
          })
          .eq('user_id', user.id);
        
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
        
        // Update database
        await supabase
          .from('gamification_profiles')
          .update({
            achievements: updatedAchievements
          })
          .eq('user_id', user.id);
        
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
        
        // Update database
        await supabase
          .from('gamification_profiles')
          .update({
            achievements: updatedAchievements
          })
          .eq('user_id', user.id);
        
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

  // Reset recent achievement
  const resetRecentAchievement = () => {
    setRecentAchievement(null);
  };

  // Refresh gamification profile
  const refreshGamificationProfile = async () => {
    await fetchGamificationProfile();
  };

  // Initialize profile on user change
  useEffect(() => {
    fetchGamificationProfile();
  }, [user]);

  return (
    <GamificationContext.Provider
      value={{
        profile,
        achievements: profile.achievements,
        recentAchievement,
        isLoading,
        addPoints,
        checkAchievement,
        incrementAchievementProgress,
        resetRecentAchievement,
        refreshGamificationProfile,
        getAchievementIcon
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
