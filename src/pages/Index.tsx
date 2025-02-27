
import { useState, useEffect, useRef, useMemo } from "react";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, User, TrendingUp, Sparkles, Plus, Send, Image, Video, Mic, SmilePlus, LogOut, X, Volume2, Download, Bell } from "lucide-react";
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
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

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

  // Enhanced real-time message updates with better error handling
  useEffect(() => {
    if (!selectedBubbleId) return;

    let channelSubscription: any;

    try {
      // Create a more robust channel name to avoid conflicts
      const channelName = `chat-room-${selectedBubbleId}`;
      
      const channel = supabase.channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bubble_messages',
            filter: `bubble_id=eq.${selectedBubbleId}`
          },
          (payload) => {
            console.log("New message received:", payload);
            queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'bubble_messages',
            filter: `bubble_id=eq.${selectedBubbleId}`
          },
          (payload) => {
            console.log("Message deleted:", payload);
            queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
          }
        )
        .subscribe((status) => {
          console.log(`Channel ${channelName} status:`, status);
          if (status === 'SUBSCRIBED') {
            console.log(`Successfully subscribed to chat room ${selectedBubbleId}`);
          } else {
            console.warn(`Channel subscription status: ${status}`);
          }
        });

      channelSubscription = channel;
    } catch (err) {
      console.error("Error setting up real-time chat subscription:", err);
      toast({
        title: "Connection Error",
        description: "Having trouble connecting to chat. Please try again.",
        variant: "destructive"
      });
    }

    return () => {
      try {
        if (channelSubscription) {
          console.log("Cleaning up chat subscription");
          supabase.removeChannel(channelSubscription);
        }
      } catch (err) {
        console.error("Error cleaning up chat subscription:", err);
      }
    };
  }, [selectedBubbleId, queryClient, toast]);

  // Enhanced real-time bubble updates
  useEffect(() => {
    let channelSubscription: any;
    
    try {
      const channel = supabase.channel('bubble-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reflects' },
          (payload) => {
            console.log("Reflect change detected:", payload);
            queryClient.invalidateQueries({ queryKey: ['bubbles'] });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bubbles' },
          (payload) => {
            console.log("Bubble change detected:", payload);
            queryClient.invalidateQueries({ queryKey: ['bubbles'] });
            // If the current bubble was updated, refresh its details
            if (selectedBubbleId && payload.new && typeof payload.new === 'object' && 'id' in payload.new && payload.new.id === selectedBubbleId) {
              queryClient.invalidateQueries({ queryKey: ['bubble', selectedBubbleId] });
            }
          }
        )
        .subscribe((status) => {
          console.log("Bubble updates channel status:", status);
          if (status !== 'SUBSCRIBED') {
            console.warn("Bubble updates channel status:", status);
          }
        });

      channelSubscription = channel;
    } catch (err) {
      console.error("Error setting up bubble updates subscription:", err);
      toast({
        title: "Connection Error",
        description: "Having trouble connecting to live updates. Please refresh the page.",
        variant: "destructive"
      });
    }

    return () => {
      try {
        if (channelSubscription) {
          console.log("Cleaning up bubble updates subscription");
          supabase.removeChannel(channelSubscription);
        }
      } catch (err) {
        console.error("Error cleaning up bubble updates subscription:", err);
      }
    };
  }, [queryClient, selectedBubbleId, toast]);

  // Fetch all bubbles
  const { data: bubbles = [], isLoading: isLoadingBubbles } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
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
      
      return data;
    }
  });

  // Fetch selected bubble details
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
      
      return data;
    },
    enabled: !!selectedBubbleId
  });

  // Fetch messages for selected bubble
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];
      
      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .eq('bubble_id', selectedBubbleId)
        .order('created_at', { ascending: true });
      
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
    enabled: !!selectedBubbleId
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatOpen && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  const filteredBubbles = useMemo(() => {
    if (!searchQuery.trim()) return bubbles;
    
    const query = searchQuery.toLowerCase();
    return bubbles.filter((bubble) => 
      bubble.name.toLowerCase().includes(query) || 
      bubble.topic.toLowerCase().includes(query) ||
      (bubble.description && bubble.description.toLowerCase().includes(query))
    );
  }, [bubbles, searchQuery]);

  // Enhanced message sending with retry logic
  const handleSendMessage = async (content?: string) => {
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
    
    const messageContent = content || newMessage;
    if (!messageContent.trim()) return;

    const maxRetries = 3;
    let retryCount = 0;

    const sendMessageWithRetry = async (): Promise<boolean> => {
      try {
        const username = profile?.username || user?.email || "";
        
        const { error } = await supabase
          .from('bubble_messages')
          .insert({
            bubble_id: selectedBubbleId,
            content: messageContent,
            username
          });

        if (error) {
          throw error;
        }

        return true;
      } catch (error: any) {
        console.error(`Send message attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          return sendMessageWithRetry();
        }
        
        toast({
          title: "Error sending message",
          description: error.message || "Failed to send your message",
          variant: "destructive"
        });
        return false;
      }
    };

    const success = await sendMessageWithRetry();
    if (success) {
      setNewMessage("");
    }
  };

  // Enhanced bubble reflection with retry logic
  const handleReflect = async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    const maxRetries = 3;
    let retryCount = 0;

    const reflectWithRetry = async (): Promise<boolean> => {
      try {
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
            return true; // Not a failure case
          }
          throw error;
        }

        toast({
          title: "Bubble reflected!",
          description: "This bubble will appear in your profile",
        });
        
        return true;
      } catch (error: any) {
        console.error(`Reflect attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          return reflectWithRetry();
        }
        
        toast({
          title: "Error reflecting bubble",
          description: "Please try again later",
          variant: "destructive"
        });
        return false;
      }
    };

    await reflectWithRetry();
  };

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
      
      // Calculate expiry date (default: 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const username = profile?.username || user?.email || "";
      
      const { data, error } = await supabase
        .from('bubbles')
        .insert({
          name: newBubbleInfo.name,
          topic: newBubbleInfo.topic || "general",
          description: newBubbleInfo.description,
          size: 'sm',
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
        description: `Your bubble "${newBubbleInfo.name}" has been created`
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
    const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "Expired";
    } else if (diffDays === 0) {
      return "Expires today";
    } else if (diffDays === 1) {
      return "Expires tomorrow";
    } else {
      return `Expires in ${diffDays} days`;
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
      size: bubble.size as "sm" | "md" | "lg",
      reflect_count: bubble.reflect_count,
      created_at: bubble.created_at,
      description: bubble.description || undefined,
      expires_at: bubble.expires_at
    }));
  }, [filteredBubbles]);

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

  // Get topic color class
  const getTopicColorClass = (topic: string) => {
    const topicColors: Record<string, string> = {
      general: "bg-slate-500",
      tech: "bg-blue-500",
      science: "bg-green-500",
      arts: "bg-purple-500",
      social: "bg-pink-500",
      health: "bg-teal-500",
      education: "bg-indigo-500",
      gaming: "bg-red-500",
      sports: "bg-amber-500",
      food: "bg-emerald-500",
      travel: "bg-cyan-500",
      music: "bg-violet-500",
      movies: "bg-rose-500",
      books: "bg-lime-500",
      environment: "bg-green-600",
      business: "bg-gray-600",
      philosophy: "bg-indigo-600",
      politics: "bg-red-600",
      news: "bg-blue-600",
      other: "bg-gray-500"
    };
    
    return topicColors[topic] || "bg-yellow-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/20 to-yellow-50 overflow-x-hidden relative">
      <audio 
        ref={audioRef} 
        src="https://cdn.pixabay.com/download/audio/2022/01/18/audio_3611db2d6d.mp3?filename=relaxing-mountains-rivers-118571.mp3"
        loop
        preload="auto"
      />
      
      {/* Audio Controls */}
      <div className="fixed bottom-4 right-4 z-50 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-sm border border-amber-100">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleAudio}
          className="text-amber-500 hover:bg-amber-50 hover:text-amber-600"
        >
          <Volume2 className={`h-4 w-4 ${!isPlaying && 'opacity-50'}`} />
        </Button>
        
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="w-20 accent-amber-500"
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownloadAudio}
          className="text-amber-500 hover:bg-amber-50 hover:text-amber-600"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md shadow-sm border-b border-amber-100">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-8 h-8 drop-shadow-sm"
                />
                <span className="text-xl font-semibold hidden sm:inline text-amber-500">
                  Bubble Trouble
                </span>
              </Link>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-400" />
                <input
                  type="search"
                  placeholder="Search bubbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-amber-100 bg-white text-amber-900 placeholder:text-amber-300 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-3">
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-amber-600 hover:bg-amber-50 transition-colors ${
                  location.pathname === '/my-bubbles' ? 'bg-amber-100/70' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-amber-600 hover:bg-amber-50 transition-colors ${
                  location.pathname === '/feed' ? 'bg-amber-100/70' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Feed</span>
              </Link>
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-amber-50 rounded-full text-amber-600 ml-2"
                    >
                      <Avatar className="h-8 w-8 border border-amber-200">
                        <AvatarFallback className="bg-amber-100 text-amber-700">
                          {getUserInitials(profile?.display_name, user?.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white z-[100] rounded-lg shadow-lg border border-amber-100">
                    <DropdownMenuItem className="flex flex-col items-start p-4 border-b border-amber-100">
                      <span className="font-medium text-amber-800">
                        {profile?.display_name || user?.email}
                      </span>
                      <span className="text-xs text-amber-500 mt-1">
                        @{profile?.username || user?.email?.split('@')[0]}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="hover:bg-amber-50">
                      <Link to="/profile" className="cursor-pointer p-3">
                        <User className="mr-2 h-4 w-4 text-amber-500" />
                        <span className="text-amber-800">Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      navigate('/auth/logout');
                    }} className="hover:bg-amber-50 p-3">
                      <LogOut className="mr-2 h-4 w-4 text-amber-500" />
                      <span className="text-amber-800">Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="bg-amber-500 hover:bg-amber-600 text-white ml-2 rounded-full px-6"
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-400" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-amber-100 bg-white text-amber-900 placeholder:text-amber-300 focus:ring-2 focus:ring-amber-200 focus:outline-none text-sm"
            />
          </div>
        </div>
      </nav>
      
      <div className="pt-32 pb-20 px-4 sm:px-6 relative z-0">
        {/* Bubble World and Filtering UI */}
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl font-bold text-amber-700 mb-2">Bubble World</h1>
              <p className="text-amber-600/80 max-w-md">Explore and join ephemeral conversations that vanish after 7 days</p>
            </div>
            
            <Button
              onClick={() => setNewBubbleDialog(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6 shadow-sm transition-all hover:shadow"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Bubble
            </Button>
          </div>
          
          {isLoadingBubbles ? (
            <div className="text-center py-16 bg-white/50 rounded-2xl backdrop-blur-sm shadow-sm border border-amber-100">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
              <p className="mt-4 text-amber-600 font-medium">Loading bubbles...</p>
            </div>
          ) : filteredBubbles.length === 0 ? (
            <div className="text-center py-16 bg-white/50 rounded-2xl backdrop-blur-sm shadow-sm border border-amber-100">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-amber-100">
                <Sparkles className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-medium text-amber-700">No bubbles found</h3>
              <p className="text-amber-600/80 mt-2 max-w-md mx-auto">Try a different search or create your own bubble to start a conversation</p>
              <Button
                onClick={() => setNewBubbleDialog(true)}
                className="mt-6 bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6 shadow-sm transition-all hover:shadow"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Bubble
              </Button>
            </div>
          ) : (
            <div className="h-[65vh] w-full bg-white/30 rounded-2xl p-4 backdrop-blur-sm shadow-sm border border-amber-100">
              <BubbleWorld 
                topics={bubbleDataForComponent}
                onBubbleClick={(bubbleId) => {
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
        <DialogContent className="sm:max-w-[500px] bg-white rounded-xl border border-amber-100">
          <DialogHeader>
            <DialogTitle className="text-amber-700 text-xl">Create a New Bubble</DialogTitle>
            <DialogDescription className="text-amber-600/80">
              Create a new bubble for ephemeral conversations. Bubbles automatically expire after 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-3">
              <Label htmlFor="name" className="text-amber-800 font-medium">Bubble Name</Label>
              <Input
                id="name"
                value={newBubbleInfo.name}
                onChange={(e) => setNewBubbleInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter bubble name"
                className="border-amber-200 focus:border-amber-400 focus:ring-amber-300"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="topic" className="text-amber-800 font-medium">Topic</Label>
              <Select
                value={newBubbleInfo.topic}
                onValueChange={(value) => setNewBubbleInfo(prev => ({ ...prev, topic: value }))}
              >
                <SelectTrigger className="border-amber-200 focus:border-amber-400 focus:ring-amber-300">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent className="border-amber-100 bg-white">
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
            <div className="grid gap-3">
              <Label htmlFor="description" className="text-amber-800 font-medium">Description <span className="text-amber-400 text-sm font-normal">(Optional)</span></Label>
              <Textarea
                id="description"
                value={newBubbleInfo.description}
                onChange={(e) => setNewBubbleInfo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter a brief description about your bubble"
                className="resize-none border-amber-200 focus:border-amber-400 focus:ring-amber-300"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewBubbleDialog(false)}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              variant={isCreatingBubble ? "loading" : "default"}
              onClick={handleCreateBubble}
              disabled={isCreatingBubble || !newBubbleInfo.name.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isCreatingBubble ? "Creating..." : "Create Bubble"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Chat Dialog */}
      <Dialog open={chatOpen && !!selectedBubbleId} onOpenChange={(open) => {
        if (!open) setChatOpen(false);
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col overflow-hidden rounded-xl p-0 bg-white border border-amber-100">
          <DialogHeader className="border-b border-amber-100 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${selectedBubble?.topic ? getTopicColorClass(selectedBubble.topic) : 'bg-amber-500'}`}></div>
                <DialogTitle className="text-amber-700 text-xl">
                  {isLoadingBubbleDetails ? 'Loading...' : selectedBubble?.name}
                </DialogTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)} className="text-amber-400 hover:text-amber-600 hover:bg-amber-50">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {!isLoadingBubbleDetails && selectedBubble && (
              <div className="flex flex-col text-sm text-amber-600/80 mt-2">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="border-amber-200 text-amber-600 font-normal px-2 py-0.5">
                    {selectedBubble.topic.charAt(0).toUpperCase() + selectedBubble.topic.slice(1)}
                  </Badge>
                  <span className="text-xs text-amber-500 font-medium">
                    {formatExpiry(selectedBubble.expires_at)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-amber-600">{selectedBubble.reflect_count} reflects</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReflect(selectedBubble.id)}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 -my-1 h-8 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1 text-amber-400" />
                    Reflect
                  </Button>
                </div>
              </div>
            )}
          </DialogHeader>
          
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6">
            {isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10 text-amber-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-amber-300" />
                <p className="font-medium">No messages yet</p>
                <p className="text-sm text-amber-400 mt-1">Be the first to start this conversation!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message: Message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.username === (profile?.username || user?.email) ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.username !== (profile?.username || user?.email) && (
                      <Avatar className="h-8 w-8 mr-2 mt-1 border border-amber-200">
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                          {message.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div 
                      className={`rounded-xl px-4 py-3 max-w-[80%] ${
                        message.username === (profile?.username || user?.email)
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-50 text-amber-900 border border-amber-100'
                      }`}
                    >
                      <div className="flex justify-between items-baseline gap-4">
                        <span className="font-medium text-xs">
                          {message.username === (profile?.username || user?.email) ? 'You' : message.username}
                        </span>
                        <span className="text-xs opacity-70">{formatMessageTime(message.created_at)}</span>
                      </div>
                      <p className="mt-2">{message.content}</p>
                    </div>
                    {message.username === (profile?.username || user?.email) && (
                      <Avatar className="h-8 w-8 ml-2 mt-1 border border-amber-200">
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                          {getUserInitials(profile?.display_name, user?.email)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          {/* Message Input */}
          <div className="p-4 border-t border-amber-100 mt-auto">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="border-amber-200 focus:border-amber-400 focus:ring-amber-300"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={() => handleSendMessage()} className="bg-amber-500 hover:bg-amber-600 text-white">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex mt-3 justify-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-amber-400 hover:bg-amber-50 hover:text-amber-600">
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-amber-400 hover:bg-amber-50 hover:text-amber-600">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-amber-400 hover:bg-amber-50 hover:text-amber-600">
                <Mic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-amber-400 hover:bg-amber-50 hover:text-amber-600">
                <SmilePlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
