
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, TrendingUp, Sparkles, Star, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const Feed = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  // Add a loading state
  const { data: bubbles = [], isLoading } = useQuery({
    queryKey: ['bubbles', 'top-reflected'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .order('reflect_count', { ascending: false })
        .limit(20);
      
      if (error) {
        toast({
          title: "Error fetching bubbles",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }
      
      return data.map(bubble => ({
        ...bubble,
        size: bubble.reflect_count >= 10 ? "lg" : bubble.reflect_count >= 5 ? "md" : "sm"
      })) as BubbleData[];
    },
    refetchInterval: 30000 // Refetch every 30 seconds to keep the feed updated
  });

  // Animation variants for the list items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    },
    hover: { 
      scale: 1.05,
      boxShadow: "0 10px 25px rgba(235, 189, 52, 0.2)",
      transition: { 
        type: "spring", 
        stiffness: 300,
        damping: 10
      }
    }
  };

  // Subscribe to real-time updates for reflects
  useEffect(() => {
    const channel = supabase.channel('reflects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reflects' },
        (payload) => {
          // Show a toast notification when a new reflection happens
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New reflection!",
              description: "Someone just reflected a bubble"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Filter bubbles based on search query
  const filteredBubbles = searchQuery 
    ? bubbles.filter(bubble => 
        bubble.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bubble.topic.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bubbles;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
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
      
      <main className="container mx-auto px-4 pt-28 sm:pt-20 pb-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#ebbd34] mb-2">
            Most Reflected Bubbles
          </h1>
          <p className="text-[#ebbd34]/70 mb-4 max-w-md mx-auto">
            Explore the most popular bubbles with the highest number of reflections from the community
          </p>
          <div className="h-1 w-24 bg-[#ebbd34] mx-auto rounded-full"></div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-[#ebbd34]/30 border-t-[#ebbd34] rounded-full animate-spin"></div>
          </div>
        ) : filteredBubbles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-[#ebbd34]/50 text-xl mb-4">No bubbles found</div>
            {searchQuery && (
              <p className="text-[#ebbd34]/70">
                Try adjusting your search term or explore different topics
              </p>
            )}
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredBubbles.map((bubble, index) => (
              <motion.div 
                key={bubble.id}
                className="relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                variants={itemVariants}
                whileHover="hover"
                layoutId={`bubble-${bubble.id}`}
              >
                {index < 3 && (
                  <div className={`absolute top-0 right-0 m-2 p-1 px-2 text-xs text-white rounded-md font-medium ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                  }`}>
                    #{index + 1}
                  </div>
                )}
                
                <div className={`h-2 w-full ${
                  bubble.reflect_count >= 15 ? 'bg-yellow-500' : 
                  bubble.reflect_count >= 10 ? 'bg-orange-400' :
                  bubble.reflect_count >= 5 ? 'bg-amber-300' : 'bg-[#ebbd34]/30'
                }`}></div>
                
                <div className="px-6 py-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-[#ebbd34] truncate">{bubble.name}</h3>
                    <div className="flex items-center bg-[#ebbd34]/10 px-2 py-1 rounded-full">
                      <Star className="w-3.5 h-3.5 text-[#ebbd34] mr-1" />
                      <span className="text-xs font-semibold text-[#ebbd34]">{bubble.reflect_count}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-[#ebbd34]/70 mb-2 line-clamp-2">
                    {bubble.description || "Join the conversation!"}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-[#ebbd34]/60">
                    <div className="py-1 px-2 bg-[#ebbd34]/5 rounded-full">
                      {bubble.topic}
                    </div>
                    <div className="flex items-center">
                      <span>by {bubble.username}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-6 py-3 bg-[#ebbd34]/5 border-t border-[#ebbd34]/10">
                  <span className="text-xs text-[#ebbd34]/60">
                    {new Date(bubble.created_at).toLocaleDateString()}
                  </span>
                  <Link 
                    to={`/?bubble=${bubble.id}`} 
                    className="flex items-center text-xs font-medium text-[#ebbd34] hover:text-[#ebbd34]/80"
                  >
                    View Bubble <ArrowUp className="w-3 h-3 ml-1 rotate-45" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Feed;
