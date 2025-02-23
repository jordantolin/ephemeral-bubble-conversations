
import { useState } from "react";
import MainNav from "@/components/MainNav";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    description: "Exploring the frontiers of artificial intelligence"
  },
  { 
    id: "2", 
    topic: "Digital Art",
    username: "@artmaster",
    name: "Creative Space",
    size: "md" as const,
    description: "A space for digital artists to share and inspire"
  },
  { 
    id: "3", 
    topic: "World Travel",
    username: "@globetrotter",
    name: "Travel Stories",
    size: "sm" as const,
    description: "Share your adventures around the globe"
  }
];

const Index = () => {
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBubble, setNewBubble] = useState({
    name: "",
    description: "",
    topic: "",
    username: "@user"
  });
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
      description: newBubble.description
    };

    topics.push(bubble);

    toast({
      title: "Success!",
      description: "New bubble created successfully",
    });

    setNewBubble({ name: "", description: "", topic: "", username: "@user" });
    setIsCreateDialogOpen(false);
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
            onBubbleClick={(id) => setSelectedBubbleId(id)}
          />
        </div>

        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="mt-4 sm:mt-8 relative z-10 glass hover:shadow-xl transform transition-all duration-300 hover:scale-105"
          variant="outline"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span>Create Bubble</span>
        </Button>
      </main>

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
    </div>
  );
};

export default Index;
