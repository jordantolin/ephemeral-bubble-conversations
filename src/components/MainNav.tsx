
import { MessageCircle, Search, User, TrendingUp, Heart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const MainNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                alt="Bubble Trouble"
                className="w-8 h-8"
              />
              <span className="text-xl font-semibold text-primary">Bubble Trouble</span>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              <Link 
                to="/feed" 
                className={`nav-link flex items-center space-x-1 ${
                  location.pathname === '/feed' ? 'bg-secondary' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Feed</span>
              </Link>
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center space-x-1 ${
                  location.pathname === '/my-bubbles' ? 'bg-secondary' : ''
                }`}
              >
                <Heart className="w-4 h-4" />
                <span>My Bubbles</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="search"
                placeholder="Search bubbles..."
                className="w-48 pl-10 pr-4 py-2 rounded-full bg-secondary border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            <Link to="/profile" className="nav-link">
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNav;
