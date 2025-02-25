
import { MessageCircle, Search, User, TrendingUp, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const MainNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // In a real app, you would implement search functionality here
      toast({
        title: "Searching...",
        description: `Looking for bubbles matching "${searchQuery}"`,
      });
      setSearchQuery("");
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      {/* Main header */}
      <nav className="bg-gradient-to-r from-[#FEF7E4] to-[#FFF9EC] shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and title section */}
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold text-[#ebbd34]">Bubble Trouble</span>
              </Link>
            </div>

            {/* Navigation and profile section */}
            <div className="flex items-center gap-2">
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center gap-1 px-3 py-2 rounded-md text-[#ebbd34] hover:bg-[#ebbd34]/10 ${
                  location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/20' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-1 px-3 py-2 rounded-md text-[#ebbd34] hover:bg-[#ebbd34]/10 ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/20' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <Link to="/profile" className="p-2 hover:bg-[#ebbd34]/10 rounded-full text-[#ebbd34]">
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Search bar section */}
      <div className="bg-gradient-to-r from-[#FEF7E4] to-[#FFF9EC] shadow-lg px-4 py-2">
        <form onSubmit={handleSearch} className="container mx-auto flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34] w-4 h-4" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/10 border-[#ebbd34] border text-[#ebbd34] placeholder-[#ebbd34]/70 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default MainNav;
