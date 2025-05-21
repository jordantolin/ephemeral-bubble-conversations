
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NotificationItem from "./NotificationItem";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  icon_type?: string;
  points?: number | null;
  created_at: string;
  read: boolean;
  user_id: string;
}

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Fetch notifications when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);
  
  // Setup real-time listener for new notifications
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Add new notification to state
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        
        // Show toast for new notification
        toast({
          title: newNotification.title,
          description: newNotification.message,
          duration: 5000,
        });
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
  
  // Fetch notifications from database
  const fetchNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) {
        console.error("Error fetching notifications:", error.message);
        return;
      }
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mark a notification as read
  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    
    try {
      // Update in database
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);
        
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!user || notifications.filter(n => !n.read).length === 0) return;
    
    try {
      // Update in database
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  return (
    <div className="relative">
      {/* Bell icon with unread badge */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 bg-amber-500 text-white w-5 h-5 flex items-center justify-center p-0 text-xs" 
            variant="default"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      {/* Notification panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 w-80 md:w-96 z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Notifications</h2>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs flex items-center gap-1"
                    onClick={handleMarkAllAsRead}
                  >
                    <Check className="h-3 w-3" />
                    Mark all read
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Notification list */}
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex animate-pulse">
                      <div className="bg-gray-200 rounded-full w-10 h-10 mr-3" />
                      <div className="flex-1">
                        <div className="bg-gray-200 h-4 w-3/4 rounded mb-2" />
                        <div className="bg-gray-200 h-3 w-full rounded mb-1" />
                        <div className="bg-gray-200 h-3 w-2/3 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                  <p className="text-sm">We'll notify you when something happens</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    {...notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
