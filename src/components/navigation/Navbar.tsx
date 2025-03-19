
import { Link, useLocation } from "react-router-dom";
import { Search, User, TrendingUp, Sparkles, Home } from "lucide-react";

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const Navbar = ({ searchQuery, setSearchQuery }: NavbarProps) => {
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
              <span className="text-xl font-semibold text-[#ebbd34] hidden sm:inline">
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
          <div className="flex items-center gap-1">
            <Link 
              to="/"
              className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                location.pathname === '/' ? 'bg-[#ebbd34]/10' : ''
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
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
                location.pathname === '/feed' ? 'bg-[#ebbd34]/10 font-bold' : ''
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Feed</span>
            </Link>
            <Link 
              to="/profile" 
              className={`p-2 hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34] transition-colors ${
                location.pathname === '/profile' ? 'bg-[#ebbd34]/10' : ''
              }`}
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden px-4 pb-3">
        <div className="relative">
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
    </nav>
  );
};

export default Navbar;
