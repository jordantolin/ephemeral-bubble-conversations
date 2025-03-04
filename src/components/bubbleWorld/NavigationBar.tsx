
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Settings, Search, LogOut, X, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LevelProgress from "@/components/gamification/LevelProgress";

interface NavigationBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ 
  searchQuery, 
  setSearchQuery 
}) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const searchInput = document.getElementById('search-input');
      if (showSearch && searchInput && !searchInput.contains(target)) {
        setShowSearch(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showSearch]);
  
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm border-b border-secondary/10">
      <div className="container mx-auto py-3 px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center font-semibold text-xl text-primary">
          Bubble World
        </Link>
        
        <div className="flex items-center space-x-4">
          {showSearch ? (
            <div className="flex items-center">
              <Input
                type="text"
                placeholder="Search bubbles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mr-2 rounded-full focus-visible:ring-secondary/40"
                id="search-input"
              />
              <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)}>
              <Search className="h-5 w-5" />
            </Button>
          )}
          
          {user ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user?.user_metadata?.avatar_url as string} />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu shadow bg-base-100 rounded-box w-52">
                <li className="flex items-center justify-between px-4 py-2">
                  <LevelProgress minimal />
                </li>
                <li><Link to="/profile">Profile</Link></li>
                <li><Link to="/achievements">Achievements</Link></li>
                <li><a onClick={signOut}>Logout</a></li>
              </ul>
            </div>
          ) : (
            <div className="space-x-2">
              <Button variant="outline" onClick={() => navigate('/login')}>Log In</Button>
              <Button onClick={() => navigate('/register')}>Sign Up</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavigationBar;
