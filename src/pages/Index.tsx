import { useState, useEffect } from "react";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, User, TrendingUp, Sparkles, Plus, Send, Image, Video, Mic, SmilePlus, Heart, Star } from "lucide-react";
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

const Index = () => {
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBubble, setNewBubble] = useState({
    name: "",
    description: "",
    topic: "",
    username: "@user"
  });
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();

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

    const newBubbleData = {
      name: newBubble.name,
      topic: newBubble.topic,
      description: newBubble.description,
      username: newBubble.username,
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

    setNewBubble({ name: "", description: "", topic: "", username: "@user" });
  };

  const handleReflect = async (bubbleId: string) => {
    const { error } = await supabase
      .from('reflects')
      .insert({ 
        bubble_id: bubbleId,
        username: "@user" 
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

  const handleFileUpload = (type: 'image' | 'video' | 'gif') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 
                   type === 'video' ? 'video/*' : 
                   'image/gif';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast({
          title: "File Selected",
          description: `${file.name} ready to upload`,
        });
        // Here you would typically handle the file upload to Supabase Storage
      }
    };
    input.click();
  };

  const handleVoiceRecord = () => {
    toast({
      title: "Voice Recording",
      description: "Voice recording feature coming soon!",
    });
  };

  const selectedBubble = bubbles.find(bubble => bubble.id === selectedBubbleId);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedBubbleId) return;

    const { error } = await supabase
      .from('bubble_messages')
      .insert({
        bubble_id: selectedBubbleId,
        content: newMessage,
        username: "@user"
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
    queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });

    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully",
    });
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

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] font-montserrat">
      {/* New Refined Navigation */}
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
      
      <main className="flex flex-col items-center justify-start w-full min-h-[calc(100dvh-64px)] pt-28 sm:pt-20">
        <div className="text-center mb-6 px-4">
          <h1 className="text-3xl sm:text-4xl font-light text-[#ebbd34]">
            Bubble Trouble
          </h1>
          <div className="h-px w-24 sm:w-32 bg-[#ebbd34]/20 mx-auto mt-3" />
        </div>

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
        <DialogContent className="sm:max-w-[600px] h-[80vh] sm:h-[700px] flex flex-col p-0 border-none bg-[#FEF7E4] rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between p-4 border-b border-[#ebbd34]/10">
            <div>
              <DialogTitle className="text-[#ebbd34] text-xl">{selectedBubble?.name}</DialogTitle>
              <DialogDescription className="text-[#ebbd34]/70">
                {selectedBubble?.description}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="ml-4 hover:text-[#ebbd34] transition-colors border-[#ebbd34]/20"
              onClick={() => selectedBubble && handleReflect(selectedBubble.id)}
            >
              <Star className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 py-3 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${
                  message.username === "@user" ? "items-end" : "items-start"
                }`}
              >
                <div className={`max-w-[80%] rounded-2xl p-3 ${
                  message.username === "@user"
                    ? "bg-[#ebbd34] text-white"
                    : "bg-[#ebbd34]/10 text-[#ebbd34]"
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
                <span className="text-xs text-[#ebbd34]/50 mt-1">
                  {message.username} • {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </ScrollArea>

          <div className="flex flex-col gap-2 p-4 border-t border-[#ebbd34]/10 bg-[#FEF7E4]">
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 border-[#ebbd34]/20 text-[#ebbd34] hover:text-[#ebbd34]/70"
                onClick={() => handleFileUpload('image')}
              >
                <Image className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 border-[#ebbd34]/20 text-[#ebbd34] hover:text-[#ebbd34]/70"
                onClick={() => handleFileUpload('video')}
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 border-[#ebbd34]/20 text-[#ebbd34] hover:text-[#ebbd34]/70"
                onClick={() => handleFileUpload('gif')}
              >
                <SmilePlus className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 border-[#ebbd34]/20 text-[#ebbd34] hover:text-[#ebbd34]/70"
                onClick={handleVoiceRecord}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
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
                className="flex-1 bg-[#ebbd34]/5 border-[#ebbd34]/20 text-[#ebbd34] placeholder-[#ebbd34]/50"
              />
              <Button 
                onClick={handleSendMessage} 
                size="icon" 
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
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
