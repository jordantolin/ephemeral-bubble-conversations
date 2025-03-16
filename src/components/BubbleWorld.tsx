
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Loader } from 'lucide-react';
import Bubble from './Bubble';
import { BubbleData } from '@/types/bubble';
import { Button } from '@/components/ui/button';

interface BubbleWorldProps {
  bubbles: BubbleData[];
  onBubbleClick?: (id: string) => void;
  onBubbleReflect?: (id: string) => void;
  isReconnecting?: boolean;
}

const BubbleWorld: React.FC<BubbleWorldProps> = ({ 
  bubbles = [], 
  onBubbleClick, 
  onBubbleReflect,
  isReconnecting = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Map bubble sizes to pixel values
  const bubbleSizes = useMemo(() => ({
    sm: 80,
    md: 120,
    lg: 160
  }), []);

  // Try to initialize the 3D scene
  useEffect(() => {
    setIsMounted(true);
    
    try {
      const container = containerRef.current;
      if (!container) return;
      
      // Scene setup would go here
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing BubbleWorld:', error);
      setHasError(true);
      setIsLoading(false);
    }
    
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Fallback UI for error state
  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#FEF7E4]">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">We couldn't load the bubble world properly.</p>
        <Button 
          onClick={() => window.location.reload()}
          className="bg-[#ebbd34] hover:bg-amber-500 text-white font-semibold"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#FEF7E4]">
        <div className="flex flex-col items-center">
          <Loader className="h-10 w-10 text-[#ebbd34] animate-spin mb-3" />
          <p className="text-lg font-medium text-[#333]">Loading Bubbles...</p>
        </div>
      </div>
    );
  }

  // Reconnecting indicator
  const reconnectingOverlay = isReconnecting && (
    <div className="absolute bottom-4 left-4 right-4 bg-amber-100 text-amber-800 px-4 py-2 rounded-md flex items-center z-50">
      <Loader className="h-4 w-4 animate-spin mr-2" />
      <p className="text-sm font-medium">Reconnecting to Bubble Trouble...</p>
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#FEF7E4]/70" ref={containerRef}>
      {reconnectingOverlay}
      
      <div className="absolute inset-0">
        {bubbles.map((bubble) => (
          <Bubble
            key={bubble.id}
            id={bubble.id}
            name={bubble.name}
            topic={bubble.topic}
            username={bubble.username}
            size={bubbleSizes[bubble.size]}
            reflectCount={bubble.reflect_count || 0}
            isExploding={bubble.isExploding}
            onClick={() => onBubbleClick?.(bubble.id)}
            onReflect={(e) => {
              e.stopPropagation();
              onBubbleReflect?.(bubble.id);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BubbleWorld;
