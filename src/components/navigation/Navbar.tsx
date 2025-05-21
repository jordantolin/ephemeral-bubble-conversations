
import React from "react";
import { Link, useLocation } from "react-router-dom";
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
  const { user } = useAuth();
  const showSearch = setSearchQuery && (
    location.pathname === "/" || 
    location.pathname === "/feed" || 
    location.pathname === "/my-bubbles"
  );
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FEF7E4]/80 backdrop-blur-lg shadow-sm border-b border-yellow-400/10">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center">
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
              <Link to="/" className={`text-sm font-medium ${location.pathname === '/' ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}>
                Home
              </Link>
              <Link to="/feed" className={`text-sm font-medium ${location.pathname === '/feed' ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}>
                Feed
              </Link>
              <Link to="/my-bubbles" className={`text-sm font-medium ${location.pathname === '/my-bubbles' ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}>
                My Bubbles
              </Link>
              <Link to="/achievements" className={`text-sm font-medium ${location.pathname === '/achievements' ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}>
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
    </header>
  );
};

export default Navbar;
