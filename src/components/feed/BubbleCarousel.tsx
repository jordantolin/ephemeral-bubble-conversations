
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import BubbleCard from './BubbleCard';
import { BubbleData } from '@/types/bubble';

interface BubbleCarouselProps {
  bubbles: BubbleData[];
  isLoading: boolean;
  bubbleMessages: Record<string, any[]>;
  bubbleParticipants: Record<string, number>;
  messagesLoading: boolean;
  handleReflect: (bubbleId: string, event: React.MouseEvent) => void;
  formatDate: (timestamp: string) => string;
  getUserColor: (username: string) => string;
  formatMessageTime: (timestamp: string) => string;
  getMessagePreview: (content: string) => string;
  isBubbleExpired: (bubble: BubbleData) => boolean;
}

const BubbleCarousel: React.FC<BubbleCarouselProps> = ({
  bubbles,
  isLoading,
  bubbleMessages,
  bubbleParticipants,
  messagesLoading,
  handleReflect,
  formatDate,
  getUserColor,
  formatMessageTime,
  getMessagePreview,
  isBubbleExpired
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState(0); // -1 for up, 1 for down
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragThreshold = 100; // Pixels required to trigger a bubble change
  
  // Navigate to the next bubble (scroll down)
  const navigateNext = () => {
    if (isTransitioning || bubbles.length === 0) return;
    
    setIsTransitioning(true);
    setDirection(1);
    
    setTimeout(() => {
      setCurrentIndex(prev => (prev < bubbles.length - 1 ? prev + 1 : 0));
      setIsTransitioning(false);
    }, 300);
  };

  // Navigate to the previous bubble (scroll up)
  const navigatePrev = () => {
    if (isTransitioning || bubbles.length === 0) return;
    
    setIsTransitioning(true);
    setDirection(-1);
    
    setTimeout(() => {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : bubbles.length - 1));
      setIsTransitioning(false);
    }, 300);
  };

  // Handle touch interactions for swiping
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleTouchStart = (e: TouchEvent) => {
      dragStartY.current = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent page scrolling
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const dragEndY = e.changedTouches[0].clientY;
      const dragDiff = dragEndY - dragStartY.current;
      
      if (Math.abs(dragDiff) > dragThreshold) {
        if (dragDiff > 0) {
          // Swiped down
          navigatePrev();
        } else {
          // Swiped up
          navigateNext();
        }
      }
    };
    
    // Handle wheel events for desktop scrolling
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Debounce wheel events to prevent rapid firing
      if (isTransitioning) return;
      
      if (e.deltaY > 0) {
        navigateNext();
      } else {
        navigatePrev();
      }
    };
    
    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateNext();
      }
    };
    
    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bubbles.length, isTransitioning]);

  // Transition variants for Framer Motion
  const bubbleVariants = {
    enter: (direction: number) => ({
      y: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.8,
      rotateY: direction > 0 ? -20 : 20,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
      transition: {
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1], // Custom cubic bezier for springy feel
      }
    },
    exit: (direction: number) => ({
      y: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.8,
      rotateY: direction > 0 ? 20 : -20,
      transition: {
        duration: 0.4,
        ease: [0.43, 0.13, 0.23, 0.96], // Custom cubic bezier for smooth exit
      }
    })
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#ebbd34]/10 border-t-[#ebbd34] rounded-full animate-spin"></div>
        <p className="text-[#ebbd34] mt-4">Loading bubbles...</p>
      </div>
    );
  }

  if (bubbles.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6">
        <img 
          src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
          alt="No results" 
          className="w-16 h-16 opacity-40 mb-4"
        />
        <h3 className="text-xl font-semibold text-[#ebbd34] mb-2">No bubbles found</h3>
        <p className="text-[#ebbd34]/70 max-w-sm">
          There are no bubbles to display right now. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[calc(100vh-220px)] sm:h-[550px] w-full max-w-xl mx-auto relative overflow-hidden touch-none bg-[#FEF7E4]"
      style={{ perspective: '1200px' }}
    >
      {/* Swipe indicators */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center opacity-70">
        <ChevronUp className="w-6 h-6 text-[#ebbd34] animate-bounce" />
        <span className="text-xs text-[#ebbd34]/80">Swipe</span>
      </div>
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center opacity-70">
        <span className="text-xs text-[#ebbd34]/80">Swipe</span>
        <ChevronDown className="w-6 h-6 text-[#ebbd34] animate-bounce" />
      </div>

      {/* Bubble pagination indicator */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 flex flex-col items-center space-y-1">
        {bubbles.map((_, index) => (
          <div 
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${
              index === currentIndex ? 'bg-[#ebbd34] w-2 h-2' : 'bg-[#ebbd34]/30'
            } transition-all duration-300`}
          />
        ))}
      </div>

      {/* Bubble content with smooth transitions */}
      <AnimatePresence initial={false} custom={direction}>
        {bubbles.length > 0 && (
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={bubbleVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 flex items-center justify-center"
            style={{ 
              transformStyle: 'preserve-3d',
            }}
          >
            <BubbleCard
              bubble={bubbles[currentIndex]}
              handleReflect={handleReflect}
              formatDate={formatDate}
              getUserColor={getUserColor}
              formatMessageTime={formatMessageTime}
              getMessagePreview={getMessagePreview}
              isBubbleExpired={isBubbleExpired}
              bubbleMessages={bubbleMessages}
              bubbleParticipants={bubbleParticipants}
              messagesLoading={messagesLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BubbleCarousel;
