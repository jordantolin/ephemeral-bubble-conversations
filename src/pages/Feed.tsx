
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, TrendingUp, Sparkles, ArrowUp, MessageCircle, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import * as THREE from 'three';
import { createBubbleGeometry, createBubbleMaterial } from '@/utils/bubbleUtils';

const Feed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"card" | "tiktok">("tiktok");
  const { toast } = useToast();
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bubbleCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const bubbleObserver = useRef<IntersectionObserver | null>(null);
  
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

  // Filter bubbles based on search query
  const filteredBubbles = searchQuery 
    ? bubbles.filter(bubble => 
        bubble.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bubble.topic.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bubbles;

  // Initialize the 3D bubble in each card
  useEffect(() => {
    if (viewMode !== "tiktok" || !filteredBubbles.length) return;

    bubbleCanvasRefs.current = bubbleCanvasRefs.current.slice(0, filteredBubbles.length);
    
    const renderers: THREE.WebGLRenderer[] = [];
    const scenes: THREE.Scene[] = [];
    const cameras: THREE.PerspectiveCamera[] = [];
    const bubbleMeshes: THREE.Mesh[] = [];
    
    filteredBubbles.forEach((bubble, index) => {
      const canvas = bubbleCanvasRefs.current[index];
      if (!canvas) return;
      
      // Setup renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderers[index] = renderer;
      
      // Setup scene
      const scene = new THREE.Scene();
      scenes[index] = scene;
      
      // Setup camera
      const camera = new THREE.PerspectiveCamera(
        50,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 5;
      cameras[index] = camera;
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
      
      // Create bubble with size based on reflects
      const baseSize = bubble.reflect_count >= 10 ? 1.5 : 
                      bubble.reflect_count >= 5 ? 1.2 : 0.9;
      const geometry = createBubbleGeometry(baseSize);
      const material = createBubbleMaterial();
      const bubbleMesh = new THREE.Mesh(geometry, material);
      bubbleMeshes[index] = bubbleMesh;
      scene.add(bubbleMesh);
      
      // Custom color based on reflect count
      if (bubble.reflect_count >= 15) {
        (bubbleMesh.material as THREE.MeshPhysicalMaterial).color.set('#FFD700'); // Gold
      } else if (bubble.reflect_count >= 10) {
        (bubbleMesh.material as THREE.MeshPhysicalMaterial).color.set('#FFA500'); // Orange
      } else if (bubble.reflect_count >= 5) {
        (bubbleMesh.material as THREE.MeshPhysicalMaterial).color.set('#ebbd34'); // Yellow
      }
    });
    
    // Animation loop
    let animationFrameId: number;
    
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      filteredBubbles.forEach((_, index) => {
        if (!bubbleMeshes[index] || !renderers[index] || !scenes[index] || !cameras[index]) return;
        
        // Add subtle floating animation
        bubbleMeshes[index].rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
        bubbleMeshes[index].rotation.y = Math.cos(Date.now() * 0.001) * 0.2;
        
        // Render only if canvas is visible (improves performance)
        if (bubbleRefs.current[index]?.closest('.active-card')) {
          renderers[index].render(scenes[index], cameras[index]);
        }
      });
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      renderers.forEach(renderer => renderer.dispose());
    };
  }, [filteredBubbles, viewMode]);
  
  // Setup intersection observer for scroll snapping
  useEffect(() => {
    if (viewMode !== "tiktok" || !filteredBubbles.length) return;
    
    bubbleRefs.current = bubbleRefs.current.slice(0, filteredBubbles.length);
    
    // Cleanup previous observer
    if (bubbleObserver.current) {
      bubbleObserver.current.disconnect();
    }
    
    // Create new observer
    bubbleObserver.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.8) {
            const index = bubbleRefs.current.findIndex(ref => ref === entry.target);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.8
      }
    );
    
    // Observe all bubble cards
    bubbleRefs.current.forEach(ref => {
      if (ref) bubbleObserver.current?.observe(ref);
    });
    
    return () => {
      if (bubbleObserver.current) {
        bubbleObserver.current.disconnect();
      }
    };
  }, [filteredBubbles, viewMode]);

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

  // Handle manual navigation between cards
  const navigateToCard = (index: number) => {
    if (index >= 0 && index < filteredBubbles.length) {
      setActiveIndex(index);
      bubbleRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };
  
  // Open bubble detail
  const handleOpenBubble = (bubbleId: string) => {
    navigate(`/?bubble=${bubbleId}`);
  };

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
      
      <main className="container mx-auto px-0 pt-28 sm:pt-20 pb-20">
        <div className="flex items-center justify-between mb-4 px-4">
          <h1 className="text-2xl font-bold text-[#ebbd34]">
            Most Reflected Bubbles
          </h1>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setViewMode("card")} 
              className={`p-2 rounded-md ${viewMode === "card" ? "bg-[#ebbd34]/20 text-[#ebbd34]" : "text-[#ebbd34]/50"}`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode("tiktok")} 
              className={`p-2 rounded-md ${viewMode === "tiktok" ? "bg-[#ebbd34]/20 text-[#ebbd34]" : "text-[#ebbd34]/50"}`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
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
        ) : viewMode === "tiktok" ? (
          // TikTok-style scrollable fullscreen cards
          <div className="relative w-full h-[calc(100vh-140px)]">
            <ScrollArea 
              className="h-full snap-y snap-mandatory"
              style={{ 
                scrollSnapType: 'y mandatory',
                overflow: 'auto',
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {filteredBubbles.map((bubble, index) => (
                <div
                  key={bubble.id}
                  ref={el => bubbleRefs.current[index] = el}
                  className={`w-full h-full snap-start snap-always flex items-center justify-center p-4 ${
                    index === activeIndex ? 'active-card' : ''
                  }`}
                  onClick={() => handleOpenBubble(bubble.id)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: index === activeIndex ? 1 : 0.5, 
                      scale: index === activeIndex ? 1 : 0.9
                    }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full max-w-md h-[70vh] bg-gradient-to-br from-[#ebbd34]/5 to-[#ebbd34]/20 rounded-3xl overflow-hidden shadow-xl flex flex-col"
                  >
                    {/* 3D Bubble Visualization */}
                    <div className="relative w-full h-2/3 bg-gradient-to-b from-[#ebbd34]/5 to-transparent flex items-center justify-center">
                      <canvas 
                        ref={el => bubbleCanvasRefs.current[index] = el}
                        className="w-full h-full"
                      />
                      <div className="absolute top-4 right-4 bg-[#ebbd34]/10 px-3 py-1 rounded-full flex items-center">
                        <Star className="w-4 h-4 text-[#ebbd34] mr-1" />
                        <span className="text-sm font-semibold text-[#ebbd34]">{bubble.reflect_count}</span>
                      </div>
                    </div>
                    
                    {/* Bubble info */}
                    <div className="p-6 flex-1 flex flex-col justify-between relative z-10">
                      <div>
                        <h3 className="text-xl font-bold text-[#ebbd34] mb-2">{bubble.name}</h3>
                        <p className="text-[#ebbd34]/80 line-clamp-3">
                          {bubble.description || "Join the conversation about this topic!"}
                        </p>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex items-center text-sm text-[#ebbd34]/60 mb-2">
                          <span className="bg-[#ebbd34]/10 rounded-full px-3 py-1">{bubble.topic}</span>
                          <span className="ml-auto">by {bubble.username}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-[#ebbd34]/70">
                          <span>{new Date(bubble.created_at).toLocaleDateString()}</span>
                          <div className="flex space-x-4">
                            <button className="flex items-center">
                              <Heart className="w-5 h-5 mr-1" />
                              <span>{bubble.reflect_count}</span>
                            </button>
                            <button className="flex items-center">
                              <MessageCircle className="w-5 h-5 mr-1" />
                              <span>Chat</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </ScrollArea>
            
            {/* Side navigation dots */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
              {filteredBubbles.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === activeIndex ? 'bg-[#ebbd34]' : 'bg-[#ebbd34]/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToCard(index);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          // Original card grid view
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {filteredBubbles.map((bubble, index) => (
              <motion.div 
                key={bubble.id}
                className="relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                variants={{
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
                }}
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
