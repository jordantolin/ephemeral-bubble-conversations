
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { User, MessageCircle, Settings, Sparkles } from "lucide-react";
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
          {/* Logo and text linking to home */}
          <Link to="/" className="flex items-center">
            <Logo size="md" />
            <span className="text-lg font-bold text-[#ebbd34] ml-2 hidden sm:inline">Bubble Trouble</span>
          </Link>

          {/* Navigation Items - improved spacing for mobile */}
          <div className="flex items-center justify-center space-x-8 sm:space-x-10">
            {/* My Bubbles */}
            <Link
              to="/my-bubbles"
              className={getButtonClass(isActive("/my-bubbles"))}
            >
              <MessageCircle size={22} />
              <span className="text-xs mt-1">My Bubbles</span>
            </Link>

            {/* Feed with Sparkles icon */}
            <Link
              to="/feed"
              className={getButtonClass(isActive("/feed"))}
            >
              <Sparkles size={22} />
              <span className="text-xs mt-1">Feed</span>
            </Link>

            {/* Notifications - positioned in center of nav */}
            <NotificationCenter />

            {/* Profile or Login */}
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
