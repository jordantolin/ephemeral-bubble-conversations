
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NavbarActions from "./NavbarActions";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import LevelProgress from "@/components/gamification/LevelProgress";
import { useAuth } from "@/context/AuthContext";

interface NavbarProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ searchQuery = "", setSearchQuery }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showSearch = setSearchQuery && (
    location.pathname === "/" || 
    location.pathname === "/feed" || 
    location.pathname === "/my-bubbles"
  );
  
  // Active route helper
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg shadow-sm border-b border-yellow-500/10">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center">
                <img 
                  src="/lovable-uploads/0428bfeb-0614-41c2-8ed4-223e71c018ad.png" 
                  alt="Bubble Trouble Logo" 
                  className="w-8 h-8"
                />
              </div>
              <span className="text-xl font-bold text-yellow-500 hidden sm:block">
                Bubble Trouble
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-4">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'text-yellow-500' 
                    : 'text-gray-500 hover:text-yellow-500'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/feed" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/feed') 
                    ? 'text-yellow-500' 
                    : 'text-gray-500 hover:text-yellow-500'
                }`}
              >
                Feed
              </Link>
              <Link 
                to="/my-bubbles" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/my-bubbles') 
                    ? 'text-yellow-500' 
                    : 'text-gray-500 hover:text-yellow-500'
                }`}
              >
                My Bubbles
              </Link>
              <Link 
                to="/achievements" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/achievements') 
                    ? 'text-yellow-500' 
                    : 'text-gray-500 hover:text-yellow-500'
                }`}
              >
                Achievements
              </Link>
            </nav>
          </div>
          
          {showSearch && (
            <div className="flex-1 max-w-md mx-4 relative hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search bubbles..."
                  className="pl-10 pr-4 h-9 bg-white/60"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                />
              </div>
            </div>
          )}
          
          {user && (
            <div className="hidden md:flex items-center mr-4">
              <LevelProgress minimal />
            </div>
          )}
          
          <NavbarActions />
        </div>
      </div>
      
      {showSearch && (
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search bubbles..."
              className="pl-10 pr-4 h-9 bg-white/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery?.(e.target.value)}
            />
          </div>
        </div>
      )}
      
      {/* Mobile navigation menu */}
      <div className="md:hidden flex justify-around items-center border-t border-gray-200 bg-white py-2">
        <button 
          onClick={() => navigate("/")}
          className={`flex flex-col items-center px-3 py-1 ${isActive('/') ? 'text-yellow-500' : 'text-gray-500'}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-xs mt-1">Home</span>
        </button>
        
        <button 
          onClick={() => navigate("/feed")}
          className={`flex flex-col items-center px-3 py-1 ${isActive('/feed') ? 'text-yellow-500' : 'text-gray-500'}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span className="text-xs mt-1">Feed</span>
        </button>
        
        <button 
          onClick={() => navigate("/my-bubbles")}
          className={`flex flex-col items-center px-3 py-1 ${isActive('/my-bubbles') ? 'text-yellow-500' : 'text-gray-500'}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 16.3c0-1 1-2.1 2.5-2.7" />
            <path d="M17 16.3c0-1-1-2.1-2.5-2.7" />
          </svg>
          <span className="text-xs mt-1">My Bubbles</span>
        </button>
        
        <button 
          onClick={() => navigate("/achievements")}
          className={`flex flex-col items-center px-3 py-1 ${isActive('/achievements') ? 'text-yellow-500' : 'text-gray-500'}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
            <circle cx="12" cy="8" r="7" />
          </svg>
          <span className="text-xs mt-1">Achievements</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
