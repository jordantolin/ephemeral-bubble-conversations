
import { useState, useEffect, useRef, useMemo } from "react";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, User, TrendingUp, Sparkles, Plus, Send, Image, Video, Mic, SmilePlus, LogOut, X, Volume2, Download } from "lucide-react";
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

// List of available topics for bubbles
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

// Main Index component
const Index = () => {
  console.log("Index component is rendering");
  const { user, profile, signOut } = useAuth();
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBubble, setNewBubble] = useState({
    name: "",
    description: "",
    topic: "",
    username: ""
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

  // Check for stored bubble ID in localStorage to open a specific bubble chat
  useEffect(() => {
    const storedBubbleId = localStorage.getItem('openBubbleId');
    if (storedBubbleId) {
      setSelectedBubbleId(storedBubbleId);
      setIsChatOpen(true);
      // Clear the stored ID after using it
      localStorage.removeItem('openBubbleId');
    }
  }, []);

  // Update username in new bubble form when profile or user changes
  useEffect(() => {
    if (profile?.username || user?.email) {
      setNewBubble(prev => ({
        ...prev,
        username: profile?.username || user?.email || "",
      }));
    }
  }, [profile, user]);

  // Fetch bubbles from Supabase with error handling
  const { data: allBubbles = [], isLoading: isLoadingBubbles } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .gte('expires_at', new Date().toISOString());
        
        if (error) {
          console.error("Error fetching bubbles:", error);
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
      } catch (err) {
        console.error("Unexpected error fetching bubbles:", err);
        toast({
          title: "Error fetching bubbles",
          description: "Could not load bubbles. Please try again.",
          variant: "destructive"
        });
        return [];
      }
    },
    refetchInterval: 60000, // Refetch every minute to check for expired bubbles
    retry: 3,
    retryDelay: 1000
  });

  // Filter bubbles based on search query
  const bubbles = useMemo(() => {
    if (!searchQuery.trim()) return allBubbles;
    
    const query = searchQuery.toLowerCase();
    return allBubbles.filter(bubble => 
      bubble.name.toLowerCase().includes(query) || 
      bubble.topic.toLowerCase().includes(query) ||
      (bubble.description && bubble.description.toLowerCase().includes(query))
    );
  }, [allBubbles, searchQuery]);

  // Create a new bubble with better error handling
  const handleCreateBubble = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a bubble",
        variant: "destructive"
      });
      return;
    }
    
    if (!newBubble.name || !newBubble.topic) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const username = profile?.username || user?.email || "";
      
      const newBubbleData = {
        name: newBubble.name,
        topic: newBubble.topic,
        description: newBubble.description,
        username,
        size: "sm" as const,
        expires_at: expiresAt.toISOString()
      };

      const { data, error } = await supabase
        .from('bubbles')
        .insert(newBubbleData)
        .select()
        .single();

      if (error) {
        console.error("Error creating bubble:", error);
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

      // Reset form
      setNewBubble({ 
        name: "", 
        description: "", 
        topic: "", 
        username: profile?.username || user?.email || "" 
      });
      
      // Auto-open the new bubble chat
      setSelectedBubbleId(data.id);
      setIsChatOpen(true);
    } catch (err) {
      console.error("Unexpected error creating bubble:", err);
      toast({
        title: "Error creating bubble",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle file upload with improved error handling
  const handleFileUpload = async (type: 'image' | 'video' | 'gif') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send media",
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

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 
                   type === 'video' ? 'video/*' : 
                   'image/gif';
    
    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          console.error("No file selected");
          return;
        }
        
        // Check file size - 10MB limit for all media
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please select a file smaller than 10MB",
            variant: "destructive"
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result as string;
          if (content) {
            await handleSendMessage(content);
          } else {
            throw new Error("Failed to read file");
          }
        };
        
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          toast({
            title: "Error reading file",
            description: "Could not process your media file",
            variant: "destructive"
          });
        };
        
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("File upload error:", err);
        toast({
          title: "Upload error",
          description: "Failed to upload media. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    input.click();
  };

  // Improved voice recording functionality with better mobile support
  const handleVoiceRecord = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to record audio",
        variant: "destructive"
      });
      return;
    }

    // If already recording, stop it
    if (isRecording) {
      stopRecording();
      return;
    }

    audioChunksRef.current = [];

    // Use more compatible settings for mobile audio recording
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    // Request microphone permission with better handling
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        // Test supported MIME types for different devices
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4;codecs=opus',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/ogg'
        ];

        // Find the first supported MIME type
        let options = {};
        for (const type of mimeTypes) {
          try {
            if (MediaRecorder.isTypeSupported(type)) {
              options = { 
                mimeType: type,
                audioBitsPerSecond: 128000
              };
              console.log("Using MIME type:", type);
              break;
            }
          } catch (e) {
            console.log("MIME type not supported:", type);
          }
        }

        try {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
        } catch (e) {
          console.error("MediaRecorder error:", e);
          // Fallback to default
          mediaRecorderRef.current = new MediaRecorder(stream);
        }
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          try {
            if (audioChunksRef.current.length === 0) {
              console.warn("No audio data collected");
              return;
            }
            
            const audioBlob = new Blob(audioChunksRef.current, { 
              type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
            });
            
            console.log("Audio blob created:", audioBlob.size, "bytes, type:", audioBlob.type);
            
            // Check if the blob is valid
            if (audioBlob.size === 0) {
              throw new Error("Empty audio recording");
            }
            
            const reader = new FileReader();
            reader.onload = async (e) => {
              const content = e.target?.result as string;
              console.log("Audio data URL created, length:", content.length);
              
              if (selectedBubbleId) {
                await handleSendMessage(content);
              }
            };
            
            reader.onerror = (err) => {
              console.error("FileReader error:", err);
              toast({
                title: "Error processing audio",
                description: "Could not create audio message",
                variant: "destructive"
              });
            };
            
            reader.readAsDataURL(audioBlob);
          } catch (error) {
            console.error("Audio processing error:", error);
            toast({
              title: "Recording error",
              description: "Failed to process your recording",
              variant: "destructive"
            });
          } finally {
            // Clean up
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setRecordingSeconds(0);
            if (recordingTimerRef.current) {
              window.clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
          }
        };

        // Start recording with frequent data collection for better quality
        mediaRecorderRef.current.start(100);
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
          title: "Microphone Error",
          description: "Could not access your microphone. Please check your browser permissions.",
          variant: "destructive"
        });
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error("Error stopping recording:", error);
        
        // Force cleanup if error
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setIsRecording(false);
        setRecordingSeconds(0);
        
        toast({
          title: "Recording Error",
          description: "Failed to stop recording properly",
          variant: "destructive"
        });
      }
    }
  };

  // Format the recording time in MM:SS format
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch messages for selected bubble with error handling
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];

      try {
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

        return data.map(msg => ({
          id: msg.id,
          content: msg.content,
          username: msg.username,
          timestamp: msg.created_at
        }));
      } catch (err) {
        console.error("Unexpected error fetching messages:", err);
        return [];
      }
    },
    enabled: !!selectedBubbleId,
    retry: 2
  });

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!selectedBubbleId) return;

    let channelSubscription: any;

    try {
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
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.error("Failed to subscribe to real-time updates:", status);
          }
        });

      channelSubscription = channel;
    } catch (err) {
      console.error("Error subscribing to real-time updates:", err);
    }

    return () => {
      try {
        if (channelSubscription) {
          supabase.removeChannel(channelSubscription);
        }
      } catch (err) {
        console.error("Error removing channel subscription:", err);
      }
    };
  }, [selectedBubbleId, queryClient]);

  // Send message with enhanced error handling
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
        console.error("Error sending message:", error);
        throw error;
      }

      setNewMessage("");
    } catch (error: any) {
      console.error("Message send error:", error);
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send your message",
        variant: "destructive"
      });
    }
  };

  // Reflect on a bubble with better error handling
  const handleReflect = async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
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
        } else {
          console.error("Error reflecting bubble:", error);
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
      
      // Refresh bubbles to update reflect count
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
    } catch (err) {
      console.error("Reflect error:", err);
      toast({
        title: "Error reflecting bubble",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Handle bubble click for opening chat
  const handleBubbleClick = (id: string) => {
    setSelectedBubbleId(id);
    setIsChatOpen(true);
  };

  // Subscribe to real-time updates for reflects and bubble changes
  useEffect(() => {
    let channelSubscription: any;
    
    try {
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
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.error("Failed to subscribe to database changes:", status);
          }
        });

      channelSubscription = channel;
    } catch (err) {
      console.error("Error setting up real-time updates:", err);
    }

    return () => {
      try {
        if (channelSubscription) {
          supabase.removeChannel(channelSubscription);
        }
      } catch (err) {
        console.error("Error removing channel subscription:", err);
      }
    };
  }, [selectedBubbleId, queryClient]);

  // Fetch selected bubble details with caching
  const { data: selectedBubble } = useQuery({
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
          console.error("Error fetching bubble:", error);
          toast({
            title: "Error fetching bubble",
            description: error.message,
            variant: "destructive"
          });
          return null;
        }

        return data as Bubble;
      } catch (err) {
        console.error("Unexpected error fetching bubble:", err);
        return null;
      }
    },
    enabled: !!selectedBubbleId,
    staleTime: 30000 // Cache for 30 seconds
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isLoadingMessages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoadingMessages]);

  // Clean up recording on component unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error("Error stopping recorder on unmount:", err);
        }
      }
      
      // Clean up audio elements
      Object.values(audioRefs.current).forEach(audio => {
        try {
          audio.pause();
          audio.src = '';
        } catch (err) {
          console.error("Error cleaning up audio:", err);
        }
      });
    };
  }, []);

  // Get user avatar color - matches the function in BubbleChat.tsx
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

  // Check if current user is the message sender - matches BubbleChat.tsx
  const isCurrentUser = (username: string) => {
    return username === profile?.username || username === user?.email;
  };

  // Enhanced audio playback with better mobile support
  const togglePlayAudio = (messageId: string, audioSrc: string) => {
    console.log("Toggle audio playback for message:", messageId);
    
    try {
      // Create new audio element if doesn't exist
      if (!audioRefs.current[messageId]) {
        const audio = new Audio();
        
        // Important settings for mobile compatibility
        audio.preload = 'auto';
        
        // Add event listeners
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
          console.log("Audio playback ended");
          setPlayingAudioId(null);
        });
        
        audioRefs.current[messageId] = audio;
      }
      
      const audio = audioRefs.current[messageId];

      if (playingAudioId === messageId) {
        // User clicked stop
        console.log("Stopping audio playback");
        audio.pause();
        setPlayingAudioId(null);
      } else {
        // Stop any currently playing audio
        if (playingAudioId && audioRefs.current[playingAudioId]) {
          audioRefs.current[playingAudioId].pause();
        }
        
        // Set source and play
        console.log("Starting audio playback");
        audio.src = audioSrc;
        
        // Use this pattern for iOS compatibility
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio playing successfully");
              setPlayingAudioId(messageId);
            })
            .catch(err => {
              console.error("Play error:", err);
              
              // Special handling for devices requiring user interaction
              if (err.name === 'NotAllowedError') {
                toast({
                  title: "Playback Error",
                  description: "Click anywhere on the screen first, then try playing the audio again",
                });
                
                // Add one-time event listener for user interaction
                const unlockAudio = () => {
                  document.removeEventListener('click', unlockAudio);
                  document.removeEventListener('touchstart', unlockAudio);
                  
                  audio.play()
                    .then(() => {
                      console.log("Audio unlocked and playing");
                      setPlayingAudioId(messageId);
                    })
                    .catch(e => console.error("Still can't play audio:", e));
                };
                
                document.addEventListener('click', unlockAudio, { once: true });
                document.addEventListener('touchstart', unlockAudio, { once: true });
              }
            });
        }
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
    try {
      const link = document.createElement('a');
      link.href = content;
      link.download = `bubble-media-${Date.now()}.${type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Download Error",
        description: "Failed to download media",
        variant: "destructive"
      });
    }
  };

  // Check if a bubble has expired - to match BubbleChat.tsx
  const isBubbleExpired = (expires_at: string | null) => {
    if (!expires_at) return false;
    return new Date(expires_at) < new Date();
  };

  // Return default bubbles if loading takes too long
  const defaultBubbles = useMemo(() => {
    if (!isLoadingBubbles || allBubbles.length > 0) return [];
    
    return [
      {
        id: "default-1",
        topic: "Welcome",
        username: "system",
        name: "Welcome to Bubble Trouble!",
        size: "lg" as "lg",
        reflect_count: 10,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        description: "Tap on bubbles to start chatting!"
      },
      {
        id: "default-2",
        topic: "Getting Started",
        username: "system",
        name: "How to use Bubble Trouble",
        size: "md" as "md",
        reflect_count: 5,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        description: "Create bubbles, chat, and reflect on topics you love!"
      }
    ];
  }, [isLoadingBubbles, allBubbles]);

  // Determine which bubbles to display: real data, filtered data, or defaults
  const displayBubbles = searchQuery.trim()
    ? bubbles
    : allBubbles.length > 0
      ? allBubbles
      : defaultBubbles;

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
              {user ? (
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
                  <DropdownMenuContent align="end" className="w-56 bg-white z-[100]">
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
              ) : (
                <Link to="/auth">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-[#ebbd34] hover:bg-[#ebbd34]/5"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile Search Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10 sm:hidden">
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 w-4" />
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
        {displayBubbles.length === 0 && searchQuery.trim() !== "" ? (
          <div className="flex flex-col items-center justify-center h-[calc(100dvh-180px)] text-center p-4">
            <img 
              src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
              alt="No results" 
              className="w-16 h-16 opacity-40 mb-3"
            />
            <h3 className="text-xl font-semibold text-[#ebbd34]">No bubbles found</h3>
            <p className="text-[#ebbd34]/70 max-w-sm mt-2">
              No bubbles match your search "{searchQuery}". Try a different search or create a new bubble!
            </p>
            <Button
              onClick={() => user ? setIsCreateDialogOpen(true) : navigate('/auth')}
              className="mt-6 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              {user ? "Create New Bubble" : "Sign In to Create"}
            </Button>
          </div>
        ) : (
          <div className="w-full h-[calc(100dvh-180px)] sm:w-[90%] sm:h-[700px] sm:max-w-4xl relative sm:rounded-3xl overflow-hidden bg-[#FEF7E4]/50 backdrop-blur-sm sm:shadow-xl sm:border sm:border-[#ebbd34]/10">
            {displayBubbles.length > 0 ? (
              <BubbleWorld 
                topics={displayBubbles}
                onBubbleClick={handleBubbleClick}
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#ebbd34]/10 border-t-[#ebbd34] rounded-full animate-spin"></div>
                <p className="text-[#ebbd34] mt-4">Loading bubbles...</p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={() => user ? setIsCreateDialogOpen(true) : navigate('/auth')}
          className="fixed bottom-6 right-6 z-50 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-lg rounded-full w-14 h-14 p-0 sm:static sm:w-auto sm:h-auto sm:p-4 sm:mt-8 sm:rounded-lg"
          size="icon"
        >
          <Plus className="w-7 h-7 sm:w-5 sm:h-5 sm:mr-2" />
          <span className="hidden sm:inline">{user ? "Create Bubble" : "Sign In"}</span>
        </Button>
      </main>

      {/* Chat Dialog - Updated to match BubbleChat.tsx design */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] sm:h-[700px] flex flex-col p-0 bg-[#FEF7E4] border border-[#ebbd34]/20 rounded-xl overflow-hidden">
          {/* Header - Matching BubbleChat.tsx style */}
          <DialogHeader className="p-3 bg-[#ebbd34] text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold text-white">
                  {selectedBubble?.name || "Loading..."}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm">
                  {selectedBubble?.topic || "Please wait..."}
                </DialogDescription>
              </div>
              
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => selectedBubbleId && handleReflect(selectedBubbleId)}
                  disabled={!selectedBubble || isBubbleExpired(selectedBubble.expires_at)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span>Reflect</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Bubble exploded notice - to match BubbleChat.tsx */}
          {selectedBubble && isBubbleExpired(selectedBubble.expires_at) && (
            <div className="bg-red-500/80 text-white py-2 text-center">
              <p className="font-medium">This bubble has exploded and can no longer receive messages.</p>
            </div>
          )}

          {/* Messages area - Matching BubbleChat.tsx style */}
          <ScrollArea className="flex-1 p-4 space-y-4 bg-white/50">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="w-8 h-8 border-2 border-[#ebbd34]/20 border-t-[#ebbd34] rounded-full animate-spin mb-3"></div>
                <p className="text-[#ebbd34]/70">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <MessageCircle className="w-10 h-10 text-[#ebbd34]/30 mb-2" />
                <p className="text-[#ebbd34]/70">
                  No messages yet. Be the first to chat!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex mb-4 ${isCurrentUser(message.username) ? "justify-end" : "justify-start"}`}
                >
                  {!isCurrentUser(message.username) && (
                    <div 
                      className="w-8 h-8 rounded-full flex-shrink-0 mt-1 mr-2 flex items-center justify-center text-sm text-white"
                      style={{ backgroundColor: getUserColor(message.username) }}
                    >
                      {message.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className={`max-w-[75%] rounded-xl p-3 ${
                    isCurrentUser(message.username)
                      ? "bg-[#ebbd34] text-white"
                      : "bg-white text-gray-800 border border-[#ebbd34]/20"
                  }`}>
                    {!isCurrentUser(message.username) && (
                      <p className="text-xs font-medium mb-1 text-[#ebbd34]/80">
                        @{message.username.split('@')[0]}
                      </p>
                    )}
                    
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
                      <div className="relative group">
                        <video 
                          src={message.content} 
                          controls 
                          className="rounded-md max-w-full"
                          playsInline
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
                      <div className="flex items-center gap-2 p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-10 w-10 rounded-full ${
                            playingAudioId === message.id ? 
                            "bg-[#ebbd34]/20 text-[#ebbd34]" : 
                            isCurrentUser(message.username) ?
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
                        
                        <div className="flex-1 h-8 flex items-center">
                          <div className="w-full flex items-center justify-between space-x-0.5">
                            {Array.from({ length: 27 }).map((_, i) => {
                              const heights = [
                                3, 5, 7, 4, 9, 5, 2, 8, 6, 3, 7, 9, 5, 3, 8, 6, 2, 5, 9, 4, 6, 3, 7, 8, 5, 2, 4
                              ];
                              const height = heights[i];
                              const isPlaying = playingAudioId === message.id;
                              
                              const barColor = isCurrentUser(message.username)
                                ? isPlaying ? "bg-white" : "bg-white/60" 
                                : isPlaying ? "bg-[#ebbd34]" : "bg-[#ebbd34]/60";
                                
                              return (
                                <div 
                                  key={i}
                                  className={`w-1 rounded-full transition-all duration-300 ${barColor}`}
                                  style={{ 
                                    height: `${height}px`,
                                    animation: isPlaying ? `pulse-${i % 3} 1.2s infinite` : 'none',
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="break-words">{message.content}</p>
                    )}
                    
                    <div className={`text-right mt-1 ${
                      isCurrentUser(message.username) ? "text-white/70" : "text-gray-500"
                    }`}>
                      <span className="text-xs">
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  {isCurrentUser(message.username) && (
                    <div 
                      className="w-8 h-8 rounded-full flex-shrink-0 mt-1 ml-2 flex items-center justify-center text-sm text-white"
                      style={{ backgroundColor: getUserColor(message.username) }}
                    >
                      {message.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Message input area - Matching BubbleChat.tsx style */}
          <div className="p-3 bg-white/80 backdrop-blur-md border-t border-[#ebbd34]/10">
            {/* Recording UI */}
            {isRecording ? (
              <div className="flex items-center justify-between bg-[#FEF7E4] rounded-full px-4 py-2 mb-2 shadow-md">
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
                    onClick={() => {
                      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.stop();
                        setIsRecording(false);
                        setRecordingSeconds(0);
                        if (recordingTimerRef.current) {
                          window.clearInterval(recordingTimerRef.current);
                          recordingTimerRef.current = null;
                        }
                        audioChunksRef.current = [];
                      }
                    }}
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
                {/* Media buttons */}
                {user && selectedBubble && !isBubbleExpired(selectedBubble.expires_at) && (
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
                )}
                
                {!user ? (
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-center">
                    <p className="text-gray-500 text-sm">
                      <Link to="/auth" className="text-[#ebbd34] hover:underline">Sign in</Link> to join the conversation
                    </p>
                  </div>
                ) : selectedBubble && isBubbleExpired(selectedBubble.expires_at) ? (
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-center">
                    <p className="text-gray-500 text-sm">This bubble has exploded</p>
                  </div>
                ) : (
                  <>
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
                  </>
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
                <SelectContent className="bg-[#FEF7E4] border-[#ebbd34]/20 z-[100]">
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
          
          * {
            -webkit-transform-style: preserve-3d;
            transform-style: preserve-3d;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
        `}
      </style>
    </div>
  );
};

export default Index;
