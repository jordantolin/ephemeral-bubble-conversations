
import React from 'react';
import { Search } from "lucide-react";

interface MobileSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const MobileSearchBar: React.FC<MobileSearchBarProps> = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="mb-6 md:hidden">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
        <input
          type="search"
          placeholder="Search your bubbles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-full border-none bg-[#ebbd34]/5 text-[#ebbd34] placeholder:text-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none text-sm"
        />
      </div>
    </div>
  );
};

export default MobileSearchBar;
