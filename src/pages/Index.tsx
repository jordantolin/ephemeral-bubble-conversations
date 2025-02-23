
import { useState, useEffect } from "react";
import MainNav from "@/components/MainNav";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { Plus, Send, Image, Video, Mic, SmilePlus } from "lucide-react";
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
  "Technology",
  "Art",
  "Music",
  "Travel",
  "Sports",
  "Cooking",
  "Movies",
  "Literature",
  "Science",
  "Gaming"
];

interface Bubble {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: "sm" | "md" | "lg";
  description: string;
  messages: Message[];
}

interface Message {
  id: string;
  content: string;
  username: string;
  timestamp: string;
}

// Type guard to check if size is valid
const isValidSize = (size: string): size is "sm" | "md" | "lg" => {
  return ["sm", "md", "lg"].includes(size);
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

  // Fetch bubbles
  const { data: bubbles = [] } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bubbles')
        .select('*');
      
      if (error) {
        toast({
          title: "Error fetching bubbles",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }

      // Transform and validate the data to match the expected types
      return data.map(bubble => ({
        id: bubble.id,
        topic: bubble.topic,
        username: bubble.username,
        name: bubble.name,
        // Ensure size is one of the valid options, default to "md" if invalid
        size: isValidSize(bubble.size) ? bubble.size : "md",
        description: bubble.description || "",
        messages: []
      })) as Bubble[];
    }
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

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bubble_messages'
        },
        (payload) => {
          // Refresh messages when there's a change
          queryClient.invalidateQueries({
            queryKey: ['messages', selectedBubbleId]
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBubbleId, queryClient]);

  const handleCreateBubble = async () => {
    if (!newBubble.name || !newBubble.topic) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('bubbles')
      .insert({
        name: newBubble.name,
        topic: newBubble.topic,
        description: newBubble.description,
        username: newBubble.username,
        size: "md" as const // Explicitly type as "md"
      });

    if (error) {
      toast({
        title: "Error creating bubble",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['bubbles'] });
    toast({
      title: "Success!",
      description: "New bubble created successfully",
    });

    setNewBubble({ name: "", description: "", topic: "", username: "@user" });
    setIsCreateDialogOpen(false);
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
    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully",
    });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <MainNav />
      
      <main className="container relative mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center min-h-[calc(100dvh-64px)]">
        <div className="text-center mb-4 sm:mb-8 relative z-10">
          <h1 className="text-2xl sm:text-4xl font-light text-primary mb-2">
            Welcome to Bubble Trouble
          </h1>
          <div className="h-px w-24 bg-primary/20 mx-auto" />
        </div>

        <div className="relative w-full h-[calc(100dvh-240px)] sm:h-[600px] max-w-3xl rounded-2xl overflow-hidden bg-transparent">
          <BubbleWorld 
            topics={bubbles}
            onBubbleClick={handleBubbleClick}
          />
        </div>

        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="mt-4 sm:mt-8 relative z-10 bg-[#FFE566] hover:bg-[#FFD700] text-primary-foreground transform transition-all duration-300 hover:scale-105"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span>Create Bubble</span>
        </Button>
      </main>

      {/* Create Bubble Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Bubble</DialogTitle>
            <DialogDescription>
              Add your bubble to the universe. Fill in the details below.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Bubble Name</Label>
              <Input
                id="name"
                value={newBubble.name}
                onChange={(e) => setNewBubble({ ...newBubble, name: e.target.value })}
                placeholder="Enter bubble name..."
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newBubble.description}
                onChange={(e) => setNewBubble({ ...newBubble, description: e.target.value })}
                placeholder="Describe your bubble..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="topic">Topic</Label>
              <Select
                value={newBubble.topic}
                onValueChange={(value) => setNewBubble({ ...newBubble, topic: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBubble}>
              Create Bubble
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedBubble?.name}</DialogTitle>
            <DialogDescription>
              {selectedBubble?.description}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 py-3 space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${
                  message.username === "@user" ? "items-end" : "items-start"
                }`}
              >
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.username === "@user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {message.username} • {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </ScrollArea>

          <div className="flex flex-col gap-2 p-4 border-t">
            <div className="flex gap-2 mb-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleFileUpload('image')}
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleFileUpload('video')}
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleFileUpload('gif')}
              >
                <SmilePlus className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleVoiceRecord}
              >
                <Mic className="h-4 w-4" />
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
                className="flex-1"
              />
              <Button onClick={handleSendMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
