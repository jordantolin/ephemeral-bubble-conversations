
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Award, LogOut, User } from "lucide-react";
import LevelProgress from "@/components/gamification/LevelProgress";
import NotificationCenter from "@/components/gamification/NotificationCenter";

const NavbarActions: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  
  if (!user) return null;
  
  // Get user initials for avatar
  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    return user.email?.substring(0, 2).toUpperCase() || "U";
  };
  
  return (
    <div className="flex items-center gap-4">
      {/* Level indicator */}
      <div className="hidden md:block">
        <LevelProgress minimal />
      </div>
      
      {/* Notification center */}
      <NotificationCenter />
      
      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="cursor-pointer border-2 border-amber-100 hover:border-amber-200 transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name || "User"} />
            ) : (
              <AvatarFallback className="bg-[#ebbd34]/20 text-[#ebbd34]">
                {getInitials()}
              </AvatarFallback>
            )}
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer flex w-full items-center">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/achievements" className="cursor-pointer flex w-full items-center">
              <Award className="mr-2 h-4 w-4" />
              Achievements
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NavbarActions;
