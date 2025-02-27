
import { useState, useEffect, useRef } from "react";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, User, TrendingUp, Sparkles, Plus, Send, Image, Video, Mic, SmilePlus, Star, LogIn } from "lucide-react";
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
import { useUser } from "@/context/UserContext";

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

const Index = () => {
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBubble, setNewBubble] = useState({
    name: "",
    description: "",
    topic: "",
  });
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();

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

      return data;
    },
    refetchInterval: 60000 // Refetch every minute to check for expired bubbles
  });

  const handleCreateBubble = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a bubble",
        variant: "destructive"
      });
      navigate("/auth");
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

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const newBubbleData = {
      name: newBubble.name,
      topic: newBubble.topic,
      description: newBubble.description,
      username: user.id,
      size: "sm" as const,
      reflect_count: 0,
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

    setNewBubble({ name: "", description: "", topic: "" });
    
    // Refresh bubbles list
    queryClient.invalidateQueries({ queryKey: ['bubbles'] });
  };

  const handleFileUpload = async (type: 'image' | 'video' | 'gif') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to send messages",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

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

  const handleVoiceRecord = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to send messages",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    let mediaRecorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            if (selectedBubbleId) {
              await handleSendMessage(content);
            }
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        
        toast({
          title: "Recording...",
          description: "Click again to stop recording",
        });

        // Stop recording after 1 minute
        setTimeout(() => {
          if (mediaRecorder?.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 60000);
      })
      .catch(error => {
        toast({
          title: "Error",
          description: "Could not access microphone",
          variant: "destructive"
        });
      });
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
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to send messages",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    if (!selectedBubbleId) return;
    
    const messageContent = content || newMessage;
    if (!messageContent.trim()) return;

    const { error } = await supabase
      .from('bubble_messages')
      .insert({
        bubble_id: selectedBubbleId,
        content: messageContent,
        username: user.id
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
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to reflect bubbles",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from('reflects')
      .insert({ 
        bubble_id: bubbleId,
        username: user.id 
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
    queryClient.invalidateQueries({ queryKey: ['reflectedBubbles'] });
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
          queryClient.invalidateQueries({ queryKey: ['reflectedBubbles'] });
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

  // Check if the current user has already reflected this bubble
  const { data: hasReflected } = useQuery({
    queryKey: ['hasReflected', selectedBubbleId, user?.id],
    queryFn: async () => {
      if (!selectedBubbleId || !user) return false;

      const { data, error } = await supabase
        .from('reflects')
        .select('*')
        .eq('bubble_id', selectedBubbleId)
        .eq('username', user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking reflection status:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!selectedBubbleId && !!user
  });

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
                <Link 
                  to="/profile" 
                  className="p-2 hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34] transition-colors"
                >
                  <User className="w-5 h-5" />
                </Link>
              ) : (
                <Link 
                  to="/auth" 
                  className="flex items-center gap-1 px-2 sm:px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
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
        {/* New section - Bubble World heading */}
        <div className="w-full max-w-4xl text-center mb-6 px-4">
          <h2 className="text-3xl font-bold text-[#ebbd34]">Bubble World</h2>
          <p className="text-[#ebbd34]/80 mt-2">Explore bubbles made in the last 24 hours</p>
          <div className="h-1 w-16 bg-[#ebbd34] mx-auto mt-3 rounded-full"></div>
        </div>
        
        <div className="w-full h-[calc(100dvh-180px)] sm:w-[90%] sm:h-[700px] sm:max-w-4xl relative sm:rounded-3xl overflow-hidden bg-[#FEF7E4]/50 backdrop-blur-sm sm:shadow-xl sm:border sm:border-[#ebbd34]/10">
          <BubbleWorld 
            topics={bubbles}
            onBubbleClick={handleBubbleClick}
          />
        </div>

        <Button
          onClick={() => user ? setIsCreateDialogOpen(true) : navigate("/auth")}
          className="fixed bottom-6 right-6 z-50 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-lg rounded-full w-14 h-14 p-0 sm:static sm:w-auto sm:h-auto sm:p-4 sm:mt-8 sm:rounded-lg"
          size="icon"
        >
          <Plus className="w-7 h-7 sm:w-5 sm:h-5 sm:mr-2" />
          <span className="hidden sm:inline">Create Bubble</span>
        </Button>
      </main>

            {/* Chat Dialog */}
            <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
              <DialogContent className="sm:max-w-[600px] h-[80vh] sm:h-[700px] flex flex-col p-0 border-none bg-[#FEF7E4] rounded-[2rem] overflow-hidden shadow-2xl">
                <DialogHeader className="flex flex-row items-center justify-between p-4 border-b border-[#ebbd34]/10 bg-gradient-to-r from-[#ebbd34]/5 to-[#ebbd34]/10">
                  <div>
                    <DialogTitle className="text-[#ebbd34] text-xl">{selectedBubble?.name}</DialogTitle>
                    <DialogDescription className="text-[#ebbd34]/70">
                      {selectedBubble?.description}
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`ml-4 hover:bg-[#ebbd34]/10 transition-colors border-[#ebbd34]/20 ${hasReflected ? 'bg-[#ebbd34]/20 text-[#ebbd34]' : 'text-[#ebbd34]'}`}
                    onClick={() => selectedBubbleId && handleReflect(selectedBubbleId)}
                    disabled={hasReflected}
                    title={hasReflected ? "Already reflected" : "Reflect this bubble"}
                  >
                    <Sparkles className="h-5 w-5" />
                  </Button>
                </DialogHeader>

                <ScrollArea className="flex-1 px-4 py-3 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col ${
                        message.username === user?.id ? "items-end" : "items-start"
                      }`}
                    >
                      <div className={`max-w-[80%] rounded-3xl p-3 ${
                        message.username === user?.id
                          ? "bg-[#ebbd34] text-white"
                          : "bg-[#ebbd34]/10 text-[#ebbd34]"
                      }`}>
                        {message.content.startsWith('data:image/') ? (
                          <img 
                            src={message.content} 
                            alt="Shared image" 
                            className="rounded-2xl max-w-full"
                          />
                        ) : message.content.startsWith('data:video/') ? (
                          <video 
                            src={message.content} 
                            controls 
                            className="rounded-2xl max-w-full"
                          />
                        ) : message.content.startsWith('data:audio/') ? (
                          <audio 
                            src={message.content} 
                            controls 
                            className="w-full rounded-full bg-[#ebbd34]/5 p-2"
                          />
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                      </div>
                      <span className="text-xs text-[#ebbd34]/50 mt-1 px-2">
                        {message.username === user?.id ? "You" : message.username} • {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </ScrollArea>

                <div className="flex flex-col gap-2 p-4 bg-gradient-to-b from-transparent to-[#ebbd34]/5 border-t border-[#ebbd34]/10">
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="shrink-0 rounded-full border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/10"
                      onClick={() => handleFileUpload('image')}
                    >
                      <Image className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="shrink-0 rounded-full border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/10"
                      onClick={() => handleFileUpload('video')}
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="shrink-0 rounded-full border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/10"
                      onClick={() => handleFileUpload('gif')}
                    >
                      <SmilePlus className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="shrink-0 rounded-full border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/10"
                      onClick={handleVoiceRecord}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={user ? "Type your message..." : "Sign in to chat"}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={!user}
                      className="flex-1 rounded-full bg-[#ebbd34]/5 border-[#ebbd34]/20 text-[#ebbd34] placeholder-[#ebbd34]/50 focus-visible:ring-[#ebbd34]/20"
                    />
                    <Button 
                      onClick={() => handleSendMessage()}
                      size="icon" 
                      disabled={!user || !newMessage.trim()}
                      className="rounded-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white disabled:bg-[#ebbd34]/30"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
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
    </div>
  );
};

export default Index;
