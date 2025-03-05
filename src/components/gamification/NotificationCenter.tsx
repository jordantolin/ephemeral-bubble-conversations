
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, Star, Award, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Notification, NotificationType, NotificationIconType } from "@/types/notification";

// Temporary type definition for database notifications
type DatabaseNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  icon_type?: string;
  points?: number;
}

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { recentAchievement } = useGamification();

  // Fetch notifications when component mounts
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Using any type to bypass TypeScript error until Supabase types are updated
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (error) throw error;
        
        if (data) {
          // Convert database results to our frontend Notification type
          // Cast as any first to avoid TypeScript errors
          const notificationsData = data as any as DatabaseNotification[];
          const typedNotifications: Notification[] = notificationsData.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type as NotificationType,
            read: n.read,
            createdAt: n.created_at,
            iconType: n.icon_type as NotificationIconType | undefined,
            points: n.points
          }));
          
          setNotifications(typedNotifications);
          
          // Calculate unread count
          const unreads = notificationsData.filter(n => !n.read).length;
          setUnreadCount(unreads);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
    
    // Subscribe to real-time notifications
    const setupRealtimeNotifications = () => {
      if (!user) return undefined;
      
      const channel = supabase
        .channel('notification-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as any as DatabaseNotification;
            
            // Add to notifications
            const typedNotification: Notification = {
              id: newNotification.id,
              title: newNotification.title,
              message: newNotification.message,
              type: newNotification.type as NotificationType,
              read: newNotification.read,
              createdAt: newNotification.created_at,
              iconType: newNotification.icon_type as NotificationIconType | undefined,
              points: newNotification.points
            };
            
            setNotifications(prev => [typedNotification, ...prev]);
            
            // Increment unread count
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .subscribe();
        
      return channel;
    };
    
    const channel = setupRealtimeNotifications();
    
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  // Also trigger notification update when a new achievement is unlocked
  useEffect(() => {
    if (recentAchievement) {
      // Achievement notifications are handled by the backend
      // This is just to make sure the UI updates
      setUnreadCount(prev => prev + 1);
    }
  }, [recentAchievement]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      // Update the database - using any type to bypass TypeScript error
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      // Update the database - using any type to bypass TypeScript error
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    if (!user) return;
    
    try {
      // Delete from database - using any type to bypass TypeScript error
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if needed
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === 'achievement') {
      if (notification.iconType === 'star') return <Star className="h-5 w-5 text-[#ebbd34]" />;
      if (notification.iconType === 'gift') return <Gift className="h-5 w-5 text-[#ebbd34]" />;
      return <Award className="h-5 w-5 text-[#ebbd34]" />;
    }
    
    if (notification.type === 'reflection') {
      return <Star className="h-5 w-5 text-[#ebbd34]" />;
    }
    
    if (notification.type === 'level') {
      return <Award className="h-5 w-5 text-[#ebbd34]" />;
    }
    
    return <Bell className="h-5 w-5 text-[#ebbd34]" />;
  };

  // Get background color based on notification type
  const getNotificationBackground = (notification: Notification) => {
    if (!notification.read) {
      return "bg-[#ebbd34]/10";
    }
    return "bg-white";
  };

  return (
    <div className="relative z-50">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5 text-[#ebbd34]" />
        
        {/* Notification Counter Badge */}
        {unreadCount > 0 && (
          <motion.span
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>
      
      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-[#ebbd34]/20"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg text-[#ebbd34]">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-8 text-[#ebbd34]"
                    onClick={markAllAsRead}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-[#ebbd34] border-t-transparent animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-[#ebbd34]/30" />
                <p>No notifications yet</p>
                <p className="text-sm">We'll notify you when something happens!</p>
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-[400px]">
                  <div className="p-2">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        className={`mb-2 p-3 rounded-lg border border-[#ebbd34]/10 ${getNotificationBackground(notification)}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <div className="flex items-start">
                          <div className="p-2 rounded-full bg-[#ebbd34]/10 mr-3">
                            {getNotificationIcon(notification)}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-gray-800">{notification.title}</h4>
                              <div className="flex gap-1">
                                {!notification.read && (
                                  <div className="h-2 w-2 rounded-full bg-[#ebbd34]"></div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 ml-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            
                            {notification.points && (
                              <div className="mt-1 flex items-center">
                                <Star className="h-3 w-3 text-[#ebbd34] mr-1" />
                                <span className="text-xs font-medium text-[#ebbd34]">+{notification.points} points</span>
                              </div>
                            )}
                            
                            <div className="mt-1 text-xs text-gray-400">
                              {new Date(notification.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
