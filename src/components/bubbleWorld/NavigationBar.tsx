
import React from "react";
import { MessageSquare, Sparkles, Home, User, Trophy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const NavigationBar: React.FC = () => {
  const location = useLocation();
  
  const navigationLinks = [
    {
      icon: Home,
      label: "Home",
      path: "/feed",
    },
    {
      icon: Sparkles,
      label: "Feed",
      path: "/feed", 
    },
    {
      icon: MessageSquare,
      label: "My Bubbles",
      path: "/my-bubbles",
    },
    {
      icon: User,
      label: "Profile",
      path: "/profile",
    },
    {
      icon: Trophy,
      label: "Achievements",
      path: "/achievements",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full border-t bg-white dark:bg-gray-950 z-50">
      <div className="flex justify-around max-w-md mx-auto">
        {navigationLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "flex flex-col items-center py-2 px-3",
                isActive
                  ? "text-[#ebbd34]"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              )}
            >
              <link.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default NavigationBar;
