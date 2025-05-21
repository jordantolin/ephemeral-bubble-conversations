
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Image, Video, SmilePlus, Mic, X, Volume2, Download, ArrowLeft, Heart, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

const BubbleChat = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Determine if the user came from Bubble World
  const [cameFromBubbleWorld, setCameFromBubbleWorld] = useState(false);

  useEffect(() => {
    // Check if the user navigated from the root path (which has the BubbleWorld component)
    if (location.state && location.state.from === 'bubbleWorld') {
      setCameFromBubbleWorld(true);
    } else {
      // Default to assuming they came from feed
      setCameFromBubbleWorld(false);
    }
  }, [location]);

  // Fetch bubble details
  const { data: bubble, isLoading: bubbleLoading, error: bubbleError } = useQuery({
    queryKey: ['bubble', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Check if bubble has expired
  const isBubbleExpired = (expires_at: string | null) => {
    if (!expires_at) return false;
    return new Date(expires_at) < new Date();
  };

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['bubble-messages', id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .eq('bubble_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, // Realtime updates every 3 seconds
    enabled: !!id
  });

  // Reflect bubble
  const handleReflect = async () => {
    if (!id || !user) return;

    const username = profile?.username || user?.email || "";
    
    const { error } = await supabase
      .from('reflects')
      .insert({ 
        bubble_id: id,
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

    // Refresh bubble data
    queryClient.invalidateQueries({ queryKey: ['bubble', id] });
  };

  // Handle sending messages
  const handleSendMessage = async (content?: string) => {
    if (!id || !user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to send messages",
        variant: "destructive"
      });
      return;
    }

    // Check if bubble has expired
    if (bubble && isBubbleExpired(bubble.expires_at)) {
      toast({
        title: "Bubble has exploded",
        description: "This bubble has expired and cannot receive new messages",
        variant: "destructive"
      });
      return;
    }
    
    const messageContent = content || newMessage;
    if (!messageContent.trim()) return;

    const username = profile?.username || user?.email || "";

    const { error } = await supabase
      .from('bubble_messages')
      .insert({
        bubble_id: id,
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
    
    // Refresh messages
    queryClient.invalidateQueries({ queryKey: ['bubble-messages', id] });
  };

  // Format timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Setup realtime updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase.channel('chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bubble_messages',
          filter: `bubble_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bubble-messages', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // File upload handler
  const handleFileUpload = async (type: 'image' | 'video' | 'gif') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 
                  type === 'video' ? 'video/*' : 
                  'image/gif';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && id) {
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

  // Voice recording functionality
  const handleVoiceRecord = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    audioChunksRef.current = [];

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4;codecs=opus',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/ogg'
        ];

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
          mediaRecorderRef.current = new MediaRecorder(stream);
        }
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { 
              type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
            });
            
            console.log("Audio blob created:", audioBlob.size, "bytes, type:", audioBlob.type);
            
            const reader = new FileReader();
            reader.onload = async (e) => {
              const content = e.target?.result as string;
              console.log("Audio data URL created, length:", content.length);
              
              if (id) {
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
          } finally {
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setRecordingSeconds(0);
            if (recordingTimerRef.current) {
              window.clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
          }
        };

        mediaRecorderRef.current.start(100);
        setIsRecording(true);
        
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
        
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
      }
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio playback
  const togglePlayAudio = (messageId: string, audioSrc: string) => {
    console.log("Toggle audio playback for message:", messageId);
    
    try {
      if (!audioRefs.current[messageId]) {
        const audio = new Audio();
        audio.preload = 'auto';
        
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
        audio.pause();
        setPlayingAudioId(null);
      } else {
        if (playingAudioId && audioRefs.current[playingAudioId]) {
          audioRefs.current[playingAudioId].pause();
        }
        
        audio.src = audioSrc;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio playing successfully");
              setPlayingAudioId(messageId);
            })
            .catch(err => {
              console.error("Play error:", err);
              
              if (err.name === 'NotAllowedError') {
                toast({
                  title: "Playback Error",
                  description: "Click anywhere on the screen first, then try playing the audio again",
                });
                
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

  // Download media
  const handleDownloadMedia = (content: string, type: string) => {
    const link = document.createElement('a');
    link.href = content;
    link.download = `bubble-media-${Date.now()}.${type}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clean up on unmount
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

  // Redirect if bubble doesn't exist
  useEffect(() => {
    if (bubbleError) {
      toast({
        title: "Bubble not found",
        description: "The bubble you're looking for doesn't exist or has expired",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [bubbleError, navigate, toast]);
  
  // Get user avatar color
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

  // Check if current user is the message sender
  const isCurrentUser = (username: string) => {
    return username === profile?.username || username === user?.email;
  };

  if (bubbleLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#ebbd34]/10 border-t-[#ebbd34] rounded-full animate-spin"></div>
        <p className="text-[#ebbd34] ml-4">Loading bubble...</p>
      </div>
    );
  }

  if (!bubble) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] flex flex-col items-center justify-center p-4 text-center">
        <img 
          src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
          alt="Bubble not found" 
          className="w-20 h-20 opacity-40 mb-4"
        />
        <h2 className="text-2xl font-bold text-[#ebbd34] mb-2">Bubble not found</h2>
        <p className="text-[#ebbd34]/70 mb-6">The bubble you're looking for has popped or doesn't exist.</p>
        <Link to="/">
          <Button className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return home
          </Button>
        </Link>
      </div>
    );
  }

  const expired = isBubbleExpired(bubble.expires_at);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      {/* Header with yellow theme matching Feed page */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Back button and title */}
            <div className="flex items-center gap-6 flex-1">
              <Link to={cameFromBubbleWorld ? "/" : "/feed"} className="flex items-center gap-2 shrink-0">
                <ArrowLeft className="text-[#ebbd34] w-5 h-5" />
                <span className="text-xl font-semibold text-[#ebbd34] hidden sm:inline">
                  {cameFromBubbleWorld ? "Back to Bubble World" : "Back to Feed"}
                </span>
              </Link>
            </div>

            {/* Bubble title in navbar */}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-semibold text-[#ebbd34]">
                {bubble.name}
              </h1>
              <p className="text-sm text-[#ebbd34]/70 hidden sm:block">{bubble.topic}</p>
            </div>

            {/* Reflect button */}
            <div className="flex-1 flex justify-end">
              <Button
                onClick={handleReflect}
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white rounded-full"
                size="sm"
                disabled={expired}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Reflect
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-8">
        {/* Bubble header with info */}
        <div className="relative w-full max-w-3xl mx-auto mb-6">
          {/* Bubble info card with gradient styling and round corners */}
          <div 
            className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#ffda7b]/90 to-[#ebbd34]/90 shadow-lg p-5"
            style={{
              boxShadow: '0 10px 30px rgba(235, 189, 52, 0.2), 0 0 80px rgba(235, 189, 52, 0.1)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">{bubble.name}</h2>
                <p className="text-white/80 text-sm">{bubble.topic}</p>
                
                <div className="flex items-center mt-3 space-x-3">
                  <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                    <Star className="w-3 h-3 text-white mr-1" />
                    <span className="text-xs text-white font-medium">
                      {bubble.reflect_count || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                    <span className="text-xs text-white font-medium">
                      {formatDate(bubble.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              
              {expired && (
                <div className="bg-red-600/80 text-white px-3 py-1 rounded-xl shadow-md rotate-[-15deg] transform">
                  <p className="font-bold text-sm">EXPLODED</p>
                </div>
              )}
            </div>
            
            {bubble.description && (
              <div className="mt-4 bg-white/20 rounded-xl p-3">
                <p className="text-white/90 text-sm">{bubble.description}</p>
                <p className="text-white/70 text-xs mt-1">by @{bubble.username.split('@')[0]}</p>
              </div>
            )}
          </div>
          
          {/* Overlapping highlight effects */}
          <div 
            className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/20 blur-xl -z-10"
          />
          <div 
            className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-white/10 blur-xl -z-10"
          />
        </div>
        
        {/* Expired Notice Banner */}
        {expired && (
          <div className="max-w-3xl mx-auto mb-4 bg-red-500/80 text-white py-2 text-center rounded-lg">
            <p className="font-medium">This bubble has exploded and can no longer receive messages.</p>
          </div>
        )}
    
        {/* Messages Container */}
        <div className="max-w-3xl mx-auto bg-white/50 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-[#ebbd34]/10">
          <ScrollArea className="h-[calc(100dvh-350px)]">
            <div className="space-y-4 px-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <MessageCircle className="w-10 h-10 text-[#ebbd34]/30 mb-2" />
                  <p className="text-[#ebbd34]/70">
                    {messagesLoading ? "Loading messages..." : "No messages yet. Be the first to chat!"}
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
                        <p>{message.content}</p>
                      )}
                      
                      <div className={`text-right mt-1 ${
                        isCurrentUser(message.username) ? "text-white/70" : "text-gray-500"
                      }`}>
                        <span className="text-xs">
                          {formatMessageTime(message.created_at)}
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
            </div>
          </ScrollArea>
        </div>
      </main>

      {/* Message Input - Fixed at bottom */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-[#ebbd34]/10 p-3">
        <div className="container max-w-3xl mx-auto">
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
              {!expired && (
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
              
              {expired ? (
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
      </div>
      
      {/* Animation keyframes for the waveform */}
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

export default BubbleChat;
