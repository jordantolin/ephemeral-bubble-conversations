
import React, { useState } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Notification } from "@/utils/gamificationUtils";
import NotificationsList from "./NotificationsList";

interface NotificationsPopoverProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => Promise<boolean>;
  onMarkAllAsRead: () => Promise<boolean>;
  loading?: boolean;
}

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5 text-[#ebbd34]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        onInteractOutside={() => setIsOpen(false)}
      >
        <div className="bg-[#ebbd34]/10 p-3 border-b">
          <h3 className="font-medium text-[#ebbd34]">Notifications</h3>
        </div>
        
        <NotificationsList 
          notifications={notifications}
          onMarkAsRead={async (id) => {
            const result = await onMarkAsRead(id);
            return result;
          }}
          onMarkAllAsRead={onMarkAllAsRead}
          loading={loading}
        />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
