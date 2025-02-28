import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, User, TrendingUp, Sparkles, Plus, Send, Image, Video, Mic, SmilePlus, LogOut, X, Clock } from "lucide-react";
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
  const [explodingBubbleId, setExplodingBubbleId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Create rate limiters and retry handlers
  const messageLimiter = useRef(createRateLimiter(5, 5000));
  const sendRetry = useRef(createRetryHandler(3, 1000));
  
  // Track channel subscriptions for cleanup
  const activeChannels = useRef<string[]>([]);

  // Check URL params for bubble to open
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

  // Handle online/offline status for better user experience
  useEffect(() => {
    const handleOnline = () => {
      // Refresh data when coming back online
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      if (selectedBubbleId) {
        queryClient.invalidateQueries({ queryKey: ['bubble', selectedBubbleId] });
        queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
      }
      
      // Show toast notification
      toast({
        title: "You're back online!",
        description: "Reconnected to Bubble Trouble",
        variant: "default"
      });
      
      setIsReconnecting(false);
    };
    
    const handleOffline = () => {
      toast({
        title: "You're offline",
        description: "Waiting for connection to resume",
        variant: "destructive"
      });
      
      setIsReconnecting(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, selectedBubbleId, toast]);

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
        setIsReconnecting(false);
      } catch (err) {
        console.error("Error setting up real-time chat subscription:", err);
        setIsReconnecting(true);
        
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
        setIsReconnecting(false);
      } catch (err) {
        console.error("Error setting up bubble updates subscription:", err);
        setIsReconnecting(true);
        
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
  const isBubbleExpired = useCallback((bubble: Bubble) => {
    if (!bubble || !bubble.expires_at) return true;
    
    try {
      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      return expiryTime < now;
    } catch (error) {
      console.error("Error checking bubble expiry:", error);
      return true; // Consider expired on error to prevent issues
    }
  }, []);

  // Fetch all bubbles with optimized caching
  const { data: allBubbles = [], isLoading: isLoadingBubbles, error: bubblesError } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      try {
        // Get the current time minus 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .gte('expires_at', twentyFourHoursAgo.toISOString()) // Only fetch non-expired bubbles
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn("Unexpected data format from bubbles query:", data);
          return [];
        }
        
        // Ensure size is a valid type
        return data.map(bubble => ({
          ...bubble,
          size: validateBubbleSize(bubble.size)
        }));
      } catch (error) {
        console.error("Error fetching bubbles:", error);
        toast({
          title: "Error fetching bubbles",
          description: "Please check your connection and try again",
          variant: "destructive"
        });
        return [];
      }
    },
    staleTime: 10000, // Cache data for 10 seconds
    refetchInterval: 30000, // Periodically refresh every 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Filter out expired bubbles
  const bubbles = useMemo(() => {
    if (!allBubbles || !Array.isArray(allBubbles)) return [];
    return allBubbles.filter(bubble => !isBubbleExpired(bubble));
  }, [allBubbles, isBubbleExpired]);

  // Handle bubble explosion animation and removal
  useEffect(() => {
    const checkForExpiringBubbles = () => {
      bubbles.forEach(bubble => {
        if (!bubble || !bubble.expires_at) return;
        
        try {
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
        } catch (error) {
          console.error("Error calculating bubble expiry:", error);
        }
      });
    };
    
    // Check for expiring bubbles every 10 seconds
    const interval = setInterval(checkForExpiringBubbles, 10000);
    
    return () => clearInterval(interval);
  }, [bubbles, explodingBubbleId, queryClient]);

  // Fetch selected bubble details with optimized caching
  const { data: selectedBubble, isLoading: isLoadingBubbleDetails, error: bubbleDetailsError } = useQuery({
    queryKey: ['bubble', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return null;
      
      try {
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .eq('id', selectedBubbleId)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          return null;
        }
        
        // Ensure size is a valid type
        return {
          ...data,
          size: validateBubbleSize(data.size)
        };
      } catch (error) {
        console.error("Error fetching bubble details:", error);
        toast({
          title: "Error fetching bubble details",
          description: "Please check your connection and try again",
          variant: "destructive"
        });
        return null;
      }
    },
    enabled: !!selectedBubbleId,
    staleTime: 10000, // Cache data for 10 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
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
  }, [selectedBubble, chatOpen, toast, isBubbleExpired]);

  // Fetch messages for selected bubble with optimized pagination
  const { data: messages = [], isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ['messages', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];
      
      try {
        const { data, error } = await supabase
          .from('bubble_messages')
          .select('*')
          .eq('bubble_id', selectedBubbleId)
          .order('created_at', { ascending: true })
          .limit(100); // Limit to last 100 messages for performance
        
        if (error) {
          throw error;
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn("Unexpected data format from messages query:", data);
          return [];
        }
        
        return data;
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error fetching messages",
          description: "Please check your connection and try again",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!selectedBubbleId && chatOpen,
    staleTime: 5000, // Cache data for 5 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
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
    if (!bubbles || !Array.isArray(bubbles)) return [];
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
      } else {
        setNewMessage(messageContent);
      }
    } finally {
      setIsSendingMessage(false);
    }
  }, [user, profile, selectedBubbleId, selectedBubble, newMessage, toast, isBubbleExpired]);

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
    
    if (!bubble || (bubble && isBubbleExpired(bubble))) {
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
  }, [user, profile, bubbles, toast, isBubbleExpired]);

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
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch (error) {
      console.error("Error formatting message time:", error);
      return "Unknown time";
    }
  };

  const formatExpiry = (expiryDate: string) => {
    try {
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
    } catch (error) {
      console.error("Error formatting expiry time:", error);
      return "Time unknown";
    }
  };

  // Map to BubbleData needed for BubbleWorld component
  const bubbleDataForComponent = useMemo(() => {
    if (!filteredBubbles || !Array.isArray(filteredBubbles)) return [];
    
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
    try {
      if (displayName) {
        return displayName.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
      }
      if (email) {
        return email.substring(0, 2).toUpperCase();
      }
    } catch (error) {
      console.error("Error generating user initials:", error);
    }
    return 'BT';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-x-hidden relative">
      {/* Reconnection indicator */}
      {isReconnecting && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center">
          <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-md shadow-md flex items-center">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse mr-2"></div>
            <span>Reconnecting to Bubble Trouble...</span>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#ebbd34]/10 shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-9 h-9"
                />
                <span className="text-xl font-bold text-[#ebbd34] hidden sm:inline">
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
            <div className="flex items-center gap-2">
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
                      <Avatar className="h-9 w-9 border-2 border-[#ebbd34]/20">
                        <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34] font-bold">
                          {getUserInitials(profile?.display_name, user?.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white z-[100] shadow-lg rounded-lg border border-[#ebbd34]/10">
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
      
      <div className="pt-28 pb-16 px-4 sm:px-6 relative z-10">
        {/* Bubble World and Filtering UI */}
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-[#ebbd34] tracking-tight mb-2">
                Bubble World
              </h1>
              <p className="text-[#ebbd34]/80 text-lg max-w-xl">
                Explore ephemeral bubbles that last for just 24 hours. Join conversations and reflect on ideas before they disappear!
              </p>
            </div>
            
            <Button
              onClick={() => setNewBubbleDialog(true)}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/80 text-white shadow-md transform hover:scale-105 transition-all duration-200"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New 24h Bubble
            </Button>
          </div>
          
          {isLoadingBubbles ? (
            <div className="text-center py-24 bg-white/30 rounded-xl backdrop-blur-sm shadow-sm">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-4 border-[#ebbd34] mx-auto"></div>
              <p className="mt-6 text-[#ebbd34] text-xl font-medium">Loading bubbles...</p>
              <p className="text-[#ebbd34]/60 mt-2">Please wait while we gather the latest conversations</p>
            </div>
          ) : bubblesError ? (
            <div className="text-center py-24 px-4 bg-white/60 rounded-xl backdrop-blur-sm shadow-sm">
              <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-red-100">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-medium text-gray-800 mb-2">Error Loading Bubbles</h3>
              <p className="text-gray-600 mt-2 max-w-md mx-auto mb-6">
                There was a problem loading the bubbles. Please check your connection and try again.
              </p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['bubbles'] })}
                variant="outline"
                size="lg"
                className="border-[#ebbd34]/30 text-[#ebbd34] hover:bg-[#ebbd34]/10"
              >
                Retry
              </Button>
            </div>
          ) : filteredBubbles.length === 0 ? (
            <div className="text-center py-24 bg-white/40 rounded-xl backdrop-blur-sm shadow-sm">
              <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-[#ebbd34]/10">
                <Clock className="w-10 h-10 text-[#ebbd34]" />
              </div>
              <h3 className="text-2xl font-medium text-[#ebbd34] mb-3">No active bubbles found</h3>
              <p className="text-gray-600 max-w-md mx-auto mt-2 mb-8">
                Bubbles only last for 24 hours. Start a conversation by creating a new bubble!
              </p>
              <Button
                onClick={() => setNewBubbleDialog(true)}
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-md px-8 py-6 text-lg"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Bubble
              </Button>
            </div>
          ) : (
            <div className="h-[75vh] min-h-[500px] w-full bg-white/30 rounded-2xl backdrop-blur-sm p-3 shadow-lg border border-[#ebbd34]/10">
              <BubbleWorld 
                topics={bubbleDataForComponent}
                onBubbleClick={(bubbleId) => {
                  // Find bubble to check if it's expired
                  const bubble = bubbles.find(b => b.id === bubbleId);
                  
                  if (!bubble || (bubble && isBubbleExpired(bubble))) {
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
        <DialogContent className="sm:max-w-[500px] rounded-lg p-6 bg-white/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#ebbd34] font-bold">Create a 24h Bubble</DialogTitle>
            <DialogDescription className="text-base">
              Create a new bubble that will last for exactly 24 hours before exploding.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[#ebbd34] font-medium">Name</Label>
              <Input
                id="name"
                value={newBubbleInfo.name}
                onChange={(e) => setNewBubbleInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter bubble name"
                maxLength={50}
                className="bg-white/80 h-11 text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic" className="text-[#ebbd34] font-medium">Topic</Label>
              <Select
                value={newBubbleInfo.topic}
                onValueChange={(value) => setNewBubbleInfo(prev => ({ ...prev, topic: value }))}
              >
                <SelectTrigger id="topic" className="bg-white/80 h-11 text-base">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
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
              <Label htmlFor="description" className="text-[#ebbd34] font-medium">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newBubbleInfo.description}
                onChange={(e) => setNewBubbleInfo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter a brief description"
                className="resize-none bg-white/80 text-base"
                rows={4}
                maxLength={200}
              />
            </div>
            <div className="flex items-center rounded-lg bg-[#ebbd34]/10 p-4 mt-2">
              <Clock className="h-6 w-6 text-[#ebbd34] mr-3 flex-shrink-0" />
              <span className="text-sm text-[#ebbd34]">
                This bubble will automatically expire after 24 hours. Join conversations and reflect on ideas before they disappear!
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant={isCreatingBubble ? "outline" : "default"}
              onClick={handleCreateBubble}
              disabled={isCreatingBubble || !newBubbleInfo.name.trim()}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white w-full sm:w-auto py-6 text-base"
              size="lg"
            >
              {isCreatingBubble ? (
                <>
                  <span className="mr-2">Creating...</span>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </>
              ) : "Create 24h Bubble"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Chat Dialog */}
      <Dialog open={chatOpen && !!selectedBubbleId} onOpenChange={(open) => {
        if (!open) setChatOpen(false);
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col overflow-hidden rounded-lg p-0 bg-white/95 backdrop-blur-md">
          <DialogHeader className="border-b pb-3 px-4 pt-4">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl text-[#ebbd34] font-bold">
                {isLoadingBubbleDetails ? 'Loading...' : selectedBubble?.name}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {!isLoadingBubbleDetails && selectedBubble && (
              <div className="flex flex-col text-sm mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#ebbd34]/80 font-medium">Topic: {selectedBubble.topic}</span>
                  <Badge variant="outline" className="text-[#ebbd34] border-[#ebbd34]/20 font-medium">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatExpiry(selectedBubble.expires_at)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-[#ebbd34]/70 flex items-center">
                    <Sparkles className="h-4 w-4 mr-1" />
                    {selectedBubble.reflect_count} reflects
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReflect(selectedBubble.id)}
                    className="text-[#ebbd34] hover:bg-[#ebbd34]/10 h-8 text-xs px-3"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Reflect
                  </Button>
                </div>
                {selectedBubble.description && (
                  <div className="mt-3 p-3 bg-[#ebbd34]/5 rounded-md text-sm text-gray-700">
                    {selectedBubble.description}
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
          
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 max-h-[50vh]">
            {isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-2 border-[#ebbd34]"></div>
              </div>
            ) : messagesError ? (
              <div className="text-center py-8 text-gray-500">
                <X className="h-10 w-10 mx-auto mb-3 text-red-400" />
                <p className="mb-3">There was an error loading messages.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] })}
                  className="border-[#ebbd34]/30 text-[#ebbd34] hover:bg-[#ebbd34]/10"
                >
                  Retry
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-[#ebbd34]/30" />
                <p className="text-lg font-medium text-[#ebbd34]/60 mb-2">No messages yet</p>
                <p className="text-gray-500">Start the conversation! This bubble will disappear in 24 hours.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message: Message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.username === (profile?.username || user?.email) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`rounded-lg px-4 py-3 max-w-[85%] break-words shadow-sm ${
                        message.username === (profile?.username || user?.email)
                          ? 'bg-[#ebbd34] text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-baseline gap-4 mb-1">
                        <span className="font-medium text-xs">
                          {message.username === (profile?.username || user?.email) ? 'You' : message.username}
                        </span>
                        <span className="text-xs opacity-70">{formatMessageTime(message.created_at)}</span>
                      </div>
                      <p className="break-words">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          {/* Message Input */}
          <div className="p-4 border-t mt-auto bg-white/80">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isSendingMessage}
                maxLength={500}
                className="bg-white h-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={() => handleSendMessage()} 
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90 h-11 px-5"
                disabled={isSendingMessage || !newMessage.trim()}
              >
                {isSendingMessage ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="flex mt-3 justify-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/10">
                <Image className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/10">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/10">
                <Mic className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/10">
                <SmilePlus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
