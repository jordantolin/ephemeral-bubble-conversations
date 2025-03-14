
import React from "react";
import { formatNotificationTime, getNotificationColor } from "@/utils/messageUtils";
import { Gift, Award, Star, Bell, Zap } from "lucide-react";

interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: string;
  iconType?: string;
  points?: number | null;
  created_at: string;
  read: boolean;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  title,
  message,
  type,
  iconType,
  points,
  created_at,
  read,
  onMarkAsRead
}) => {
  // Get icon based on type or iconType
  const getIcon = () => {
    if (iconType === 'gift') return <Gift className="h-5 w-5 text-white" />;
    if (iconType === 'award') return <Award className="h-5 w-5 text-white" />;
    if (iconType === 'star') return <Star className="h-5 w-5 text-white" />;
    if (iconType === 'zap') return <Zap className="h-5 w-5 text-white" />;
    
    // Default icons based on notification type
    switch (type) {
      case 'achievement':
        return <Award className="h-5 w-5 text-white" />;
      case 'level-up':
        return <Star className="h-5 w-5 text-white" />;
      case 'streak':
        return <Zap className="h-5 w-5 text-white" />;
      default:
        return <Bell className="h-5 w-5 text-white" />;
    }
  };

  return (
    <div 
      className={`p-4 border-b border-gray-100 ${read ? 'opacity-70' : ''}`}
      onClick={() => !read && onMarkAsRead(id)}
    >
      <div className="flex items-start">
        <div className={`${getNotificationColor(type)} p-2 rounded-full mr-3`}>
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-gray-900">{title}</h3>
            <span className="text-xs text-gray-500">{formatNotificationTime(created_at)}</span>
          </div>
          
          <p className="text-sm text-gray-600 mt-1">{message}</p>
          
          {points && (
            <div className="mt-1 flex items-center">
              <Star className="h-3 w-3 text-amber-500 mr-1" />
              <span className="text-xs font-medium text-amber-500">+{points} points</span>
            </div>
          )}
          
          {!read && (
            <div className="mt-2">
              <span className="text-xs text-white bg-amber-500 rounded-full px-2 py-0.5">
                New
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
