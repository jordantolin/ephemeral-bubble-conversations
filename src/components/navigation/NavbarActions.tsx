
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Award, LogOut, LogIn, User } from "lucide-react";
import LevelProgress from "@/components/gamification/LevelProgress";
import NotificationCenter from "@/components/gamification/NotificationCenter";

const NavbarActions: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Handle login click
  const handleLogin = () => {
    navigate("/auth");
  };
  
  // Get user initials for avatar
  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || "U";
  };
  
  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-yellow-500 hover:bg-yellow-500/10"
        onClick={handleLogin}
      >
        <LogIn className="h-5 w-5 mr-1" />
        <span>Login</span>
      </Button>
    );
  }
  
  return (
    <div className="flex items-center gap-4">
      {/* Notification center */}
      <NotificationCenter />
      
      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="cursor-pointer border-2 border-yellow-100 hover:border-yellow-200 transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name || "User"} />
            ) : (
              <AvatarFallback className="bg-yellow-500/20 text-yellow-500">
                {getInitials()}
              </AvatarFallback>
            )}
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span>My Account</span>
            <span className="text-xs text-gray-500">{user.email}</span>
          </DropdownMenuLabel>
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
              <div className="ml-auto">
                <LevelProgress minimal />
              </div>
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
