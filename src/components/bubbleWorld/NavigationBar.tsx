
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import LevelProgress from "@/components/gamification/LevelProgress";
import DailyStreakIndicator from "@/components/gamification/DailyStreakIndicator";
import NotificationCenter from "@/components/gamification/NotificationCenter";

const NavigationBar: React.FC = () => {
  const { user, profile } = useAuth();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center">
          <Logo size="md" />
        </div>
        
        <div className="hidden md:flex items-center gap-1">
          <NavLink 
            to="/bubbles"
            className={({ isActive }) => `px-4 py-2 rounded-md transition-colors ${
              isActive 
                ? 'text-[#ebbd34] font-semibold bg-amber-50' 
                : 'text-gray-600 hover:text-[#ebbd34] hover:bg-amber-50/50'
            }`}
          >
            Explore
          </NavLink>
          
          {user && (
            <NavLink 
              to="/my-bubbles"
              className={({ isActive }) => `px-4 py-2 rounded-md transition-colors ${
                isActive 
                  ? 'text-[#ebbd34] font-semibold bg-amber-50' 
                  : 'text-gray-600 hover:text-[#ebbd34] hover:bg-amber-50/50'
              }`}
            >
              My Bubbles
            </NavLink>
          )}
          
          {user && (
            <NavLink 
              to="/achievements"
              className={({ isActive }) => `px-4 py-2 rounded-md transition-colors ${
                isActive 
                  ? 'text-[#ebbd34] font-semibold bg-amber-50' 
                  : 'text-gray-600 hover:text-[#ebbd34] hover:bg-amber-50/50'
              }`}
            >
              Achievements
            </NavLink>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center mr-2">
                <DailyStreakIndicator />
                <LevelProgress />
              </div>
              
              <div className="flex items-center gap-2">
                <NotificationCenter />
                
                <NavLink to="/profile">
                  <Avatar className="cursor-pointer border-2 border-[#ebbd34]/20 hover:border-[#ebbd34]/50 transition-colors">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34]">
                      {profile?.display_name 
                        ? getInitials(profile.display_name) 
                        : user.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </NavLink>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <Button asChild size="sm" variant="ghost">
                <NavLink to="/auth?mode=login">Log in</NavLink>
              </Button>
              <Button asChild size="sm" className="bg-[#ebbd34] hover:bg-[#ebbd34]/90">
                <NavLink to="/auth?mode=signup">Sign up</NavLink>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
