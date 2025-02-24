
import { MessageCircle, Search, User, TrendingUp, Heart, Star } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const MainNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#FEF7E4] to-[#FFF9EC] shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                alt="Bubble Trouble"
                className="w-8 h-8"
              />
              <span className="text-xl font-semibold text-[#ebbd34]">Bubble</span>
            </Link>

            {/* Always show navigation links */}
            <div className="flex items-center space-x-1">
              <Link 
                to="/feed" 
                className={`nav-link flex items-center space-x-1 px-3 py-2 rounded-md text-[#ebbd34] hover:bg-[#ebbd34]/10 ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/20' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Feed</span>
              </Link>
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center space-x-1 px-3 py-2 rounded-md text-[#ebbd34] hover:bg-[#ebbd34]/10 ${
                  location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/20' : ''
                }`}
              >
                <Star className="w-4 h-4" />
                <span>My Bubbles</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34] w-4 h-4" />
              <input
                type="search"
                placeholder="Search bubbles..."
                className="w-48 pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/10 border-[#ebbd34] border text-[#ebbd34] placeholder-[#ebbd34]/70 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
              />
            </div>

            <Link to="/profile" className="p-2 hover:bg-[#ebbd34]/10 rounded-full text-[#ebbd34]">
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNav;
