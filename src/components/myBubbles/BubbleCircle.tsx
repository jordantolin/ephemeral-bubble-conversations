
import React, { useState, useEffect, useRef } from "react";
import { BubbleData } from "@/types/bubble";
import { Link } from "react-router-dom";
import { calculateCircularPositions, calculateFloatingPositions, getBubbleColor, formatExpiryTime } from "@/utils/circleUtils";
import { Clock, MessageCircle, Star } from "lucide-react";

interface BubbleCircleProps {
  bubbles: BubbleData[];
  onBubbleClick: (id: string) => void;
}

const BubbleCircle: React.FC<BubbleCircleProps> = ({ bubbles, onBubbleClick }) => {
  const [positionedBubbles, setPositionedBubbles] = useState<BubbleData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const initialPositionsRef = useRef<BubbleData[]>([]);
  const isAnimatingRef = useRef<boolean>(false); // Default to not animating
  const isInitializedRef = useRef<boolean>(false);
  
  // Debug bubbles data on mount and when bubbles change
  useEffect(() => {
    console.log("BubbleCircle received bubbles:", bubbles.length);
    if (bubbles.length > 0) {
      console.log("First bubble:", bubbles[0]);
    }
  }, [bubbles]);

  // Set up initial positions in a circle
  useEffect(() => {
    const updateInitialPositions = () => {
      if (!containerRef.current) return;
      
      const { width, height } = containerRef.current.getBoundingClientRect();
      console.log("Container dimensions:", width, height);
      
      if (!bubbles || bubbles.length === 0) {
        console.log("No bubbles to position");
        setPositionedBubbles([]);
        initialPositionsRef.current = [];
        return;
      }
      
      const positioned = calculateCircularPositions(bubbles, width, height);
      initialPositionsRef.current = positioned;
      
      console.log("Initial positioned bubbles:", positioned.length);
      if (positioned.length > 0) {
        console.log("First positioned bubble:", positioned[0]);
      }
      
      // Initialize positions
      setPositionedBubbles(positioned);
      
      // Ritardare l'inizio dell'animazione e disabilitarla di default
      setTimeout(() => {
        isAnimatingRef.current = false; // Disabilitato di default, cambiato da true a false
      }, 1000);
      
      isInitializedRef.current = true;
    };
    
    updateInitialPositions();
    
    // Add resize listener
    window.addEventListener("resize", updateInitialPositions);
    
    return () => {
      window.removeEventListener("resize", updateInitialPositions);
    };
  }, [bubbles]);
  
  // Loop di animazione estremamente lento, o completamente disabilitato per impostazione predefinita
  useEffect(() => {
    const animate = () => {
      if (initialPositionsRef.current && 
          initialPositionsRef.current.length > 0 && 
          isAnimatingRef.current &&
          isInitializedRef.current) {
        const time = Date.now();
        const floatingBubbles = calculateFloatingPositions(
          initialPositionsRef.current,
          time,
          0.5 // Raggio di fluttuazione estremamente ridotto per un movimento quasi impercettibile
        );
        setPositionedBubbles(floatingBubbles);
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    // Proper cleanup of animation frame
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, []);
  
  // Add mouse interaction to pause animation
  useEffect(() => {
    const handleMouseEnter = () => {
      isAnimatingRef.current = false;
    };
    
    const handleMouseLeave = () => {
      // Only resume animation if component is initialized
      if (isInitializedRef.current) {
        isAnimatingRef.current = false; // Manteniamo l'animazione disabilitata
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);
      container.addEventListener("touchstart", handleMouseEnter);
      container.addEventListener("touchend", handleMouseLeave);
    }
    
    return () => {
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
        container.removeEventListener("touchstart", handleMouseEnter);
        container.removeEventListener("touchend", handleMouseLeave);
      }
    };
  }, []);
  
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
        <div
          key={bubble.id}
          className={`absolute rounded-full shadow-lg cursor-pointer transition-transform hover:scale-110 ${getBubbleSize(bubble.size)}`}
          style={{ 
            backgroundColor: getBubbleColor(bubble.topic),
            left: `${bubble.x ? (bubble.x - (parseInt(getBubbleSize(bubble.size).split(" ")[0].replace("w-", "")) / 2)) : 0}px`,
            top: `${bubble.y ? (bubble.y - (parseInt(getBubbleSize(bubble.size).split(" ")[1].replace("h-", "")) / 2)) : 0}px`,
            transition: 'transform 0.2s ease-in-out, left 1.5s ease-in-out, top 1.5s ease-in-out', // Transizioni ancora più lente per maggiore stabilità
          }}
          onClick={() => onBubbleClick(bubble.id)}
        >
          <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-2 text-center">
            <h3 className="text-white text-xs font-bold leading-tight mb-1 drop-shadow-md">{bubble.name}</h3>
            <p className="text-white text-[10px] leading-tight mb-1 drop-shadow-md">{bubble.topic}</p>
            
            <div className="flex items-center justify-center mb-1">
              <Star className="w-3 h-3 text-white drop-shadow-md mr-1" />
              <span className="text-white text-[10px] drop-shadow-md">{bubble.reflect_count}</span>
            </div>
            
            {bubble.expires_at && (
              <div className="flex items-center justify-center">
                <Clock className="w-3 h-3 text-white drop-shadow-md mr-1" />
                <span className="text-white text-[10px] drop-shadow-md">{formatExpiryTime(bubble.expires_at)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* Empty state */}
      {(!bubbles || bubbles.length === 0) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[#ebbd34] text-lg font-medium mb-2">No active bubbles</p>
          <p className="text-gray-600 text-sm">Your reflected and created bubbles will appear here</p>
        </div>
      )}
    </div>
  );
};

export default BubbleCircle;
