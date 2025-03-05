
import React, { useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import NotificationItem from "./NotificationItem";
import { useGamificationContext } from "@/context/GamificationContext";
import { Notification } from "@/hooks/useGamification";

const NotificationsDropdown = () => {
  const { 
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead,
    markAllNotificationsAsRead 
  } = useGamificationContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead.mutate();
  };

  // Format notifications to have a consistent interface
  const formattedNotifications: Notification[] = notifications.map(notification => ({
    ...notification,
    is_read: notification.is_read !== undefined ? notification.is_read : false
  }));

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ebbd34] text-[10px] font-medium text-white">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 md:w-96" 
        align="end" 
        forceMount
      >
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadNotificationsCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs font-normal text-[#ebbd34] hover:text-[#ebbd34]/90 hover:bg-[#ebbd34]/10"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px] overflow-auto">
          <DropdownMenuGroup>
            {formattedNotifications.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                <p>No notifications yet</p>
              </div>
            ) : (
              formattedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))
            )}
          </DropdownMenuGroup>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
