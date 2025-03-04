
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Sparkles, User, Star } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import SearchBar from './SearchBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface BubbleNavBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const BubbleNavBar: React.FC<BubbleNavBarProps> = ({ searchQuery, setSearchQuery }) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo and Search Section */}
          <div className="flex items-center gap-6 flex-1">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img 
                src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                alt="Bubble Trouble"
                className="w-8 h-8"
              />
              <span className="text-xl font-semibold hidden sm:inline text-[#ebbd34]">
                Bubble Trouble
              </span>
            </Link>
            
            <div className="relative flex-1 max-w-md hidden sm:block">
              <SearchBar 
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34]"
                >
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white z-[100]">
                <DropdownMenuItem className="flex flex-col items-start p-3">
                  <span className="font-medium text-[#ebbd34]">
                    {profile?.display_name || user?.email}
                  </span>
                  <span className="text-xs text-gray-500">
                    @{profile?.username || user?.email?.split('@')[0]}
                  </span>
                </DropdownMenuItem>
                <Link to="/profile">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                <Link to="/">
                  <DropdownMenuItem>
                    <Star className="mr-2 h-4 w-4" />
                    <span>Bubble World</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={signOut}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden px-4 pb-3">
        <SearchBar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />
      </div>
    </nav>
  );
};

export default BubbleNavBar;
