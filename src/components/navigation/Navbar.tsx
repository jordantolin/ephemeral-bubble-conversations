
import React from "react";
import { Link } from "react-router-dom";
import NavbarActions from "./NavbarActions";

const Navbar: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#ebbd34]/10">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-[#ebbd34]">
                Bubble
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-4">
              <Link to="/" className="text-sm font-medium text-gray-500 hover:text-[#ebbd34]">
                Home
              </Link>
              <Link to="/feed" className="text-sm font-medium text-gray-500 hover:text-[#ebbd34]">
                Feed
              </Link>
              <Link to="/my-bubbles" className="text-sm font-medium text-gray-500 hover:text-[#ebbd34]">
                My Bubbles
              </Link>
              <Link to="/achievements" className="text-sm font-medium text-gray-500 hover:text-[#ebbd34]">
                Achievements
              </Link>
            </nav>
          </div>
          
          <NavbarActions />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
