
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, User, TrendingUp, Sparkles, Plus, Send, Image, Video, Mic, SmilePlus, LogOut, X, Volume2, Download, Clock } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BubbleData } from "@/types/bubble";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { connectionManager, createRateLimiter, createRetryHandler } from "@/utils/bubbleUtils";

interface Message {
  id: string;
  bubble_id: string;
  content: string;
  username: string;
  created_at: string;
}

// Match the actual database schema for bubbles
interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  size: 'sm' | 'md' | 'lg';
  expires_at: string;
  created_at: string;
  reflect_count: number;
  username: string; // Instead of created_by
}

// Helper function to ensure size is one of the allowed values
const validateBubbleSize = (size: string): 'sm' | 'md' | 'lg' => {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
  // Default to 'sm' if size is not valid
  return 'sm';
};

const Index = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newBubbleInfo, setNewBubbleInfo] = useState({
    name: "",
    topic: "general",
    description: "",
  });
  const [isCreatingBubble, setIsCreatingBubble] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [explodingBubbleId, setExplodingBubbleId] = useState<string | null>(null);
  
  // Create rate limiters and retry handlers
  const messageLimiter = useRef(createRateLimiter(5, 5000));
  const sendRetry = useRef(createRetryHandler(3, 1000));
  
  // Track channel subscriptions for cleanup
  const activeChannels = useRef<string[]>([]);

  useEffect(() => {
    if (bubbleToOpen) {
      setSelectedBubbleId(bubbleToOpen);
      setChatOpen(true);
    }
  }, [bubbleToOpen]);

  // Check for stored bubble ID (from profile page clicks)
  useEffect(() => {
    const storedBubbleId = localStorage.getItem('openBubbleId');
    if (storedBubbleId) {
      setSelectedBubbleId(storedBubbleId);
      setChatOpen(true);
      localStorage.removeItem('openBubbleId');
    }
  }, []);

  // Improved real-time message updates
  useEffect(() => {
    if (!selectedBubbleId) return;

    const setupMessageChannel = async () => {
      try {
        // Create a more robust channel name to avoid conflicts
        const channelName = `chat-room-${selectedBubbleId}-${Date.now()}`;
        
        const filters = [
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bubble_messages',
            filter: `bubble_id=eq.${selectedBubbleId}`
          },
          {
            event: 'DELETE',
            schema: 'public',
            table: 'bubble_messages',
            filter: `bubble_id=eq.${selectedBubbleId}`
          }
        ];
        
        await connectionManager.createChannel(
          supabase,
          channelName,
          filters,
          () => queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] })
        );
        
        // Track this channel for cleanup
        activeChannels.current.push(channelName);
      } catch (err) {
        console.error("Error setting up real-time chat subscription:", err);
        toast({
          title: "Connection Error",
          description: "Having trouble connecting to chat. Will retry automatically.",
          variant: "destructive"
        });
        
        // Try reconnecting after a delay
        setTimeout(() => {
          if (selectedBubbleId) {
            setupMessageChannel();
          }
        }, 5000);
      }
    };

    setupMessageChannel();

    return () => {
      // Clean up only the relevant channels
      const channelsToRemove = activeChannels.current.filter(
        name => name.startsWith(`chat-room-${selectedBubbleId}`)
      );
      
      channelsToRemove.forEach(async (channelName) => {
        await connectionManager.removeChannel(supabase, channelName);
        activeChannels.current = activeChannels.current.filter(name => name !== channelName);
      });
    };
  }, [selectedBubbleId, queryClient, toast]);

  // Enhanced real-time bubble updates with reconnection logic
  useEffect(() => {
    const setupBubbleChannel = async () => {
      try {
        const channelName = `bubble-updates-${Date.now()}`;
        
        const filters = [
          { event: '*', schema: 'public', table: 'reflects' },
          { event: '*', schema: 'public', table: 'bubbles' }
        ];
        
        await connectionManager.createChannel(
          supabase,
          channelName,
          filters,
          (payload) => {
            // Invalidate bubbles query
            queryClient.invalidateQueries({ queryKey: ['bubbles'] });
            
            // If the current bubble was updated, refresh its details
            if (selectedBubbleId && 
                payload.new && 
                typeof payload.new === 'object' && 
                'id' in payload.new && 
                payload.new.id === selectedBubbleId) {
              queryClient.invalidateQueries({ queryKey: ['bubble', selectedBubbleId] });
            }
          }
        );
        
        // Track this channel for cleanup
        activeChannels.current.push(channelName);
      } catch (err) {
        console.error("Error setting up bubble updates subscription:", err);
        toast({
          title: "Connection Warning",
          description: "Live updates connection lost. Reconnecting...",
          variant: "destructive"
        });
        
        // Try reconnecting after a delay
        setTimeout(setupBubbleChannel, 5000);
      }
    };

    setupBubbleChannel();
    
    // Global cleanup on unmount
    return () => {
      connectionManager.removeAllChannels(supabase);
      activeChannels.current = [];
    };
  }, [queryClient, selectedBubbleId, toast]);

  // Function to check if a bubble is expired (more than 24 hours old)
  const isBubbleExpired = (bubble: Bubble) => {
    const expiryTime = new Date(bubble.expires_at);
    const now = new Date();
    return expiryTime < now;
  };

  // Fetch all bubbles with optimized caching
  const { data: allBubbles = [], isLoading: isLoadingBubbles } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      // Get the current time minus 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .gte('expires_at', twentyFourHoursAgo.toISOString()) // Only fetch non-expired bubbles
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching bubbles:", error);
        toast({
          title: "Error fetching bubbles",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }
      
      // Ensure size is a valid type
      return data.map(bubble => ({
        ...bubble,
        size: validateBubbleSize(bubble.size)
      }));
    },
    staleTime: 10000, // Cache data for 10 seconds
    refetchInterval: 30000 // Periodically refresh every 30 seconds
  });

  // Filter out expired bubbles
  const bubbles = useMemo(() => {
    return allBubbles.filter(bubble => !isBubbleExpired(bubble));
  }, [allBubbles]);

  // Handle bubble explosion animation and removal
  useEffect(() => {
    const checkForExpiringBubbles = () => {
      bubbles.forEach(bubble => {
        const expiryTime = new Date(bubble.expires_at);
        const now = new Date();
        const timeLeft = expiryTime.getTime() - now.getTime();
        
        // If bubble is about to expire in the next minute, trigger animation
        if (timeLeft > 0 && timeLeft < 60000 && explodingBubbleId !== bubble.id) {
          setExplodingBubbleId(bubble.id);
          
          // After 5 seconds, refresh the bubble list to remove the exploded bubble
          setTimeout(() => {
            setExplodingBubbleId(null);
            queryClient.invalidateQueries({ queryKey: ['bubbles'] });
          }, 5000);
        }
      });
    };
    
    // Check for expiring bubbles every 10 seconds
    const interval = setInterval(checkForExpiringBubbles, 10000);
    
    return () => clearInterval(interval);
  }, [bubbles, explodingBubbleId, queryClient]);

  // Fetch selected bubble details with optimized caching
  const { data: selectedBubble, isLoading: isLoadingBubbleDetails } = useQuery({
    queryKey: ['bubble', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return null;
      
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .eq('id', selectedBubbleId)
        .single();
      
      if (error) {
        console.error("Error fetching bubble details:", error);
        toast({
          title: "Error fetching bubble details",
          description: error.message,
          variant: "destructive"
        });
        return null;
      }
      
      // Ensure size is a valid type
      return {
        ...data,
        size: validateBubbleSize(data.size)
      };
    },
    enabled: !!selectedBubbleId,
    staleTime: 10000 // Cache data for 10 seconds
  });

  // Close chat dialog if selected bubble is expired
  useEffect(() => {
    if (selectedBubble && isBubbleExpired(selectedBubble) && chatOpen) {
      setChatOpen(false);
      toast({
        title: "Bubble Expired",
        description: "This bubble has expired and is no longer available",
        variant: "destructive"
      });
    }
  }, [selectedBubble, chatOpen, toast]);

  // Fetch messages for selected bubble with optimized pagination
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];
      
      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .eq('bubble_id', selectedBubbleId)
        .order('created_at', { ascending: true })
        .limit(100); // Limit to last 100 messages for performance
      
      if (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error fetching messages",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }
      
      return data;
    },
    enabled: !!selectedBubbleId,
    staleTime: 5000 // Cache data for 5 seconds
  });

  // Scroll to bottom when new messages arrive (optimized)
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  
  useEffect(() => {
    if (chatOpen && messages.length > 0 && messagesEndRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [lastMessageId, chatOpen]);

  const filteredBubbles = useMemo(() => {
    if (!searchQuery.trim()) return bubbles;
    
    const query = searchQuery.toLowerCase();
    return bubbles.filter((bubble) => 
      bubble.name.toLowerCase().includes(query) || 
      bubble.topic.toLowerCase().includes(query) ||
      (bubble.description && bubble.description.toLowerCase().includes(query))
    );
  }, [bubbles, searchQuery]);

  // Enhanced message sending with debounce, rate limiting and retry
  const handleSendMessage = useCallback(async (content?: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send messages",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedBubbleId) {
      toast({
        title: "Error",
        description: "No bubble selected",
        variant: "destructive"
      });
      return;
    }
    
    // Check if the selected bubble has expired
    if (selectedBubble && isBubbleExpired(selectedBubble)) {
      toast({
        title: "Bubble Expired",
        description: "This bubble has expired and is no longer available for messages",
        variant: "destructive"
      });
      setChatOpen(false);
      return;
    }
    
    const messageContent = content || newMessage;
    if (!messageContent.trim()) return;
    
    // Check rate limiting
    if (!messageLimiter.current.canMakeRequest()) {
      const waitTime = messageLimiter.current.getWaitTime();
      toast({
        title: "Slow down",
        description: `Please wait ${Math.ceil(waitTime / 1000)} seconds before sending more messages`,
        variant: "default"
      });
      return;
    }
    
    // Start sending
    setIsSendingMessage(true);
    
    try {
      const username = profile?.username || user?.email || "";
      
      // Save message content before clearing input
      const messageToSend = messageContent;
      setNewMessage("");
      
      await sendRetry.current(async () => {
        const { error } = await supabase
          .from('bubble_messages')
          .insert({
            bubble_id: selectedBubbleId,
            content: messageToSend,
            username
          });

        if (error) {
          throw error;
        }
      });
      
    } catch (error: any) {
      console.error("Failed to send message after retries:", error);
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send your message",
        variant: "destructive"
      });
      
      // If message wasn't sent, put it back in the input
      if (content) {
        setNewMessage(content);
      }
    } finally {
      setIsSendingMessage(false);
    }
  }, [user, profile, selectedBubbleId, selectedBubble, newMessage, toast]);

  // Optimized bubble reflection with retry logic
  const handleReflect = useCallback(async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    // Find the bubble to check if it's expired
    const bubble = bubbles.find(b => b.id === bubbleId);
    
    if (bubble && isBubbleExpired(bubble)) {
      toast({
        title: "Bubble Expired",
        description: "This bubble has expired and is no longer available for reflection",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const username = profile?.username || user?.email || "";
      
      await sendRetry.current(async () => {
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
            return;
          }
          throw error;
        }

        toast({
          title: "Bubble reflected!",
          description: "This bubble will appear in your profile",
        });
      });
    } catch (error: any) {
      console.error("Error reflecting bubble:", error);
      toast({
        title: "Error reflecting bubble",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [user, profile, bubbles, toast]);

  const handleCreateBubble = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create bubbles",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsCreatingBubble(true);
      
      // Simple validation
      if (!newBubbleInfo.name.trim()) {
        toast({
          title: "Missing information",
          description: "Please provide a name for your bubble",
          variant: "destructive"
        });
        return;
      }
      
      // Set expiry date to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const username = profile?.username || user?.email || "";
      
      const { data, error } = await supabase
        .from('bubbles')
        .insert({
          name: newBubbleInfo.name,
          topic: newBubbleInfo.topic || "general",
          description: newBubbleInfo.description,
          size: 'sm' as const, // Explicitly type as 'sm'
          reflect_count: 0,
          expires_at: expiresAt.toISOString(),
          username: username
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Bubble Created!",
        description: `Your bubble "${newBubbleInfo.name}" will be active for 24 hours`
      });
      
      // Reset form and close dialog
      setNewBubbleInfo({
        name: "",
        topic: "general",
        description: ""
      });
      setNewBubbleDialog(false);
      
      // Refresh bubbles list and select the new bubble
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      
      // Open the new bubble's chat
      if (data) {
        setSelectedBubbleId(data.id);
        setChatOpen(true);
      }
    } catch (error: any) {
      console.error("Error creating bubble:", error);
      toast({
        title: "Error creating bubble",
        description: error.message || "An error occurred while creating your bubble",
        variant: "destructive"
      });
    } finally {
      setIsCreatingBubble(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const formatExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    
    // Calculate time difference in milliseconds
    const timeDiff = expiry.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return "Expired";
    }
    
    // Format remaining time
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  };

  const handleDownloadAudio = () => {
    if (!audioRef.current?.src) return;
    
    const anchor = document.createElement('a');
    anchor.href = audioRef.current.src;
    anchor.download = 'bubble-ambient.mp3';
    anchor.click();
  };

  // Map to BubbleData needed for BubbleWorld component
  const bubbleDataForComponent = useMemo(() => {
    return filteredBubbles.map((bubble): BubbleData => ({
      id: bubble.id,
      topic: bubble.topic,
      username: bubble.username,
      name: bubble.name,
      size: bubble.size, // Already validated as "sm" | "md" | "lg"
      reflect_count: bubble.reflect_count,
      created_at: bubble.created_at,
      description: bubble.description || undefined,
      expires_at: bubble.expires_at,
      isExploding: explodingBubbleId === bubble.id
    }));
  }, [filteredBubbles, explodingBubbleId]);

  // Get user initials for avatar
  const getUserInitials = (displayName?: string | null, email?: string | null) => {
    if (displayName) {
      return displayName.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'BT';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-x-hidden relative">
      <audio 
        ref={audioRef} 
        src="https://cdn.pixabay.com/download/audio/2022/01/18/audio_3611db2d6d.mp3?filename=relaxing-mountains-rivers-118571.mp3"
        loop
        preload="auto"
      />
      
      {/* Audio Controls */}
      <div className="fixed bottom-4 right-4 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10 rounded-lg shadow-sm p-3 flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleAudio}
          className="text-[#ebbd34]"
        >
          <Volume2 className={`h-4 w-4 ${!isPlaying && 'opacity-50'}`} />
        </Button>
        
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="w-20 accent-[#ebbd34]"
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownloadAudio}
          className="text-[#ebbd34]"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
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
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34]"
                    >
                      <Avatar className="h-8 w-8 border border-[#ebbd34]/20">
                        <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34]">
                          {getUserInitials(profile?.display_name, user?.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white z-[100]">
                    <DropdownMenuItem className="flex flex-col items-start p-3">
                      <span className="font-medium text-[#ebbd34]">
                        {profile?.display_name || user?.email}
                      </span>
                      <span className="text-xs text-gray-500">
                        @{profile?.username || user?.email?.split('@')[0]}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      navigate('/auth/logout');
                    }}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white ml-2"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none text-sm"
            />
          </div>
        </div>
      </nav>
      
      <div className="pt-32 pb-12 px-4 sm:px-6 relative z-0">
        {/* Bubble World and Filtering UI */}
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#ebbd34]">Bubble World</h1>
              <p className="text-[#ebbd34]/70">Explore ephemeral bubbles that last for just 24 hours</p>
            </div>
            
            <Button
              onClick={() => setNewBubbleDialog(true)}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/80 text-white"
            >
              <Plus className="mr-1 h-4 w-4" />
              New 24h Bubble
            </Button>
          </div>
          
          {isLoadingBubbles ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ebbd34] mx-auto"></div>
              <p className="mt-4 text-[#ebbd34]">Loading bubbles...</p>
            </div>
          ) : filteredBubbles.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
                <Clock className="w-8 h-8 text-[#ebbd34]" />
              </div>
              <h3 className="text-xl font-medium text-[#ebbd34]">No active bubbles found</h3>
              <p className="text-gray-500 mt-2">Bubbles only last for 24 hours. Create a new one!</p>
              <Button
                onClick={() => setNewBubbleDialog(true)}
                className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
              >
                <Plus className="mr-1 h-4 w-4" />
                Create Bubble
              </Button>
            </div>
          ) : (
            <div className="h-[60vh] w-full bg-white/10 rounded-lg p-2">
              <BubbleWorld 
                topics={bubbleDataForComponent}
                onBubbleClick={(bubbleId) => {
                  // Find bubble to check if it's expired
                  const bubble = bubbles.find(b => b.id === bubbleId);
                  
                  if (bubble && isBubbleExpired(bubble)) {
                    toast({
                      title: "Bubble Expired",
                      description: "This bubble has expired and is no longer available",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  setSelectedBubbleId(bubbleId);
                  setChatOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* New Bubble Dialog */}
      <Dialog open={newBubbleDialog} onOpenChange={setNewBubbleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#ebbd34]">Create a 24h Bubble</DialogTitle>
            <DialogDescription>
              Create a new bubble that will last for exactly 24 hours before exploding.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[#ebbd34]">Name</Label>
              <Input
                id="name"
                value={newBubbleInfo.name}
                onChange={(e) => setNewBubbleInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter bubble name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic" className="text-[#ebbd34]">Topic</Label>
              <Select
                value={newBubbleInfo.topic}
                onValueChange={(value) => setNewBubbleInfo(prev => ({ ...prev, topic: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="arts">Arts & Culture</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="health">Health & Wellness</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="food">Food & Cooking</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="movies">Movies & TV</SelectItem>
                  <SelectItem value="books">Books & Literature</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="business">Business & Finance</SelectItem>
                  <SelectItem value="philosophy">Philosophy</SelectItem>
                  <SelectItem value="politics">Politics</SelectItem>
                  <SelectItem value="news">Current Events</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-[#ebbd34]">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newBubbleInfo.description}
                onChange={(e) => setNewBubbleInfo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter a brief description"
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center rounded-md bg-[#ebbd34]/10 p-3 mt-2">
              <Clock className="h-5 w-5 text-[#ebbd34] mr-2" />
              <span className="text-sm text-[#ebbd34]">This bubble will automatically expire after 24 hours</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant={isCreatingBubble ? "loading" : "default"}
              onClick={handleCreateBubble}
              disabled={isCreatingBubble || !newBubbleInfo.name.trim()}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
            >
              {isCreatingBubble ? "Creating..." : "Create 24h Bubble"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Chat Dialog */}
      <Dialog open={chatOpen && !!selectedBubbleId} onOpenChange={(open) => {
        if (!open) setChatOpen(false);
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-[#ebbd34]">
                {isLoadingBubbleDetails ? 'Loading...' : selectedBubble?.name}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!isLoadingBubbleDetails && selectedBubble && (
              <div className="flex flex-col text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Topic: {selectedBubble.topic}</span>
                  <Badge variant="outline" className="text-[#ebbd34] border-[#ebbd34]/20">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatExpiry(selectedBubble.expires_at)}
                  </Badge>
                </div>
                <div className="flex justify-between mt-2">
                  <span>{selectedBubble.reflect_count} reflects</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReflect(selectedBubble.id)}
                    className="text-[#ebbd34] hover:bg-[#ebbd34]/10 -my-1 h-8 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Reflect
                  </Button>
                </div>
              </div>
            )}
          </DialogHeader>
          
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#ebbd34]"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No messages yet. Start the conversation!</p>
                <p className="text-xs mt-2 text-gray-400">This bubble will disappear in 24 hours</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message: Message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.username === (profile?.username || user?.email) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        message.username === (profile?.username || user?.email)
                          ? 'bg-[#ebbd34] text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-baseline gap-4">
                        <span className="font-medium text-xs">
                          {message.username === (profile?.username || user?.email) ? 'You' : message.username}
                        </span>
                        <span className="text-xs opacity-70">{formatMessageTime(message.created_at)}</span>
                      </div>
                      <p className="mt-1 break-words">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          {/* Message Input */}
          <div className="p-4 border-t mt-auto">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isSendingMessage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={() => handleSendMessage()} 
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
                disabled={isSendingMessage}
              >
                {isSendingMessage ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex mt-2 justify-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Image className="h-4 w-4 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Video className="h-4 w-4 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Mic className="h-4 w-4 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <SmilePlus className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
