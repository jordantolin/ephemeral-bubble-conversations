
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  GamificationProfile,
  Notification,
  awardPoints,
  awardAchievement,
  checkStreakAchievements,
  initializeGamificationProfile,
  levelProgress,
  pointsForNextLevel
} from "@/utils/gamificationUtils";

export const useGamification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  
  // Get the user's gamification profile
  const { 
    data: profile, 
    isLoading: profileLoading,
    error: profileError
  } = useQuery({
    queryKey: ['gamification-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        // Ensure the user has a gamification profile
        await initializeGamificationProfile(user.id);
        
        const { data, error } = await supabase
          .from('gamification_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        return {
          ...data,
          achievements: data.achievements || []
        } as GamificationProfile;
      } catch (error) {
        console.error('Error loading gamification profile:', error);
        return null;
      }
    },
    enabled: !!user,
    refetchInterval: 60000 // Refetch every minute
  });
  
  // Get the user's notifications
  const { 
    data: notifications = [], 
    isLoading: notificationsLoading 
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      return data as Notification[];
    },
    enabled: !!user
  });
  
  // Award points for an action
  const addPoints = async (
    amount: number, 
    type: 'message' | 'bubble' | 'reflection' | 'general' = 'general'
  ) => {
    if (!user) return false;
    
    const success = await awardPoints(user.id, amount, type);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile'] });
    }
    return success;
  };
  
  // Award an achievement
  const addAchievement = async (
    name: string,
    description: string,
    points: number = 50
  ) => {
    if (!user) return false;
    
    const success = await awardAchievement(user.id, name, description, points);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    return success;
  };
  
  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };
  
  // Compute level progress
  const progress = profile ? levelProgress(profile.points, profile.level) : 0;
  
  // Compute points needed for next level
  const nextLevelPoints = profile ? pointsForNextLevel(profile.level) : 100;
  
  // Subscribe to real-time updates for gamification profile and notifications
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to gamification profile changes
    const profileChannel = supabase
      .channel('gamification-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gamification_profiles',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['gamification-profile'] });
        }
      )
      .subscribe();
      
    // Subscribe to notification changes
    const notificationChannel = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [user, queryClient]);
  
  // Update unread notifications count
  useEffect(() => {
    if (notifications) {
      const unread = notifications.filter(n => !n.read).length;
      setUnreadNotifications(unread);
    }
  }, [notifications]);
  
  // Check for daily login and update streak
  useEffect(() => {
    if (user && profile) {
      const checkDailyLogin = async () => {
        const lastActive = new Date(profile.last_active);
        const today = new Date();
        const isNewDay = 
          lastActive.getDate() !== today.getDate() ||
          lastActive.getMonth() !== today.getMonth() ||
          lastActive.getFullYear() !== today.getFullYear();
          
        if (isNewDay) {
          // Update last active and possibly streak
          const { data, error } = await supabase
            .from('gamification_profiles')
            .update({ 
              last_active: new Date().toISOString(),
              daily_streak: 
                new Date(lastActive.getTime() + 24 * 60 * 60 * 1000).getDate() === today.getDate() ? 
                profile.daily_streak + 1 : 1
            })
            .eq('user_id', user.id)
            .select();
            
          if (!error && data && data[0]) {
            // Check streak achievements
            checkStreakAchievements(user.id, data[0].daily_streak);
          }
        }
      };
      
      checkDailyLogin();
    }
  }, [user, profile]);
  
  return {
    profile,
    profileLoading,
    profileError,
    notifications,
    notificationsLoading,
    unreadNotifications,
    addPoints,
    addAchievement,
    markAsRead,
    markAllAsRead,
    progress,
    nextLevelPoints
  };
};

export default useGamification;
