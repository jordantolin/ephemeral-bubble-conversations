
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trophy, Star, Flame, Zap } from "lucide-react";
import { Notification } from "@/utils/gamificationUtils";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface NotificationsListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<boolean>;
  onMarkAllAsRead: () => Promise<boolean>;
  loading?: boolean;
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  loading = false
}) => {
  const getIcon = (type: string, iconType?: string) => {
    if (iconType === 'trophy') return <Trophy className="h-5 w-5 text-amber-500" />;
    if (iconType === 'star') return <Star className="h-5 w-5 text-amber-500" />;
    if (iconType === 'flame') return <Flame className="h-5 w-5 text-red-500" />;
    if (iconType === 'gift') return <Zap className="h-5 w-5 text-purple-500" />;
    
    switch (type) {
      case 'achievement':
        return <Trophy className="h-5 w-5 text-amber-500" />;
      case 'level_up':
        return <Star className="h-5 w-5 text-amber-500" />;
      case 'streak':
        return <Flame className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };
  
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading notifications...
      </div>
    );
  }
  
  if (!notifications || notifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No notifications yet
      </div>
    );
  }
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <div className="overflow-y-auto max-h-[500px]">
      {unreadCount > 0 && (
        <div className="flex justify-between items-center p-2 border-b">
          <Badge variant="secondary" className="bg-[#ebbd34]/20 text-[#ebbd34]">
            {unreadCount} unread
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMarkAllAsRead}
            className="text-xs text-[#ebbd34] hover:text-[#ebbd34]/80 hover:bg-[#ebbd34]/10"
          >
            Mark all as read
          </Button>
        </div>
      )}
      
      <div className="divide-y">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`p-3 flex gap-3 ${notification.read ? 'opacity-70' : 'bg-[#ebbd34]/5'}`}
          >
            <div className="mt-1">
              {getIcon(notification.type, notification.icon_type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm">{notification.title}</h4>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              {notification.points && (
                <div className="text-xs text-[#ebbd34] font-medium mt-1">
                  +{notification.points} points
                </div>
              )}
            </div>
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-[#ebbd34]/10"
                onClick={() => onMarkAsRead(notification.id)}
              >
                <Check className="h-3 w-3 text-[#ebbd34]" />
                <span className="sr-only">Mark as read</span>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsList;
