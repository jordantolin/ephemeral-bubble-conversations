
import React from 'react';
import { Button } from "@/components/ui/button";
import { Notification } from '@/hooks/useGamification';
import { formatDistanceToNow } from 'date-fns';
import { Award, MessageSquare, Star, Gift, Activity, Check } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead 
}) => {
  // Get icon based on notification type
  const getIcon = () => {
    switch(notification.icon_type) {
      case 'award':
        return <Award className="h-8 w-8 text-[#ebbd34]" />;
      case 'message':
        return <MessageSquare className="h-8 w-8 text-blue-500" />;
      case 'star':
        return <Star className="h-8 w-8 text-purple-500" />;
      case 'gift':
        return <Gift className="h-8 w-8 text-green-500" />;
      default:
        return <Activity className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div 
      className={`flex items-start p-4 border-b last:border-b-0 
        ${notification.is_read ? 'bg-white' : 'bg-[#ebbd34]/5'}`}
    >
      <div className="flex-shrink-0 mr-4">
        {getIcon()}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">{notification.title}</h4>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mt-1">
          {notification.message}
        </p>
        
        {notification.points && (
          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#ebbd34]/10 text-[#ebbd34]">
            +{notification.points} points
          </div>
        )}
      </div>
      
      {!notification.is_read && (
        <Button 
          size="sm" 
          variant="ghost" 
          className="flex-shrink-0 ml-2 text-[#ebbd34] hover:text-[#ebbd34]/80 hover:bg-[#ebbd34]/10"
          onClick={() => onMarkAsRead(notification.id)}
          title="Mark as read"
        >
          <Check className="h-4 w-4" />
          <span className="sr-only">Mark as read</span>
        </Button>
      )}
    </div>
  );
};

export default NotificationItem;
