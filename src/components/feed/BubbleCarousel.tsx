
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
  const [showHelp, setShowHelp] = useState(true);
  const [startTouch, setStartTouch] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragThreshold = 80; // Pixels required to trigger a bubble change
  
  // Hide help message after 5 seconds
  useEffect(() => {
    if (showHelp) {
      const timer = setTimeout(() => {
        setShowHelp(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showHelp]);
  
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
      setStartTouch({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent page scrolling
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const diffX = endX - startTouch.x;
      const diffY = endY - startTouch.y;
      
      // Only respond to vertical swipes
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > dragThreshold) {
        if (diffY > 0) {
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
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
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
  }, [bubbles.length, isTransitioning, startTouch]);

  // More subtle transition variants
  const bubbleVariants = {
    enter: (direction: number) => ({
      y: direction > 0 ? '40%' : '-40%',
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      }
    },
    exit: (direction: number) => ({
      y: direction > 0 ? '-40%' : '40%',
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.3,
        ease: 'easeIn',
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
    >
      {/* Help overlay - shown only initially */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="flex flex-col items-center"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ChevronUp className="w-8 h-8 text-white animate-bounce" />
              <p className="text-lg font-medium mb-12">Swipe up or down</p>
              <ChevronDown className="w-8 h-8 text-white animate-bounce" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle swipe indicators */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 opacity-50 hover:opacity-80 transition-opacity">
        <ChevronUp className="w-5 h-5 text-[#ebbd34]" />
      </div>
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 opacity-50 hover:opacity-80 transition-opacity">
        <ChevronDown className="w-5 h-5 text-[#ebbd34]" />
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
