
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  points: number;
  icon_type: string;
  category: string;
  created_at: string;
};

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  created_at: string;
  achievement?: Achievement;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  icon_type: string;
  points: number | null;
  is_read: boolean;
  created_at: string;
};

// Extended Profile type that includes the new fields
export interface GamificationProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
  points: number;
  level: number;
}

export function useGamification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Fetch user's achievements
  const {
    data: userAchievements = [],
    isLoading: isLoadingAchievements,
    error: achievementsError,
  } = useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Using RPC to get the data we need - use proper typing for the RPC response
      const { data, error } = await supabase.rpc('get_user_achievements_with_details', { 
        user_id_param: user.id 
      });
      
      if (error) throw error;
      
      // Transform the data to match our expected format
      return (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        achievement_id: item.achievement_id,
        created_at: item.created_at,
        achievement: {
          id: item.achievement_id,
          name: item.name,
          description: item.description,
          points: item.points,
          icon_type: item.icon_type,
          category: item.category,
          created_at: item.achievement_created_at
        },
      })) as UserAchievement[];
    },
    enabled: !!user,
  });

  // Fetch all possible achievements
  const {
    data: allAchievements = [],
    isLoading: isLoadingAllAchievements,
  } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      // Use the RPC function to get all achievements with proper typing
      const { data, error } = await supabase.rpc('get_all_achievements');
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        points: item.points,
        icon_type: item.icon_type,
        category: item.category,
        created_at: item.created_at
      })) as Achievement[];
    },
    enabled: !!user,
  });

  // Fetch user's notifications
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    error: notificationsError,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our Notification type (read -> is_read)
      return data.map(notification => ({
        ...notification,
        is_read: notification.read,
      })) as Notification[];
    },
    enabled: !!user,
  });

  // Mark notification as read
  const markNotificationAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return notificationId;
    },
    onSuccess: (notificationId) => {
      // Update the local notification data
      queryClient.setQueryData(['notifications', user?.id], (oldData: Notification[] | undefined) => {
        if (!oldData) return [];
        return oldData.map((notification) => {
          if (notification.id === notificationId) {
            return { ...notification, is_read: true };
          }
          return notification;
        });
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Mark all notifications as read
  const markAllNotificationsAsRead = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      // Update all notifications in the cache
      queryClient.setQueryData(['notifications', user?.id], (oldData: Notification[] | undefined) => {
        if (!oldData) return [];
        return oldData.map((notification) => {
          return { ...notification, is_read: true };
        });
      });
      
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to mark all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || isSubscribed) return;

    // Subscribe to user achievements
    const achievementsChannel = supabase
      .channel('gamification-achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['user-achievements', user.id] });
          // Show toast for new achievement
          toast({
            title: 'New Achievement Unlocked!',
            description: 'Check your profile to see your new achievement!',
          });
        }
      )
      .subscribe();

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel('gamification-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    // Subscribe to profile updates for points and level changes
    const profileChannel = supabase
      .channel('gamification-profile')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
        }
      )
      .subscribe();

    setIsSubscribed(true);

    // Clean up subscriptions
    return () => {
      supabase.removeChannel(achievementsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(profileChannel);
      setIsSubscribed(false);
    };
  }, [user, isSubscribed, queryClient, toast]);

  // Get unread notifications count
  const unreadNotificationsCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return {
    userAchievements,
    isLoadingAchievements,
    achievementsError,
    allAchievements,
    isLoadingAllAchievements,
    notifications,
    isLoadingNotifications,
    notificationsError,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };
}
