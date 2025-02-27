
import { useState, useEffect, useRef } from "react";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, User, TrendingUp, Sparkles, Plus, Send, Image, Video, Mic, SmilePlus, LogOut, X, Volume2, Download, Reply, MoreVertical } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
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

const availableTopics = [
  "Art & Design",
  "Books & Writing",
  "Business",
  "Education",
  "Entertainment",
  "Food & Cooking",
  "Gaming",
  "Health & Fitness",
  "Music",
  "Nature & Environment",
  "Science & Tech",
  "Social & Community",
  "Sports",
  "Travel & Adventure",
  "World Culture"
];

interface Bubble {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: "sm" | "md" | "lg";
  description: string | null;
  reflect_count: number;
  expires_at: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  username: string;
  timestamp: string;
}

// Helper function to calculate bubble size based on reflects
const calculateBubbleSize = (reflectCount: number): "sm" | "md" | "lg" => {
  if (reflectCount >= 10) return "lg";
  if (reflectCount >= 5) return "md";
  return "sm";
};

// Format timestamp to a readable time
const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBubble, setNewBubble] = useState({
    name: "",
    description: "",
    topic: "",
    username: profile?.username || user?.email || "",
  });
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Update user info in new bubble form when profile loads
  useEffect(() => {
    if (profile?.username || user?.email) {
      setNewBubble(prev => ({
        ...prev,
        username: profile?.username || user?.email || "",
      }));
    }
  }, [profile, user]);

  // Fetch bubbles with reflects
  const { data: bubbles = [] } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .gte('expires_at', new Date().toISOString());
      
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
        size: calculateBubbleSize(bubble.reflect_count || 0)
      }));
    },
    refetchInterval: 60000 // Refetch every minute to check for expired bubbles
  });

  const handleCreateBubble = async () => {
    if (!newBubble.name || !newBubble.topic) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const username = profile?.username || user?.email || "";
    
    const newBubbleData = {
      name: newBubble.name,
      topic: newBubble.topic,
      description: newBubble.description,
      username,
      size: "md" as const,
      expires_at: expiresAt.toISOString()
    };

    const { data, error } = await supabase
      .from('bubbles')
      .insert(newBubbleData)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating bubble",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setIsCreateDialogOpen(false);
    toast({
      title: "Success!",
      description: "New bubble created successfully",
    });

    // Refresh bubbles list
    queryClient.invalidateQueries({ queryKey: ['bubbles'] });

    setNewBubble({ 
      name: "", 
      description: "", 
      topic: "", 
      username: profile?.username || user?.email || "" 
    });
  };

  const handleFileUpload = async (type: 'image' | 'video' | 'gif') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 
                   type === 'video' ? 'video/*' : 
                   'image/gif';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && selectedBubbleId) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result as string;
          await handleSendMessage(content);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Improved voice recording functionality with WhatsApp-style experience
  const handleVoiceRecord = () => {
    // If already recording, stop it
    if (isRecording) {
      stopRecording();
      return;
    }

    audioChunksRef.current = [];

    // Use specific audio settings for better compatibility
    navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
      .then(stream => {
        // Use more widely supported audio format
        const options = { 
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000 // 128kbps for better quality
        };
        
        try {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
        } catch (e) {
          // Fallback for older devices
          mediaRecorderRef.current = new MediaRecorder(stream);
        }
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: 'audio/webm' 
          });
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            if (selectedBubbleId) {
              await handleSendMessage(content);
            }
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
          
          // Reset the UI
          setIsRecording(false);
          setRecordingSeconds(0);
          if (recordingTimerRef.current) {
            window.clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
        };

        // Capture data more frequently for better quality
        mediaRecorderRef.current.start(200);
        setIsRecording(true);
        
        // Start timer
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
        
        // Auto-stop after 60 seconds
        setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            stopRecording();
          }
        }, 60000);
      })
      .catch(error => {
        console.error("Media device error:", error);
        toast({
          title: "Error",
          description: "Could not access microphone. Please check your browser permissions.",
          variant: "destructive"
        });
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Format the recording time in MM:SS format
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch messages for selected bubble
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];

      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .eq('bubble_id', selectedBubbleId)
        .order('created_at', { ascending: true });

      if (error) {
        toast({
          title: "Error fetching messages",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }

      return data.map(msg => ({
        id: msg.id,
        content: msg.content,
        username: msg.username,
        timestamp: msg.created_at
      }));
    },
    enabled: !!selectedBubbleId
  });

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!selectedBubbleId) return;

    const channel = supabase.channel('chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bubble_messages',
          filter: `bubble_id=eq.${selectedBubbleId}`
        },
        (payload) => {
          // Invalidate messages query to trigger a refresh
          queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBubbleId, queryClient]);

  const handleSendMessage = async (content?: string) => {
    if (!selectedBubbleId) return;
    
    const messageContent = content || newMessage;
    if (!messageContent.trim()) return;

    const username = profile?.username || user?.email || "";

    const { error } = await supabase
      .from('bubble_messages')
      .insert({
        bubble_id: selectedBubbleId,
        content: messageContent,
        username
      });

    if (error) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setNewMessage("");
  };

  const handleReflect = async (bubbleId: string) => {
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
          variant: "destructive"
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

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['bubbles'] });
  };

  const handleBubbleClick = (id: string) => {
    setSelectedBubbleId(id);
    setIsChatOpen(true);
  };

  // Subscribe to real-time updates for reflects and bubble changes
  useEffect(() => {
    const channel = supabase.channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reflects' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bubbles'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bubble_messages' },
        () => {
          if (selectedBubbleId) {
            queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBubbleId, queryClient]);

  // Add this query to fetch the selected bubble details
  const { data: selectedBubble } = useQuery({
    queryKey: ['bubble', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return null;

      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .eq('id', selectedBubbleId)
        .single();

      if (error) {
        toast({
          title: "Error fetching bubble",
          description: error.message,
          variant: "destructive"
        });
        return null;
      }

      return data as Bubble;
    },
    enabled: !!selectedBubbleId
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up recording on component unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Clean up audio elements
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // Enhanced audio playback with better mobile support
  const togglePlayAudio = (messageId: string, audioSrc: string) => {
    try {
      // Create new audio element if doesn't exist
      if (!audioRefs.current[messageId]) {
        const audio = new Audio();
        
        // Set audio playback settings for better mobile compatibility
        audio.preload = 'auto';
        
        // Add event listeners for error handling and completion
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setPlayingAudioId(null);
          toast({
            title: "Playback Error",
            description: "Unable to play this audio message",
            variant: "destructive"
          });
        });
        
        audio.addEventListener('ended', () => {
          setPlayingAudioId(null);
        });
        
        audio.addEventListener('canplay', () => {
          audio.play().catch(err => {
            console.error("Play error:", err);
            setPlayingAudioId(null);
          });
        });
        
        audioRefs.current[messageId] = audio;
      }
      
      const audio = audioRefs.current[messageId];

      if (playingAudioId === messageId) {
        // Stop playback
        audio.pause();
        setPlayingAudioId(null);
      } else {
        // Stop any currently playing audio
        if (playingAudioId && audioRefs.current[playingAudioId]) {
          audioRefs.current[playingAudioId].pause();
        }
        
        // Set new source and play
        audio.src = audioSrc;
        setPlayingAudioId(messageId);
        
        // For iOS devices that require user interaction
        document.body.addEventListener('touchend', function playAttempt() {
          audio.play().catch(err => console.error("Mobile play error:", err));
          document.body.removeEventListener('touchend', playAttempt);
        }, { once: true });
      }
    } catch (error) {
      console.error("Audio toggle error:", error);
      toast({
        title: "Audio Error",
        description: "There was a problem playing this audio message",
        variant: "destructive"
      });
    }
  };

  // Download media from message
  const handleDownloadMedia = (content: string, type: string) => {
    const link = document.createElement('a');
    link.href = content;
    link.download = `bubble-media-${Date.now()}.${type}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] font-montserrat">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-2 sm:px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-2 sm:gap-6 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-7 h-7 sm:w-8 sm:h-8"
                />
                <span className="text-sm sm:text-xl font-semibold text-[#ebbd34] whitespace-nowrap">
                  Bubble Trouble
                </span>
              </div>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search in the bubbles world..."
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
                className={`nav-link flex items-center gap-1 px-2 sm:px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-1 px-2 sm:px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34]"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="flex flex-col items-start p-3">
                    <span className="font-medium text-[#ebbd34]">
                      {profile?.display_name || user?.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      @{profile?.username || user?.email?.split('@')[0]}
                    </span>
                  </DropdownMenuItem>
                  <Link to="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile Search Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10 sm:hidden">
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
            />
          </div>
        </div>
      </div>
      
      <main className="flex flex-col items-center justify-start w-full min-h-[calc(100dvh-64px)] pt-28 sm:pt-20">
        <div className="w-full h-[calc(100dvh-180px)] sm:w-[90%] sm:h-[700px] sm:max-w-4xl relative sm:rounded-3xl overflow-hidden bg-[#FEF7E4]/50 backdrop-blur-sm sm:shadow-xl sm:border sm:border-[#ebbd34]/10">
          <BubbleWorld 
            topics={bubbles}
            onBubbleClick={handleBubbleClick}
          />
        </div>

        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-lg rounded-full w-14 h-14 p-0 sm:static sm:w-auto sm:h-auto sm:p-4 sm:mt-8 sm:rounded-lg"
          size="icon"
        >
          <Plus className="w-7 h-7 sm:w-5 sm:h-5 sm:mr-2" />
          <span className="hidden sm:inline">Create Bubble</span>
        </Button>
      </main>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] sm:h-[700px] flex flex-col p-0 bg-[#FEF7E4] border border-[#ebbd34]/20 rounded-xl overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between p-3 bg-[#ebbd34]">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setIsChatOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              
              <div>
                <DialogTitle className="text-white text-xl font-semibold">
                  {selectedBubble?.name}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm">
                  {selectedBubble?.description || selectedBubble?.topic}
                </DialogDescription>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => selectedBubbleId && handleReflect(selectedBubbleId)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              <span>Reflect</span>
            </Button>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 space-y-4 bg-white/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-4 ${
                  message.username === profile?.username || message.username === user?.email 
                  ? "justify-end" 
                  : "justify-start"
                }`}
              >
                <div className={`max-w-[80%] rounded-xl p-3 ${
                  message.username === profile?.username || message.username === user?.email 
                  ? "bg-[#ebbd34] text-white"
                  : "bg-white text-gray-800 border border-[#ebbd34]/20"
                }`}>
                  {message.content.startsWith('data:image/') ? (
                    <div className="relative group">
                      <img 
                        src={message.content} 
                        alt="Shared image" 
                        className="rounded-md max-w-full cursor-pointer"
                        onClick={() => window.open(message.content, '_blank')}
                      />
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white"
                          onClick={() => handleDownloadMedia(message.content, 'jpg')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : message.content.startsWith('data:video/') ? (
                    <div className="relative">
                      <video 
                        src={message.content} 
                        controls 
                        className="rounded-md max-w-full"
                      />
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white"
                          onClick={() => handleDownloadMedia(message.content, 'mp4')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : message.content.startsWith('data:audio/') ? (
                    // WhatsApp-style audio message UI with better mobile support
                    <div className="flex items-center gap-2 p-1">
                      {/* Play/pause button with changing icon */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${
                          playingAudioId === message.id ? 
                          "bg-[#ebbd34]/20 text-[#ebbd34]" : 
                          message.username === profile?.username || message.username === user?.email ?
                          "text-white hover:bg-white/20" :
                          "text-[#ebbd34] hover:bg-[#ebbd34]/10"
                        }`}
                        onClick={() => togglePlayAudio(message.id, message.content)}
                      >
                        {playingAudioId === message.id ? 
                          <X className="h-5 w-5" /> : 
                          <Volume2 className="h-5 w-5" />
                        }
                      </Button>
                      
                      {/* WhatsApp-style waveform visualization */}
                      <div className="flex-1 h-8 flex items-center">
                        <div className="w-full flex items-center justify-between space-x-0.5">
                          {Array.from({ length: 27 }).map((_, i) => {
                            // Create a varying height pattern like WhatsApp voice messages
                            const heights = [
                              3, 5, 7, 4, 9, 5, 2, 8, 6, 3, 7, 9, 5, 3, 8, 6, 2, 5, 9, 4, 6, 3, 7, 8, 5, 2, 4
                            ];
                            const height = heights[i];
                            const isPlaying = playingAudioId === message.id;
                            
                            // Determine the color based on message sender and playback state
                            const barColor = message.username === profile?.username || message.username === user?.email 
                              ? isPlaying ? "bg-white" : "bg-white/60" 
                              : isPlaying ? "bg-[#ebbd34]" : "bg-[#ebbd34]/60";
                              
                            return (
                              <div 
                                key={i}
                                className={`w-1 rounded-full transition-all duration-300 ${barColor}`}
                                style={{ 
                                  height: `${height}px`,
                                  // Animate bars when playing
                                  animation: isPlaying ? `pulse-${i % 3} 1.2s infinite` : 'none',
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  
                  <div className="text-right mt-1">
                    <span className="text-xs opacity-70">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-3 bg-white border-t border-[#ebbd34]/20">
            {/* WhatsApp-style recording UI */}
            {isRecording ? (
              <div className="flex items-center justify-between bg-[#FEF7E4] rounded-full px-4 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-sm text-gray-600">
                    {formatRecordingTime(recordingSeconds)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full"
                    onClick={stopRecording}
                  >
                    <X className="h-5 w-5" />
                    <span className="ml-1">Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white rounded-full"
                    onClick={stopRecording}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    <span>Send</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex gap-2 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/10"
                    onClick={() => handleFileUpload('image')}
                  >
                    <Image className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/10"
                    onClick={() => handleFileUpload('video')}
                  >
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/10"
                    onClick={() => handleFileUpload('gif')}
                  >
                    <SmilePlus className="h-5 w-5" />
                  </Button>
                </div>
                
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 rounded-full bg-[#ebbd34]/5 border-[#ebbd34]/20 text-gray-800 placeholder-gray-500 focus-visible:ring-[#ebbd34]/20"
                />
                
                {newMessage.trim() ? (
                  <Button 
                    onClick={() => handleSendMessage()}
                    size="icon" 
                    className="rounded-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleVoiceRecord}
                    size="icon" 
                    className={`rounded-full ${
                      isRecording 
                        ? "bg-red-500 hover:bg-red-600 text-white" 
                        : "bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                    }`}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Bubble Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#FEF7E4] border-none rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-[#ebbd34] text-xl">Create New Bubble</DialogTitle>
            <DialogDescription className="text-[#ebbd34]/70">
              Choose a topic and name for your new bubble community.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topic" className="text-[#ebbd34]">Topic</Label>
              <Select
                value={newBubble.topic}
                onValueChange={(value) => setNewBubble({ ...newBubble, topic: value })}
              >
                <SelectTrigger className="w-full bg-[#ebbd34]/5 border-[#ebbd34]/20 text-[#ebbd34]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-[#FEF7E4] border-[#ebbd34]/20">
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic} value={topic} className="text-[#ebbd34]">
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[#ebbd34]">Bubble Name</Label>
              <Input
                id="name"
                value={newBubble.name}
                onChange={(e) => setNewBubble({ ...newBubble, name: e.target.value })}
                placeholder="Give your bubble a name..."
                className="bg-[#ebbd34]/5 border-[#ebbd34]/20 text-[#ebbd34] placeholder-[#ebbd34]/50"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-[#ebbd34]">Description</Label>
              <Textarea
                id="description"
                value={newBubble.description}
                onChange={(e) => setNewBubble({ ...newBubble, description: e.target.value })}
                placeholder="What's your bubble about?"
                className="bg-[#ebbd34]/5 border-[#ebbd34]/20 text-[#ebbd34] placeholder-[#ebbd34]/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-[#ebbd34]/20 text-[#ebbd34] hover:text-[#ebbd34]/70"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBubble}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
            >
              Create Bubble
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add animation keyframes for the waveform */}
      <style>
        {`
          @keyframes pulse-0 {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(1.5); }
          }
          @keyframes pulse-1 {
            0%, 100% { transform: scaleY(1); }
            33% { transform: scaleY(1.3); }
          }
          @keyframes pulse-2 {
            0%, 100% { transform: scaleY(1); }
            66% { transform: scaleY(1.7); }
          }
        `}
      </style>
    </div>
  );
};

export default Index;
