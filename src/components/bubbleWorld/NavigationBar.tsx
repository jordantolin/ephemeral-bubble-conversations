
import React, { useState, useEffect } from "react";
import {
  Search,
  Menu,
  X,
  User,
  LogOut,
  ChevronRight,
  Home,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationsDropdown from "@/components/gamification/NotificationsDropdown";

interface NavigationBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  const [scroll, setScroll] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScroll(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    const parts = name.split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-300 ${
        scroll
          ? "bg-white/95 backdrop-blur shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="text-[#ebbd34] font-bold text-lg flex items-center">
          <Sparkles className="h-5 w-5 mr-1" />
          Bubble World
        </Link>

        {/* Search (Medium and above) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bubbles..."
              className="w-full rounded-full bg-gray-100 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ebbd34]/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {/* Add the notifications dropdown */}
              <NotificationsDropdown />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar className="h-8 w-8 border border-[#ebbd34]/20">
                      <AvatarImage
                        src={profile?.avatar_url || undefined}
                        alt={getDisplayName()}
                      />
                      <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34]">
                        {getInitials(profile?.display_name || user.email || null)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700 mr-1 hidden lg:inline">
                      {getDisplayName()}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{getDisplayName()}</span>
                      <span className="text-xs text-gray-500 font-normal mt-1">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-500"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="text-gray-700"
              >
                Log in
              </Button>
              <Button
                onClick={() => navigate("/auth?signup=true")}
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
              >
                Sign up
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2">
          {user && <NotificationsDropdown />}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-80 pt-12">
              <X
                className="absolute right-4 top-4 h-5 w-5 text-gray-500"
                onClick={() => document.body.click()}
              />

              {user ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <Avatar className="h-10 w-10 border border-[#ebbd34]/20">
                      <AvatarImage
                        src={profile?.avatar_url || undefined}
                        alt={getDisplayName()}
                      />
                      <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34]">
                        {getInitials(profile?.display_name || user.email || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{getDisplayName()}</span>
                      <span className="text-xs text-gray-500">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  {/* Search on mobile */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search bubbles..."
                      className="w-full rounded-full bg-gray-100 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ebbd34]/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/")}
                      className="w-full justify-start"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Home
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/profile")}
                      className="w-full justify-start"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-500 border-red-100"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pt-4">
                  <Button
                    onClick={() => navigate("/auth")}
                    variant="outline"
                    className="w-full"
                  >
                    Log in
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => navigate("/auth?signup=true")}
                    className="w-full bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
                  >
                    Sign up
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default NavigationBar;
