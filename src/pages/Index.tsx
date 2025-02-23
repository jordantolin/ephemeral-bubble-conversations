
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

const topics = [
  { 
    id: "1", 
    topic: "Future of AI",
    username: "@techvisionary",
    name: "AI Research Hub",
    size: "lg" as const 
  },
  { 
    id: "2", 
    topic: "Digital Art",
    username: "@artmaster",
    name: "Creative Space",
    size: "md" as const 
  },
  { 
    id: "3", 
    topic: "World Travel",
    username: "@globetrotter",
    name: "Travel Stories",
    size: "sm" as const 
  },
  { 
    id: "4", 
    topic: "Indie Music",
    username: "@soundwave",
    name: "Music Lab",
    size: "md" as const 
  },
  { 
    id: "5", 
    topic: "Web3 Tech",
    username: "@cryptonaut",
    name: "Blockchain Hub",
    size: "lg" as const 
  },
  { 
    id: "6", 
    topic: "Book Club",
    username: "@bookworm",
    name: "Reading Corner",
    size: "sm" as const 
  }
];

const Index = () => {
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBubble, setNewBubble] = useState({
    topic: "",
    username: "",
    name: ""
  });
  const { toast } = useToast();

  const handleCreateBubble = () => {
    if (!newBubble.topic || !newBubble.username || !newBubble.name) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to create a bubble",
        variant: "destructive"
      });
      return;
    }

    // Here you would typically add the new bubble to your state/database
    topics.push({
      id: (topics.length + 1).toString(),
      ...newBubble,
      size: "md"
    });

    toast({
      title: "Success!",
      description: "New bubble created successfully",
    });

    setNewBubble({ topic: "", username: "", name: "" });
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
          className="mt-4 sm:mt-8 relative z-10 glass hover:shadow-xl transform transition-all duration-300 hover:scale-105 hover:bg-primary/20"
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
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={newBubble.topic}
                onChange={(e) => setNewBubble({ ...newBubble, topic: e.target.value })}
                placeholder="Enter bubble topic..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newBubble.username}
                onChange={(e) => setNewBubble({ ...newBubble, username: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Bubble Name</Label>
              <Input
                id="name"
                value={newBubble.name}
                onChange={(e) => setNewBubble({ ...newBubble, name: e.target.value })}
                placeholder="Enter bubble name..."
              />
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
