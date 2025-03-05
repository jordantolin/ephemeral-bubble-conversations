
import React from 'react';
import { 
  Award, Gift, Trophy, Star, MessageCircle, Heart, 
  Compass, Sparkles, Bell, Check, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notification } from '@/hooks/useGamification';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead 
}) => {
  // Icon map based on icon_type field
  const getIcon = (iconType: string) => {
    const IconProps = { className: "h-5 w-5" };
    
    switch (iconType) {
      case 'award': return <Award {...IconProps} />;
      case 'gift': return <Gift {...IconProps} />;
      case 'trophy': return <Trophy {...IconProps} />;
      case 'star': return <Star {...IconProps} />;
      case 'message-circle': return <MessageCircle {...IconProps} />;
      case 'heart': return <Heart {...IconProps} />;
      case 'compass': return <Compass {...IconProps} />;
      case 'sparkles': return <Sparkles {...IconProps} />;
      case 'bell': return <Bell {...IconProps} />;
      default: return <Bell {...IconProps} />;
    }
  };
  
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) {
        return 'just now';
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(date);
      }
    } catch (error) {
      return 'Unknown date';
    }
  };

  return (
    <div className={`
      p-4 border-b last:border-b-0 flex items-start gap-3 transition-colors 
      ${notification.is_read ? 'bg-white' : 'bg-[#ebbd34]/5'}
    `}>
      <div className={`rounded-full p-2 flex-shrink-0 ${
        notification.is_read 
          ? 'bg-gray-100 text-gray-400' 
          : 'bg-[#ebbd34]/10 text-[#ebbd34]'
      }`}>
        {getIcon(notification.icon_type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
          {notification.title}
        </h4>
        <p className={`text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
          {notification.message}
        </p>
        {notification.points && (
          <div className="mt-1 text-sm font-medium text-[#ebbd34]">
            +{notification.points} points
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatDate(notification.created_at)}
        </p>
      </div>
      
      {!notification.is_read && (
        <Button 
          onClick={() => onMarkAsRead(notification.id)} 
          variant="ghost" 
          size="sm"
          className="text-gray-500 hover:text-[#ebbd34]"
        >
          <Check className="h-4 w-4" />
          <span className="sr-only">Mark as read</span>
        </Button>
      )}
      
      {notification.is_read && (
        <CheckCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
      )}
    </div>
  );
};

export default NotificationItem;
