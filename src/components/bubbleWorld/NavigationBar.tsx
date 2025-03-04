import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, X, Trophy, Menu, Home, MessageCircle, User, Sparkles, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import LevelProgress from "@/components/gamification/LevelProgress";
import Logo from "@/components/Logo";

interface NavigationBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ 
  searchQuery, 
  setSearchQuery 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Handle outside clicks for search
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

  // Navigation items for desktop and mobile
  const navItems = [
    {
      name: "Home",
      path: "/",
      icon: <Home className="h-5 w-5" />
    },
    {
      name: "Feed",
      path: "/feed",
      icon: <Sparkles className="h-5 w-5" />
    },
    {
      name: "My Bubbles",
      path: "/my-bubbles",
      icon: <MessageCircle className="h-5 w-5" />
    },
    {
      name: "Profile",
      path: "/profile",
      icon: <User className="h-5 w-5" />
    },
    {
      name: "Achievements",
      path: "/achievements",
      icon: <Trophy className="h-5 w-5" />
    }
  ];

  // Active page indicator
  const isActivePage = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-white/80 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto py-3 px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Logo withText={!showSearch} />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-2 py-1 rounded-md ${
                isActivePage(item.path)
                  ? "bg-[#ebbd34]/10 text-[#ebbd34]"
                  : "text-gray-600 hover:text-[#ebbd34] hover:bg-[#ebbd34]/5"
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        
        {/* Right side with search and user menu */}
        <div className="flex items-center space-x-3">
          {showSearch ? (
            <div className="flex items-center">
              <Input
                type="text"
                placeholder="Search bubbles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] sm:w-[250px] mr-2 rounded-full focus-visible:ring-[#ebbd34]/40"
                id="search-input"
                autoFocus
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border border-[#ebbd34]/20">
                    <AvatarImage src={user?.user_metadata?.avatar_url as string} />
                    <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34]">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <LevelProgress minimal />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/achievements')}>
                  <Trophy className="mr-2 h-4 w-4 text-[#ebbd34]" />
                  <span>Achievements</span>
                  <div className="ml-auto flex items-center">
                    <Star className="h-3 w-3 text-[#ebbd34]" />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="space-x-2">
              <Button variant="outline" onClick={() => navigate('/auth')} className="text-sm hidden sm:inline-flex">Log In</Button>
              <Button 
                onClick={() => navigate('/auth')} 
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white text-sm"
              >
                Sign Up
              </Button>
            </div>
          )}
          
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80vw] sm:w-[350px] pt-12">
                <div className="flex flex-col h-full">
                  {user && (
                    <div className="pb-4 mb-4 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border border-[#ebbd34]/20">
                          <AvatarImage src={user?.user_metadata?.avatar_url as string} />
                          <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34]">
                            {user?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.email}</p>
                          <LevelProgress minimal />
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-sm"
                        onClick={() => {
                          navigate('/');
                          document.querySelector<HTMLButtonElement>('[data-state="open"]')?.click(); // Close sheet
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Bubble
                      </Button>
                    </div>
                  )}
                  
                  <nav className="flex-1">
                    <ul className="space-y-2">
                      {navItems.map((item) => (
                        <li key={item.path}>
                          <SheetClose asChild>
                            <Link
                              to={item.path}
                              className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                                isActivePage(item.path)
                                  ? "bg-[#ebbd34]/10 text-[#ebbd34]"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              {item.icon}
                              <span>{item.name}</span>
                            </Link>
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  
                  {user ? (
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <SheetClose asChild>
                        <Button variant="outline" className="w-full" onClick={() => signOut()}>
                          Log out
                        </Button>
                      </SheetClose>
                    </div>
                  ) : (
                    <div className="mt-auto pt-4 border-t border-gray-100 space-y-2">
                      <SheetClose asChild>
                        <Button 
                          className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                          onClick={() => navigate('/auth')}
                        >
                          Sign Up
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate('/auth')}
                        >
                          Log In
                        </Button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationBar;
