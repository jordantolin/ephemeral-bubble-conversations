import { useState, useEffect } from "react";
import MainNav from "@/components/MainNav";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { Plus, Send, Image, Video, Mic, SmilePlus, Heart, Star } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] to-[#222222]">
      <MainNav />
      
      <main className="container relative mx-auto px-2 sm:px-4 py-4 pt-20 sm:py-8 flex flex-col items-center justify-center min-h-[calc(100dvh-64px)]">
        <div className="text-center mb-4 sm:mb-8 relative z-10">
          <h1 className="text-3xl sm:text-4xl font-light text-white mb-2 px-4">
            Bubble Trouble
          </h1>
          <div className="h-px w-24 bg-white/20 mx-auto" />
        </div>

        <div className="relative w-full h-[calc(100dvh-220px)] sm:h-[600px] max-w-3xl rounded-2xl overflow-hidden bg-[#1A1F2C]/50 backdrop-blur-sm shadow-xl">
          <BubbleWorld 
            topics={bubbles}
            onBubbleClick={handleBubbleClick}
          />
        </div>

        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="fixed bottom-8 right-8 z-50 bg-white hover:bg-white/90 text-[#1A1F2C] transform transition-all duration-300 hover:scale-105 shadow-lg rounded-full w-16 h-16 p-0 sm:static sm:w-auto sm:h-auto sm:p-4 sm:mt-8"
          size="icon"
        >
          <Plus className="w-8 h-8 sm:w-5 sm:h-5 sm:mr-2" />
          <span className="hidden sm:inline">Create Bubble</span>
        </Button>
      </main>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[500px] h-[80vh] sm:h-[600px] flex flex-col p-0 border-none bg-[#1A1F2C]">
          <DialogHeader className="flex flex-row items-center justify-between p-4 border-b border-white/10">
            <div>
              <DialogTitle className="text-white text-xl">{selectedBubble?.name}</DialogTitle>
              <DialogDescription className="text-white/70">
                {selectedBubble?.description}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="ml-4 hover:text-white transition-colors border-white/20"
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
                    ? "bg-white text-[#1A1F2C]"
                    : "bg-white/10 text-white"
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
                <span className="text-xs text-white/50 mt-1">
                  {message.username} • {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </ScrollArea>

          <div className="flex flex-col gap-2 p-4 border-t border-white/10 bg-[#1A1F2C]">
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 border-white/20 text-white hover:text-white/70"
                onClick={() => handleFileUpload('image')}
              >
                <Image className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 border-white/20 text-white hover:text-white/70"
                onClick={() => handleFileUpload('video')}
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 border-white/20 text-white hover:text-white/70"
                onClick={() => handleFileUpload('gif')}
              >
                <SmilePlus className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 border-white/20 text-white hover:text-white/70"
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
                className="flex-1 bg-white/5 border-white/20 text-white placeholder-white/50"
              />
              <Button 
                onClick={handleSendMessage} 
                size="icon" 
                className="bg-white hover:bg-white/90 text-[#1A1F2C]"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Bubble Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#1A1F2C] border-none">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Create New Bubble</DialogTitle>
            <DialogDescription className="text-white/70">
              Choose a topic and name for your new bubble community.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topic" className="text-white">Topic</Label>
              <Select
                value={newBubble.topic}
                onValueChange={(value) => setNewBubble({ ...newBubble, topic: value })}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-white/20">
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic} value={topic} className="text-white">
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name" className="text-white">Bubble Name</Label>
              <Input
                id="name"
                value={newBubble.name}
                onChange={(e) => setNewBubble({ ...newBubble, name: e.target.value })}
                placeholder="Give your bubble a name..."
                className="bg-white/5 border-white/20 text-white placeholder-white/50"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={newBubble.description}
                onChange={(e) => setNewBubble({ ...newBubble, description: e.target.value })}
                placeholder="What's your bubble about?"
                className="bg-white/5 border-white/20 text-white placeholder-white/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-white/20 text-white hover:text-white/70"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBubble}
              className="bg-white hover:bg-white/90 text-[#1A1F2C]"
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
