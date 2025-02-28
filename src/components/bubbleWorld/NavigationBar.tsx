
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Sparkles, TrendingUp, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ searchQuery, setSearchQuery }) => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get user initials for avatar
  const getUserInitials = (displayName?: string | null, email?: string | null) => {
    try {
      if (displayName) {
        return displayName.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
      }
      if (email) {
        return email.substring(0, 2).toUpperCase();
      }
    } catch (error) {
      console.error("Error generating user initials:", error);
    }
    return 'BT';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#ebbd34]/10 shadow-sm">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo and Search Section */}
          <div className="flex items-center gap-6 flex-1">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img 
                src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                alt="Bubble Trouble"
                className="w-9 h-9"
              />
              <span className="text-xl font-bold text-[#ebbd34] hidden sm:inline">
                Bubble Trouble
              </span>
            </Link>
            
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
              <input
                type="search"
                placeholder="Search bubbles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link 
              to="/my-bubbles" 
              className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/10' : ''
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">My Bubbles</span>
            </Link>
            <Link 
              to="/feed" 
              className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Feed</span>
            </Link>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34]"
                  >
                    <Avatar className="h-9 w-9 border-2 border-[#ebbd34]/20">
                      <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34] font-bold">
                        {getUserInitials(profile?.display_name, user?.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white z-[100] shadow-lg rounded-lg border border-[#ebbd34]/10">
                  <DropdownMenuItem className="flex flex-col items-start p-3">
                    <span className="font-medium text-[#ebbd34]">
                      {profile?.display_name || user?.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      @{profile?.username || user?.email?.split('@')[0]}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    navigate('/auth/logout');
                  }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate('/auth')}
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white ml-2"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
          <input
            type="search"
            placeholder="Search bubbles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none text-sm"
          />
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
