
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Users, MessageCircle, Sparkles, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BubbleData } from "@/types/bubble";
import ChatMessagePreview from './ChatMessagePreview';

interface BubbleCardProps {
  bubble: BubbleData;
  handleReflect: (bubbleId: string, event: React.MouseEvent) => void;
  formatDate: (timestamp: string) => string;
  getUserColor: (username: string) => string;
  formatMessageTime: (timestamp: string) => string;
  getMessagePreview: (content: string) => string;
  isBubbleExpired: (bubble: BubbleData) => boolean;
  bubbleMessages: any;
  bubbleParticipants: Record<string, number>;
  messagesLoading: boolean;
}

const BubbleCard: React.FC<BubbleCardProps> = ({
  bubble,
  handleReflect,
  formatDate,
  getUserColor,
  formatMessageTime,
  getMessagePreview,
  isBubbleExpired,
  bubbleMessages,
  bubbleParticipants,
  messagesLoading
}) => {
  const navigate = useNavigate();
  const isExpired = isBubbleExpired(bubble);

  // Function to calculate time remaining until expiration or time since expiration
  const getTimeStatus = () => {
    try {
      if (!bubble.expires_at) return { text: "Unknown expiry", isExpiring: false };

      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      
      if (expiryTime > now) {
        // Not expired yet - calculate remaining time
        const diffMs = expiryTime.getTime() - now.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const isExpiring = diffHrs < 2; // Less than 2 hours remaining
        
        if (diffHrs === 0) {
          return { text: `Expires in ${diffMins} min`, isExpiring };
        } else {
          return { text: `Expires in ${diffHrs}h ${diffMins}m`, isExpiring };
        }
      } else {
        // Already expired - calculate time since expiration
        const diffMs = now.getTime() - expiryTime.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        
        return { 
          text: `Expired ${diffHrs < 1 ? 'recently' : `${diffHrs}h ago`}`, 
          isExpiring: false
        };
      }
    } catch (e) {
      console.error("Error calculating time status:", e);
      return { text: "Unknown status", isExpiring: false };
    }
  };

  const timeStatus = getTimeStatus();

  // Function to handle bubble navigation with proper route
  const navigateToBubble = (bubbleId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    navigate(`/bubble/${bubbleId}`);
  };

  return (
    <div 
      className="relative w-[95vw] max-w-[300px] h-[300px] rounded-full overflow-visible cursor-pointer"
      onClick={() => navigateToBubble(bubble.id)}
    >
      {/* Background circle */}
      <div 
        className={`absolute inset-0 rounded-full ${
          isExpired 
            ? 'bg-gradient-to-br from-[#ffda7b]/60 to-[#ebbd34]/60'
            : 'bg-gradient-to-br from-[#ffda7b] to-[#ebbd34]'
        } shadow-lg`}
      />
      
      {/* Inner bubble with content */}
      <div 
        className={`absolute inset-[10px] rounded-full ${
          isExpired ? 'bg-white/70' : 'bg-white/90'
        } backdrop-blur-sm shadow-inner`}
      />
        
      {/* Time status indicator (expiry countdown or expired status) */}
      <div 
        className={`absolute top-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs z-10 ${
          timeStatus.isExpiring 
            ? 'bg-red-100 text-red-600' 
            : isExpired 
              ? 'bg-gray-100 text-gray-600' 
              : 'bg-[#ebbd34]/10 text-[#ebbd34]'
        }`}
      >
        <Clock className="w-3 h-3 inline-block mr-1" />
        {timeStatus.text}
      </div>

      {/* Content container */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-6 text-center">
        {/* Top section - bubble title */}
        <div className="w-full mt-4">
          <h2 
            className={`text-xl font-bold ${isExpired ? 'text-[#ebbd34]/70' : 'text-[#ebbd34]'} mb-1`}
          >
            {bubble.name}
          </h2>
          <p className="text-sm text-[#ebbd34]/80 font-medium">
            {bubble.topic}
          </p>
        </div>
        
        {/* Middle section - stats and description */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex items-center bg-[#ebbd34]/10 rounded-full px-3 py-1">
              <Star className="w-3 h-3 text-[#ebbd34] mr-1" />
              <span className="text-xs text-[#ebbd34] font-medium">
                {bubble.reflect_count}
              </span>
            </div>
            
            <div className="flex items-center bg-[#ebbd34]/10 rounded-full px-3 py-1">
              <Users className="w-3 h-3 text-[#ebbd34] mr-1" />
              <span className="text-xs text-[#ebbd34] font-medium">
                {bubbleParticipants[bubble.id] || 0}
              </span>
            </div>
            
            <div className="flex items-center bg-[#ebbd34]/10 rounded-full px-3 py-1">
              <span className="text-xs text-[#ebbd34] font-medium">
                {formatDate(bubble.created_at || '')}
              </span>
            </div>
          </div>
          
          {bubble.description && (
            <p className={`${isExpired ? 'text-[#ebbd34]/50' : 'text-[#ebbd34]/80'} text-xs mb-2 max-w-[90%] line-clamp-2 font-medium leading-tight`}>
              {bubble.description}
            </p>
          )}
          
          <p className="text-[#ebbd34]/70 text-xs font-medium">
            by @{bubble.username?.split('@')[0] || 'unknown'}
          </p>
        </div>
        
        {/* Bottom section - chat preview */}
        <ChatMessagePreview 
          bubbleId={bubble.id}
          messages={bubbleMessages[bubble.id] || []}
          getUserColor={getUserColor}
          formatMessageTime={formatMessageTime}
          getMessagePreview={getMessagePreview}
          messagesLoading={messagesLoading}
        />
      </div>
      
      {/* Action buttons */}
      <div 
        className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex items-center space-x-4"
        style={{ zIndex: 20 }}
        onClick={(e) => e.stopPropagation()} // Prevent triggering the bubble click
      >
        <Button 
          onClick={(e) => handleReflect(bubble.id, e)}
          className={`${
            isExpired 
              ? 'bg-[#ebbd34]/50 hover:bg-[#ebbd34]/60' 
              : 'bg-[#ebbd34] hover:bg-[#ebbd34]/90'
          } text-white rounded-full px-4 py-1 shadow-md`}
          size="sm"
          disabled={isExpired}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Reflect
        </Button>
        
        <Button 
          onClick={(e) => navigateToBubble(bubble.id, e)}
          className={`${
            isExpired 
              ? 'bg-white/80 hover:bg-white/90 text-[#ebbd34]/70 border border-[#ebbd34]/20' 
              : 'bg-white hover:bg-white/90 text-[#ebbd34] border border-[#ebbd34]/30'
          } rounded-full px-4 py-1 shadow-sm`}
          size="sm"
        >
          <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
          {isExpired ? 'View' : 'Join'}
        </Button>
      </div>

      {/* "Exploded" indicator for expired bubbles - made more subtle */}
      {isExpired && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-[15px] rounded-full bg-black/5 backdrop-blur-sm z-10" />
          <div className="bg-red-600/70 text-white px-3 py-1 rounded-lg shadow-md z-20 rotate-[-10deg] transform">
            <p className="font-bold text-sm">EXPIRED</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BubbleCard;
