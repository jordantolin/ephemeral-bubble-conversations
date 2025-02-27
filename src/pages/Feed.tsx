import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Search, User, TrendingUp, Sparkles, Star, Heart, MessageCircle, ChevronUp, ChevronDown, Users } from "lucide-react";
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

  // Fetch recent messages for each bubble to show previews
  const { data: bubbleMessages = {}, isLoading: messagesLoading } = useQuery({
    queryKey: ['bubble-preview-messages'],
    queryFn: async () => {
      if (bubbles.length === 0) return {};
      
      const bubbleIds = bubbles.map(bubble => bubble.id);
      
      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .in('bubble_id', bubbleIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group messages by bubble_id
      const messagesByBubble: Record<string, any[]> = {};
      data.forEach(message => {
        if (!messagesByBubble[message.bubble_id]) {
          messagesByBubble[message.bubble_id] = [];
        }
        // Keep up to 5 most recent messages per bubble
        if (messagesByBubble[message.bubble_id].length < 5) {
          messagesByBubble[message.bubble_id].push(message);
        }
      });
      
      return messagesByBubble;
    },
    enabled: bubbles.length > 0
  });

  // Fetch participant count for each bubble
  const { data: bubbleParticipants = {} } = useQuery({
    queryKey: ['bubble-participants'],
    queryFn: async () => {
      if (bubbles.length === 0) return {};
      
      const bubbleIds = bubbles.map(bubble => bubble.id);
      
      // Get unique usernames for each bubble
      const { data, error } = await supabase
        .from('bubble_messages')
        .select('bubble_id, username')
        .in('bubble_id', bubbleIds);
      
      if (error) throw error;
      
      // Count unique usernames per bubble
      const participantsByBubble: Record<string, Set<string>> = {};
      data.forEach(message => {
        if (!participantsByBubble[message.bubble_id]) {
          participantsByBubble[message.bubble_id] = new Set();
        }
        participantsByBubble[message.bubble_id].add(message.username);
      });
      
      // Convert Sets to counts
      const countsByBubble: Record<string, number> = {};
      Object.entries(participantsByBubble).forEach(([bubbleId, participants]) => {
        countsByBubble[bubbleId] = participants.size;
      });
      
      return countsByBubble;
    },
    enabled: bubbles.length > 0
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

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format the date for the "created at" timestamp
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get a truncated preview of message content
  const getMessagePreview = (content: string) => {
    // If it's media content, return an appropriate placeholder
    if (content.startsWith('data:image/')) {
      return "[Image]";
    } else if (content.startsWith('data:video/')) {
      return "[Video]";
    } else if (content.startsWith('data:audio/')) {
      return "[Voice message]";
    }
    
    // Otherwise truncate text
    return content.length > 25 ? content.substring(0, 22) + '...' : content;
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

  // Get a random pastel color for user avatars
  const getUserColor = (username: string) => {
    // Generate a hash code from the username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate pastel colors (high lightness)
    const h = hash % 360;
    return `hsla(${h}, 70%, 80%, 0.8)`;
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
          style={{ perspective: '1200px' }}
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
                    } transition-all duration-300`}
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
                    style={{ 
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Main bubble */}
                    <div 
                      className="relative w-[320px] h-[320px] rounded-full overflow-visible"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Background gradient circle with glow */}
                      <div 
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ffda7b]/90 to-[#ebbd34]/90 shadow-xl"
                        style={{
                          boxShadow: '0 10px 30px rgba(235, 189, 52, 0.4), 0 0 80px rgba(235, 189, 52, 0.2)',
                          transform: 'translateZ(-30px)',
                        }}
                      />
                      
                      {/* Highlight effects */}
                      <div 
                        className="absolute top-2 right-4 w-40 h-40 rounded-full bg-white/20 blur-xl"
                        style={{ transform: 'translateZ(-20px)' }}
                      />
                      <div 
                        className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/10 blur-xl"
                        style={{ transform: 'translateZ(-20px)' }}
                      />
                      
                      {/* Inner bubble with content */}
                      <div 
                        className="absolute inset-[15px] rounded-full bg-white/80 backdrop-blur-md"
                        style={{
                          transformStyle: 'preserve-3d',
                          boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.6)',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Content container */}
                        <div className="absolute inset-0 flex flex-col items-center justify-between p-6 text-center">
                          {/* Top section - bubble title */}
                          <div className="w-full">
                            <h2 
                              className="text-2xl font-bold text-[#ebbd34] mb-1"
                              style={{ textShadow: '0 1px 2px rgba(235, 189, 52, 0.2)' }}
                            >
                              {filteredBubbles[currentIndex].name}
                            </h2>
                            <p className="text-sm text-[#ebbd34]/80 font-medium">
                              {filteredBubbles[currentIndex].topic}
                            </p>
                          </div>
                          
                          {/* Middle section - stats and description */}
                          <div className="flex-1 flex flex-col items-center justify-center w-full">
                            <div className="flex items-center justify-center gap-3 mb-3">
                              <div className="flex items-center bg-[#ebbd34]/10 rounded-full px-3 py-1">
                                <Star className="w-3 h-3 text-[#ebbd34] mr-1" />
                                <span className="text-xs text-[#ebbd34] font-medium">
                                  {filteredBubbles[currentIndex].reflect_count}
                                </span>
                              </div>
                              
                              <div className="flex items-center bg-[#ebbd34]/10 rounded-full px-3 py-1">
                                <Users className="w-3 h-3 text-[#ebbd34] mr-1" />
                                <span className="text-xs text-[#ebbd34] font-medium">
                                  {bubbleParticipants[filteredBubbles[currentIndex].id] || 0}
                                </span>
                              </div>
                              
                              <div className="flex items-center bg-[#ebbd34]/10 rounded-full px-3 py-1">
                                <span className="text-xs text-[#ebbd34] font-medium">
                                  {formatDate(filteredBubbles[currentIndex].created_at)}
                                </span>
                              </div>
                            </div>
                            
                            {filteredBubbles[currentIndex].description && (
                              <p className="text-[#ebbd34]/70 text-xs mb-2 max-w-[90%] line-clamp-2">
                                {filteredBubbles[currentIndex].description}
                              </p>
                            )}
                            
                            <p className="text-[#ebbd34]/60 text-xs">
                              by @{filteredBubbles[currentIndex].username.split('@')[0]}
                            </p>
                          </div>
                          
                          {/* Bottom section - chat preview */}
                          {!messagesLoading && bubbleMessages[filteredBubbles[currentIndex].id] && 
                           bubbleMessages[filteredBubbles[currentIndex].id].length > 0 ? (
                            <div className="w-full bg-[#ebbd34]/5 rounded-xl p-2 border border-[#ebbd34]/10 mt-1">
                              <h4 className="text-xs text-[#ebbd34] font-semibold mb-1 flex items-center">
                                <MessageCircle className="w-3 h-3 mr-1" /> 
                                Recent Chat
                              </h4>
                              <div className="overflow-hidden max-h-[80px]">
                                {bubbleMessages[filteredBubbles[currentIndex].id].slice(0, 3).map((message: any, idx: number) => (
                                  <div key={idx} className="flex items-start gap-1 mb-1">
                                    <div 
                                      className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[0.5rem] text-white"
                                      style={{ backgroundColor: getUserColor(message.username) }}
                                    >
                                      {message.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="flex items-center">
                                        <p className="text-[0.65rem] font-medium text-[#ebbd34]/80 mr-1">
                                          @{message.username.split('@')[0]}
                                        </p>
                                        <span className="text-[0.6rem] text-[#ebbd34]/50">
                                          {formatMessageTime(message.created_at)}
                                        </span>
                                      </div>
                                      <p className="text-[0.7rem] text-[#ebbd34]/70 line-clamp-1">
                                        {getMessagePreview(message.content)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="text-center">
                                <Link to={`/bubbles/${filteredBubbles[currentIndex].id}`} className="text-[0.7rem] text-[#ebbd34] hover:underline">
                                  View full conversation →
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full bg-[#ebbd34]/5 rounded-xl p-3 border border-[#ebbd34]/10 text-center mt-1">
                              <p className="text-xs text-[#ebbd34]/60">
                                {messagesLoading ? "Loading messages..." : "No messages yet. Be the first to chat!"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons - positioned around the circle */}
                      <div 
                        className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex items-center space-x-4"
                        style={{ zIndex: 20 }}
                      >
                        <Button 
                          onClick={() => handleReflect(filteredBubbles[currentIndex].id)}
                          className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white rounded-full px-5 py-2 shadow-lg"
                          size="sm"
                        >
                          <Heart className="w-4 h-4 mr-2" />
                          Reflect
                        </Button>
                        
                        <Link to={`/bubbles/${filteredBubbles[currentIndex].id}`}>
                          <Button 
                            className="bg-white hover:bg-white/90 text-[#ebbd34] border border-[#ebbd34]/30 rounded-full px-5 py-2 shadow-md"
                            size="sm"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Join Chat
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </main>

      {/* Add CSS to fix 3D perspective issues in different browsers */}
      <style>
        {`
          * {
            -webkit-transform-style: preserve-3d;
            transform-style: preserve-3d;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
          
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          
          .bg-glow {
            animation: pulse-glow 3s infinite ease-in-out;
          }
        `}
      </style>
    </div>
  );
};

export default Feed;
