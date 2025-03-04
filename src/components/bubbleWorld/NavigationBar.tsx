
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, X, Trophy, Menu, MessageCircle, User, Star, Sparkles, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/Logo";

interface NavigationBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ searchQuery, setSearchQuery }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  // Get user display name from profile or fallback to email
  const getUserDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (profile?.username) return profile.username;
    return user?.email?.split('@')[0] || 'User';
  };

  // Get first letter of display name for avatar fallback
  const getAvatarFallback = () => {
    const displayName = getUserDisplayName();
    return displayName[0].toUpperCase() || 'U';
  };

  return (
    <div className="bg-white/95 backdrop-blur-md fixed top-0 left-0 w-full z-50 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-2">
          <Logo size="md" withText={true} />
        </Link>

        {/* Navigation Links (Hidden on Small Screens) */}
        <div className="hidden md:flex items-center space-x-1">
          <Button
            variant="ghost"
            className="text-gray-700 hover:text-[#ebbd34] hover:bg-transparent"
            onClick={() => navigate("/feed")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Feed
          </Button>
          <Button
            variant="ghost"
            className="text-gray-700 hover:text-[#ebbd34] hover:bg-transparent"
            onClick={() => navigate("/my-bubbles")}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            My Bubbles
          </Button>
        </div>

        {/* Search Bar (Hidden on Small Screens) */}
        <div className="hidden sm:flex items-center flex-grow mx-4 max-w-md">
          <Input
            type="search"
            placeholder="Search bubbles..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-gray-50 border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              className="ml-2 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="sm:hidden rounded-full p-2 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="py-4 px-6">
              <Logo size="md" withText={true} />
            </div>
            <div className="px-4 pb-4">
              <Input
                type="search"
                placeholder="Search bubbles..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="bg-gray-50 border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
              />
            </div>
            <div className="py-2">
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none hover:bg-gray-100"
                onClick={() => handleNavigation("/feed")}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Feed
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none hover:bg-gray-100"
                onClick={() => handleNavigation("/my-bubbles")}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                My Bubbles
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none hover:bg-gray-100"
                onClick={() => handleNavigation("/leaderboard")}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none hover:bg-gray-100"
                onClick={() => handleNavigation("/achievements")}
              >
                <Star className="mr-2 h-4 w-4" />
                Achievements
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none hover:bg-gray-100"
                onClick={() => handleNavigation("/profile")}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
            </div>
            {user && (
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none hover:bg-gray-100"
                onClick={() => signOut()}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            )}
          </SheetContent>
        </Sheet>

        {/* Profile Section */}
        {user ? (
          <div className="relative">
            <Button
              variant="ghost"
              className="rounded-full p-0 h-9 w-9 overflow-hidden"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <Avatar>
                <AvatarImage src={profile?.avatar_url || ''} alt={getUserDisplayName()} />
                <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
              </Avatar>
            </Button>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <Link to="/profile">
                  <Button variant="ghost" className="w-full justify-start rounded-none hover:bg-gray-100">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-none hover:bg-gray-100"
                  onClick={() => signOut()}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-x-2 hidden sm:block">
            <Button variant="outline" onClick={() => navigate("/login")}>
              Log In
            </Button>
            <Button onClick={() => navigate("/register")}>Sign Up</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationBar;
