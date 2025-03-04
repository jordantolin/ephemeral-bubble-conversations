
import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Search, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import BubbleCard from './BubbleCard';

interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  reflect_count: number;
  expires_at: string;
  created_at: string;
}

interface BubblesListProps {
  isLoading: boolean;
  bubbles: Bubble[];
  filteredBubbles: Bubble[];
  searchQuery: string;
  formatDate: (dateString: string) => string;
  isBubbleExpired: (bubble: Bubble) => boolean;
}

const BubblesList: React.FC<BubblesListProps> = ({ 
  isLoading, 
  bubbles, 
  filteredBubbles, 
  searchQuery, 
  formatDate, 
  isBubbleExpired 
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#ebbd34] animate-spin mb-4" />
        <p className="text-[#ebbd34]">Loading your bubbles...</p>
      </div>
    );
  }

  if (!bubbles || filteredBubbles.length === 0) {
    return (
      <div className="text-center py-16 bg-white/60 rounded-3xl shadow-sm backdrop-blur-sm">
        {searchQuery ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
              <Search className="w-8 h-8 text-[#ebbd34]" />
            </div>
            <h3 className="text-lg font-medium text-[#ebbd34]">No matches found</h3>
            <p className="text-gray-500 mt-2">Try a different search term</p>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
              <Sparkles className="w-8 h-8 text-[#ebbd34]" />
            </div>
            <h3 className="text-lg font-medium text-[#ebbd34]">No reflected bubbles yet</h3>
            <p className="text-gray-500 mt-2">Explore the bubble world and reflect on topics that interest you!</p>
            <Link to="/">
              <Button className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white">
                Explore Bubbles
              </Button>
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredBubbles.map((bubble: Bubble) => (
        <BubbleCard
          key={bubble.id}
          bubble={bubble}
          formatDate={formatDate}
          isBubbleExpired={isBubbleExpired}
        />
      ))}
    </div>
  );
};

export default BubblesList;
