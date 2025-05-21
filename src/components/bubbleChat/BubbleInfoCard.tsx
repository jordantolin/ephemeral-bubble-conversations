
import React from "react";
import { Star } from "lucide-react";
import { formatDate } from "@/utils/messageUtils";

interface BubbleInfoCardProps {
  bubble: {
    name: string;
    topic: string;
    description?: string | null;
    username: string;
    reflect_count?: number;
    created_at: string;
  };
  expired: boolean;
}

const BubbleInfoCard: React.FC<BubbleInfoCardProps> = ({ bubble, expired }) => {
  return (
    <div className="relative w-full max-w-3xl mx-auto mb-6">
      {/* Bubble info card with gradient styling and round corners */}
      <div 
        className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#ffda7b]/90 to-[#ebbd34]/90 shadow-lg p-5"
        style={{
          boxShadow: '0 10px 30px rgba(235, 189, 52, 0.2), 0 0 80px rgba(235, 189, 52, 0.1)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">{bubble.name}</h2>
            <p className="text-white/80 text-sm">{bubble.topic}</p>
            
            <div className="flex items-center mt-3 space-x-3">
              <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                <Star className="w-3 h-3 text-white mr-1" />
                <span className="text-xs text-white font-medium">
                  {bubble.reflect_count || 0}
                </span>
              </div>
              
              <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                <span className="text-xs text-white font-medium">
                  {formatDate(bubble.created_at)}
                </span>
              </div>
            </div>
          </div>
          
          {expired && (
            <div className="bg-red-600/80 text-white px-3 py-1 rounded-xl shadow-md rotate-[-15deg] transform">
              <p className="font-bold text-sm">EXPLODED</p>
            </div>
          )}
        </div>
        
        {bubble.description && (
          <div className="mt-4 bg-white/20 rounded-xl p-3">
            <p className="text-white/90 text-sm">{bubble.description}</p>
            <p className="text-white/70 text-xs mt-1">by @{bubble.username.split('@')[0]}</p>
          </div>
        )}
      </div>
      
      {/* Overlapping highlight effects */}
      <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/20 blur-xl -z-10" />
      <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-white/10 blur-xl -z-10" />
    </div>
  );
};

export default BubbleInfoCard;
