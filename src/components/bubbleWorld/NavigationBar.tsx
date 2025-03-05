
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, User, MessageCircle, Settings, PlusCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/gamification/NotificationCenter";

interface NavigationBarProps {
  searchQuery?: string;
  setSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ searchQuery, setSearchQuery }) => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getButtonClass = (active: boolean) => {
    return `flex flex-col items-center justify-center h-full transition-colors ${
      active
        ? "text-[#ebbd34]"
        : "text-gray-400 hover:text-[#ebbd34]/70"
    }`;
  };

  return (
    <div className="w-full h-16 bg-white/95 backdrop-blur-sm shadow-md border-t border-gray-200 fixed bottom-0 left-0 z-40">
      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          <Link to="/" className={getButtonClass(isActive("/"))}>
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </Link>

          <Link
            to="/my-bubbles"
            className={getButtonClass(isActive("/my-bubbles"))}
          >
            <MessageCircle size={24} />
            <span className="text-xs mt-1">My Bubbles</span>
          </Link>

          <div className="flex items-center justify-center">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90 shadow-lg"
            >
              <PlusCircle size={24} />
            </Button>
          </div>

          <NotificationCenter />

          {user && (
            <Link
              to="/profile"
              className={getButtonClass(isActive("/profile"))}
            >
              <User size={24} />
              <span className="text-xs mt-1">Profile</span>
            </Link>
          )}

          {!user && (
            <Link
              to="/auth"
              className={getButtonClass(isActive("/auth"))}
            >
              <Settings size={24} />
              <span className="text-xs mt-1">Login</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
