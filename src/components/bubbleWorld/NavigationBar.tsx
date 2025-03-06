
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Trophy, User, UserCircle, Sparkles, Home, LogOut, LogIn, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InstallButton from "../InstallButton";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LevelProgress from "@/components/gamification/LevelProgress";

interface NavigationBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ searchQuery, setSearchQuery }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout?.();
    navigate("/auth");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#FEF7E4]/80 backdrop-blur-lg shadow-sm border-b border-[#ebbd34]/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-full bg-[#ebbd34] flex items-center justify-center sm:flex">
                {/* Mobile logo (visible only on small screens) */}
                <img 
                  src="/lovable-uploads/0bbe2757-6eb3-427d-87a5-3c0594d4ae5c.png" 
                  alt="Bubble Trouble Logo" 
                  className="w-8 h-8 sm:hidden"
                />
                {/* Desktop icon (only visible on larger screens) */}
                <Sparkles className="w-5 h-5 text-white hidden sm:block" />
              </div>
              <div className="font-bold text-xl text-[#ebbd34] hidden sm:block">Bubble Trouble</div>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-4 relative hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search bubbles..."
                className="pl-10 pr-4 h-9 bg-white/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Navigation Links and User Profile */}
          <div className="flex items-center gap-1 sm:gap-2">
            <InstallButton />
            
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#ebbd34] hover:bg-[#ebbd34]/10"
                  onClick={() => navigate('/')}
                >
                  <Home className="h-5 w-5" />
                  <span className="ml-1 hidden sm:inline">Home</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#ebbd34] hover:bg-[#ebbd34]/10"
                  onClick={() => navigate('/achievements')}
                >
                  <Trophy className="h-5 w-5" />
                  <span className="ml-1 hidden sm:inline">Achievements</span>
                </Button>
                
                <div className="mx-1 hidden md:block">
                  <LevelProgress minimal />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 text-[#ebbd34] hover:bg-[#ebbd34]/10"
                    >
                      <UserCircle className="h-6 w-6" />
                      <span className="sr-only">Profile</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>My Account</span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-bubbles")}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span>My Bubbles</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/achievements")}>
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>Achievements</span>
                      <div className="ml-auto">
                        <LevelProgress minimal />
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-[#ebbd34] hover:bg-[#ebbd34]/10"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="h-5 w-5 mr-1" />
                <span>Login</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search bubbles..."
            className="pl-10 pr-4 h-9 bg-white/60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
