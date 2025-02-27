
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, TrendingUp, Sparkles, Star, Heart, MessageCircle, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const Feed = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState(0); // -1 for up, 1 for down
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const dragStartY = useRef(0);
  const dragThreshold = 100; // Pixels required to trigger a bubble change
  
  const { data: bubbles = [], isLoading } = useQuery({
    queryKey: ['bubbles', 'top-reflected'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .order('reflect_count', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return data.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    }
  });

  // Filter bubbles based on search
  const filteredBubbles = searchQuery.trim() 
    ? bubbles.filter(bubble => 
        bubble.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bubble.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bubble.description && bubble.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : bubbles;

  // Handle reflecting a bubble
  const handleReflect = async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to reflect bubbles",
        variant: "destructive"
      });
      return;
    }

    const username = profile?.username || user?.email || "";
    
    const { error } = await supabase
      .from('reflects')
      .insert({ 
        bubble_id: bubbleId,
        username
      });

    if (error) {
      if (error.code === '23505') { // Unique violation
        toast({
          title: "Already reflected",
          description: "You have already reflected this bubble",
        });
      } else {
        toast({
          title: "Error reflecting bubble",
          description: error.message,
          variant: "destructive"
        });
      }
      return;
    }

    toast({
      title: "Bubble reflected!",
      description: "This bubble will appear in your profile",
    });
  };

  // Navigate to the next bubble (scroll down)
  const navigateNext = () => {
    if (isTransitioning || filteredBubbles.length === 0) return;
    
    setIsTransitioning(true);
    setDirection(1);
    
    setTimeout(() => {
      setCurrentIndex(prev => (prev < filteredBubbles.length - 1 ? prev + 1 : 0));
      setIsTransitioning(false);
    }, 300);
  };

  // Navigate to the previous bubble (scroll up)
  const navigatePrev = () => {
    if (isTransitioning || filteredBubbles.length === 0) return;
    
    setIsTransitioning(true);
    setDirection(-1);
    
    setTimeout(() => {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : filteredBubbles.length - 1));
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
  }, [filteredBubbles.length, isTransitioning]);
  
  // Transition variants for Framer Motion
  const bubbleVariants = {
    enter: (direction: number) => ({
      y: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1], // Custom cubic bezier for springy feel
      }
    },
    exit: (direction: number) => ({
      y: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.4,
        ease: [0.43, 0.13, 0.23, 0.96], // Custom cubic bezier for smooth exit
      }
    })
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold text-[#ebbd34] hidden sm:inline">
                  Bubble Trouble
                </span>
              </Link>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search bubbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <Link 
                to="/profile" 
                className="p-2 hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34] transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
            />
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-[#ebbd34] mb-2">
            Top Bubbles
          </h1>
          <div className="h-px w-24 bg-[#ebbd34]/20 mx-auto" />
        </div>

        {/* TikTok-Style Vertical Scrolling Bubbles Container */}
        <div 
          ref={containerRef}
          className="h-[calc(100vh-220px)] sm:h-[550px] w-full max-w-xl mx-auto relative overflow-hidden touch-none"
        >
          {isLoading ? (
            <div className="h-full w-full flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-[#ebbd34]/10 border-t-[#ebbd34] rounded-full animate-spin"></div>
              <p className="text-[#ebbd34] mt-4">Loading bubbles...</p>
            </div>
          ) : filteredBubbles.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6">
              <img 
                src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                alt="No results" 
                className="w-16 h-16 opacity-40 mb-4"
              />
              <h3 className="text-xl font-semibold text-[#ebbd34] mb-2">No bubbles found</h3>
              <p className="text-[#ebbd34]/70 max-w-sm">
                {searchQuery 
                  ? `No bubbles match your search "${searchQuery}". Try a different search!` 
                  : "There are no bubbles to display right now. Check back later!"}
              </p>
            </div>
          ) : (
            <>
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
                {filteredBubbles.map((_, index) => (
                  <div 
                    key={index}
                    className={`h-1.5 w-1.5 rounded-full ${
                      index === currentIndex ? 'bg-[#ebbd34] w-2 h-2' : 'bg-[#ebbd34]/30'
                    }`}
                  />
                ))}
              </div>

              {/* Bubble content with smooth transitions */}
              <AnimatePresence initial={false} custom={direction}>
                {filteredBubbles.length > 0 && (
                  <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={bubbleVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="relative w-full max-w-sm aspect-[3/4] bg-gradient-to-br from-[#ffda7b] to-[#ebbd34] rounded-3xl overflow-hidden shadow-xl">
                      {/* Bubble content */}
                      <div className="absolute inset-0 p-6 flex flex-col">
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                          <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-sm">
                            {filteredBubbles[currentIndex].name}
                          </h2>
                          <p className="text-lg text-white/90 mb-4">
                            {filteredBubbles[currentIndex].topic}
                          </p>
                          {filteredBubbles[currentIndex].description && (
                            <p className="text-white/80 text-sm max-w-xs">
                              {filteredBubbles[currentIndex].description}
                            </p>
                          )}
                          
                          <div className="mt-6 flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2">
                            <Star className="w-5 h-5 text-white mr-2" />
                            <span className="text-white font-medium">
                              {filteredBubbles[currentIndex].reflect_count} reflects
                            </span>
                          </div>
                          
                          <p className="mt-4 text-white/70 text-sm">
                            by @{filteredBubbles[currentIndex].username.split('@')[0]}
                          </p>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center justify-center gap-4 mt-4">
                          <Button 
                            onClick={() => handleReflect(filteredBubbles[currentIndex].id)}
                            className="bg-white hover:bg-white/90 text-[#ebbd34] rounded-full px-6 py-2 font-medium shadow-md"
                          >
                            <Heart className="w-5 h-5 mr-2" />
                            Reflect
                          </Button>
                          
                          <Link to={`/bubbles/${filteredBubbles[currentIndex].id}`}>
                            <Button 
                              className="bg-white/20 hover:bg-white/30 text-white rounded-full px-6 py-2 font-medium backdrop-blur-sm"
                            >
                              <MessageCircle className="w-5 h-5 mr-2" />
                              Chat
                            </Button>
                          </Link>
                        </div>
                        
                        {/* Bubble decoration effects */}
                        <div className="absolute top-[10%] right-[10%] w-20 h-20 rounded-full bg-white/10 blur-md" />
                        <div className="absolute bottom-[15%] left-[5%] w-12 h-12 rounded-full bg-white/10 blur-md" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Feed;
