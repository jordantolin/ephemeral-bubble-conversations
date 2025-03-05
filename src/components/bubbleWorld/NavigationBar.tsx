
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { User, MessageCircle, Settings, PlusCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/gamification/NotificationCenter";
import Logo from "@/components/Logo";

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
        : "text-gray-600 hover:text-[#ebbd34]/70"
    }`;
  };

  return (
    <div className="w-full h-16 bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-200 fixed top-0 left-0 z-40">
      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          <Link to="/" className="flex items-center">
            <Logo size="md" />
            <span className="text-lg font-bold text-[#ebbd34] ml-2">Bubble Trouble</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link
              to="/my-bubbles"
              className={getButtonClass(isActive("/my-bubbles"))}
            >
              <MessageCircle size={22} />
              <span className="text-xs mt-1">My Bubbles</span>
            </Link>

            <Link to="/" className="flex items-center">
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90 shadow-md"
              >
                <PlusCircle size={20} />
              </Button>
            </Link>

            <NotificationCenter />

            {user && (
              <Link
                to="/profile"
                className={getButtonClass(isActive("/profile"))}
              >
                <User size={22} />
                <span className="text-xs mt-1">Profile</span>
              </Link>
            )}

            {!user && (
              <Link
                to="/auth"
                className={getButtonClass(isActive("/auth"))}
              >
                <Settings size={22} />
                <span className="text-xs mt-1">Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
