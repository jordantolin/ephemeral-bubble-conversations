
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Menu, Trophy, LogOut, X, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import NotificationCenter from "@/components/gamification/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface NavigationBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const NavigationBar = ({ searchQuery, setSearchQuery }: NavigationBarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Logo size="md" />

          {/* Search Input (Desktop) */}
          <div className="hidden md:flex md:w-1/3 lg:w-2/5">
            <div className="w-full relative">
              <Input
                type="text"
                placeholder="Search bubbles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 rounded-full border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/30"
              />
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-gray-400" />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 text-gray-400"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-2">
            <NotificationCenter />
            
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/achievements")}
            >
              <Trophy className="h-5 w-5 text-[#ebbd34]" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/profile")}
            >
              <User className="h-5 w-5 text-[#ebbd34]" />
            </Button>
            
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 text-[#ebbd34]" />
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-5 w-5 text-[#ebbd34]" />
            </Button>
          </div>
        </div>

        {/* Search Input (Mobile) */}
        <div className="md:hidden pb-3">
          <div className="w-full relative">
            <Input
              type="text"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 rounded-full border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/30"
            />
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-gray-400" />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 text-gray-400"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-b border-[#ebbd34]/10"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#ebbd34]/10">
                <div className="flex items-center">
                  <NotificationCenter />
                </div>
                <X
                  className="h-5 w-5 text-[#ebbd34]"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              </div>
              
              <Link
                to="/achievements"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#ebbd34]/10"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Trophy className="h-5 w-5 text-[#ebbd34]" />
                <span>Achievements</span>
              </Link>
              
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#ebbd34]/10"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="h-5 w-5 text-[#ebbd34]" />
                <span>Profile</span>
              </Link>
              
              {user && (
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#ebbd34]/10 w-full text-left"
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-5 w-5 text-[#ebbd34]" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default NavigationBar;
