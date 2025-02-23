import { useState } from "react";
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

const topics = [
  { 
    id: "1", 
    topic: "Future of AI",
    username: "@techvisionary",
    name: "AI Research Hub",
    size: "lg" as const,
    description: "Exploring the frontiers of artificial intelligence",
    messages: []
  },
  { 
    id: "2", 
    topic: "Digital Art",
    username: "@artmaster",
    name: "Creative Space",
    size: "md" as const,
    description: "A space for digital artists to share and inspire",
    messages: []
  },
  { 
    id: "3", 
    topic: "World Travel",
    username: "@globetrotter",
    name: "Travel Stories",
    size: "sm" as const,
    description: "Share your adventures around the globe",
    messages: []
  }
];

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

  const handleCreateBubble = () => {
    if (!newBubble.name || !newBubble.topic) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const bubble = {
      id: (topics.length + 1).toString(),
      topic: newBubble.topic,
      username: newBubble.username,
      name: newBubble.name,
      size: "md" as const,
      description: newBubble.description,
      messages: []
    };

    topics.push(bubble);

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
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast({
          title: "File Selected",
          description: `${file.name} ready to upload`,
        });
        // Here you would typically handle the file upload
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

  const selectedBubble = topics.find(topic => topic.id === selectedBubbleId);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedBubbleId) return;

    const bubbleIndex = topics.findIndex(topic => topic.id === selectedBubbleId);
    if (bubbleIndex === -1) return;

    const newMsg = {
      id: Date.now().toString(),
      content: newMessage,
      username: "@user",
      timestamp: new Date().toISOString()
    };

    topics[bubbleIndex].messages = [...topics[bubbleIndex].messages, newMsg];
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
            topics={topics}
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
            {selectedBubble?.messages.map((message) => (
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
