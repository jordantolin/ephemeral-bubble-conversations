
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  reflect_count: number;
  expires_at: string;
  created_at: string;
  username: string;
  size: "sm" | "md" | "lg";
}

interface ExpiredBubblesListProps {
  bubbles: Bubble[];
  formatDate: (dateString: string) => string;
}

const ExpiredBubblesList: React.FC<ExpiredBubblesListProps> = ({ bubbles, formatDate }) => {
  if (bubbles.length === 0) {
    return (
      <div className="text-center py-8 bg-white/60 rounded-xl backdrop-blur-sm">
        <p className="text-gray-500">No expired bubbles found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bubbles.map((bubble) => (
        <Link key={bubble.id} to={`/bubble/${bubble.id}`}>
          <div className="p-4 bg-white/80 rounded-xl border border-[#ebbd34]/10 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-[#ebbd34]">{bubble.name}</h3>
              <Badge className="bg-red-100 text-red-600 text-xs">Expired</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{bubble.topic}</p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{formatDate(bubble.expires_at)}</span>
              <div className="flex items-center">
                <Star className="w-3 h-3 mr-1 text-[#ebbd34]" />
                <span>{bubble.reflect_count} reflects</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ExpiredBubblesList;
