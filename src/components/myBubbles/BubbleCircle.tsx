
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BubbleData } from "@/types/bubble";
import { Link } from "react-router-dom";
import { calculateCircularPositions, getBubbleColor, formatExpiryTime } from "@/utils/circleUtils";
import { Clock, MessageCircle, Star } from "lucide-react";

interface BubbleCircleProps {
  bubbles: BubbleData[];
  onBubbleClick: (id: string) => void;
}

const BubbleCircle: React.FC<BubbleCircleProps> = ({ bubbles, onBubbleClick }) => {
  const [positionedBubbles, setPositionedBubbles] = useState<BubbleData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;
      
      const { width, height } = containerRef.current.getBoundingClientRect();
      const positioned = calculateCircularPositions(bubbles, width, height);
      setPositionedBubbles(positioned);
    };
    
    updatePositions();
    window.addEventListener("resize", updatePositions);
    
    return () => {
      window.removeEventListener("resize", updatePositions);
    };
  }, [bubbles]);
  
  // Function to determine bubble display size
  const getBubbleSize = (size: "sm" | "md" | "lg") => {
    switch (size) {
      case "sm": return "w-24 h-24";
      case "md": return "w-32 h-32";
      case "lg": return "w-40 h-40";
      default: return "w-32 h-32";
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] bg-[#FEF7E4]/50 rounded-full mx-auto border-2 border-[#ebbd34]/20 overflow-hidden"
    >
      {/* Center indicator */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#ebbd34]/20 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-[#ebbd34]/30 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#ebbd34]/40 flex items-center justify-center">
            <span className="text-[#ebbd34] font-bold">{bubbles.length}</span>
          </div>
        </div>
      </div>
      
      {/* Bubbles positioned in a circle */}
      {positionedBubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className={`absolute rounded-full shadow-lg cursor-pointer ${getBubbleSize(bubble.size)}`}
          style={{ 
            backgroundColor: getBubbleColor(bubble.topic),
            left: bubble.x ? bubble.x - (parseInt(getBubbleSize(bubble.size).split(" ")[0].replace("w-", "")) / 2) : 0,
            top: bubble.y ? bubble.y - (parseInt(getBubbleSize(bubble.size).split(" ")[1].replace("h-", "")) / 2) : 0,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => onBubbleClick(bubble.id)}
        >
          <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-2 text-center">
            <h3 className="text-white text-xs font-bold leading-tight mb-1 drop-shadow-md">{bubble.name}</h3>
            <p className="text-white text-[10px] leading-tight mb-1 drop-shadow-md">{bubble.topic}</p>
            
            <div className="flex items-center justify-center mb-1">
              <Star className="w-3 h-3 text-white drop-shadow-md mr-1" />
              <span className="text-white text-[10px] drop-shadow-md">{bubble.reflect_count}</span>
            </div>
            
            <div className="flex items-center justify-center">
              <Clock className="w-3 h-3 text-white drop-shadow-md mr-1" />
              <span className="text-white text-[10px] drop-shadow-md">{formatExpiryTime(bubble.expires_at)}</span>
            </div>
          </div>
        </motion.div>
      ))}
      
      {/* Empty state */}
      {bubbles.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[#ebbd34] text-lg font-medium mb-2">No active bubbles</p>
          <p className="text-gray-600 text-sm">Your reflected and created bubbles will appear here</p>
        </div>
      )}
    </div>
  );
};

export default BubbleCircle;
