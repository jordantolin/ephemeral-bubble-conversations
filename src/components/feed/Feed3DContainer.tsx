
import { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/web';
import { BubbleData } from '@/types/bubble';
import BubbleCard3D from './BubbleCard3D';
import BubbleContent from './BubbleContent';

interface Feed3DContainerProps {
  bubbles: BubbleData[];
  onBubbleClick: (id: string) => void;
}

// Camera and scene setup component
const Scene = ({ bubbles, currentIndex, onBubbleClick }: { 
  bubbles: BubbleData[]; 
  currentIndex: number;
  onBubbleClick: (id: string) => void;
}) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={60} />
      
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Render bubbles */}
      {bubbles.map((bubble, index) => (
        <BubbleCard3D
          key={bubble.id}
          bubble={bubble}
          isActive={index === currentIndex}
          index={index}
          currentIndex={currentIndex}
        />
      ))}
      
      {/* Environment mapping for reflections */}
      <Environment preset="city" />
    </>
  );
};

const Feed3DContainer = ({ bubbles, onBubbleClick }: Feed3DContainerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Animation spring for smooth transitions
  const [{ y }, api] = useSpring(() => ({ 
    y: 0,
    config: { mass: 1, tension: 280, friction: 60 }
  }));

  // Handle vertical swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };
  
  const handleTouchEnd = () => {
    const deltaY = touchStartY.current - touchEndY.current;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0 && currentIndex < bubbles.length - 1) {
        // Swipe up - go to next bubble
        navigateToIndex(currentIndex + 1);
      } else if (deltaY < 0 && currentIndex > 0) {
        // Swipe down - go to previous bubble
        navigateToIndex(currentIndex - 1);
      }
    }
  };
  
  // Handle wheel/scroll navigation
  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling.current) return;
    
    isScrolling.current = true;
    
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
    }, 500); // Debounce scrolling
    
    if (e.deltaY > 0 && currentIndex < bubbles.length - 1) {
      // Scroll down - go to next bubble
      navigateToIndex(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      // Scroll up - go to previous bubble
      navigateToIndex(currentIndex - 1);
    }
  };
  
  // Smooth navigation to specific index
  const navigateToIndex = (index: number) => {
    setCurrentIndex(index);
    api.start({ y: -index * 100 });
  };

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* 3D Canvas - Render bubbles */}
      <Canvas className="absolute inset-0 z-0">
        <Scene 
          bubbles={bubbles} 
          currentIndex={currentIndex}
          onBubbleClick={onBubbleClick}
        />
      </Canvas>
      
      {/* HTML Overlay - Interactive content */}
      <animated.div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ transform: y.to(value => `translateY(${value}vh)`) }}
      >
        {bubbles.map((bubble, index) => (
          <div 
            key={bubble.id}
            className={`h-screen w-full absolute top-0 left-0 transition-opacity duration-300 pointer-events-auto
              ${currentIndex === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ top: `${index * 100}vh` }}
            onClick={() => onBubbleClick(bubble.id)}
          >
            <BubbleContent bubble={bubble} isActive={currentIndex === index} />
          </div>
        ))}
      </animated.div>
      
      {/* Navigation indicators */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 space-y-2">
        {bubbles.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-[#ebbd34] w-3 h-3' 
                : 'bg-white/50 hover:bg-white/80'
            }`}
            onClick={() => navigateToIndex(index)}
            aria-label={`Go to bubble ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Feed3DContainer;
