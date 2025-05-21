
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, UserCircle, Sparkles, LogOut, LogIn, Award } from "lucide-react";
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut?.();
    navigate("/auth");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#FEF7E4]/80 backdrop-blur-lg shadow-sm border-b border-[#ebbd34]/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-full bg-[#ebbd34] flex items-center justify-center">
                <img 
                  src="/lovable-uploads/0428bfeb-0614-41c2-8ed4-223e71c018ad.png" 
                  alt="Bubble Trouble Logo" 
                  className="w-8 h-8"
                />
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
                  className={`text-[#ebbd34] hover:bg-[#ebbd34]/10 ${location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''}`}
                  onClick={() => navigate('/feed')}
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="ml-1 hidden sm:inline">Feed</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-[#ebbd34] hover:bg-[#ebbd34]/10 ${location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/10' : ''}`}
                  onClick={() => navigate('/my-bubbles')}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="h-5 w-5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="8" cy="10" r="2" />
                    <circle cx="16" cy="10" r="2" />
                    <circle cx="12" cy="15" r="3" />
                  </svg>
                  <span className="ml-1 hidden sm:inline">My Bubbles</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-[#ebbd34] hover:bg-[#ebbd34]/10 ${location.pathname === '/achievements' ? 'bg-[#ebbd34]/10' : ''}`}
                  onClick={() => navigate('/achievements')}
                >
                  <Award className="h-5 w-5" />
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
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/achievements")}>
                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
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
