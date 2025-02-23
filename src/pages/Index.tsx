
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
} from "@/components/ui/dialog";

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
  const selectedBubble = topics.find(t => t.id === selectedBubbleId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <MainNav />
      
      <main className="container relative mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-4xl font-light text-primary mb-2">
            Welcome to Bubble Trouble
          </h1>
          <div className="h-px w-24 bg-primary/20 mx-auto" />
        </div>

        <div className="relative w-full h-[600px] max-w-3xl rounded-2xl overflow-hidden bg-transparent">
          <BubbleWorld 
            topics={topics}
            onBubbleClick={(id) => setSelectedBubbleId(id)}
          />
        </div>

        <Button className="mt-8 relative z-10 flex items-center space-x-2 bg-white/80 hover:bg-white text-primary border border-primary/20">
          <Plus className="w-4 h-4" />
          <span>Create Bubble</span>
        </Button>
      </main>

      <Dialog open={!!selectedBubbleId} onOpenChange={() => setSelectedBubbleId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedBubble?.name} - {selectedBubble?.topic}
            </DialogTitle>
          </DialogHeader>
          
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 glass rounded-2xl p-3">
                <p className="text-sm font-medium mb-1">{selectedBubble?.username}</p>
                <p className="text-sm">Welcome to {selectedBubble?.name}! Share your thoughts...</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full px-4 py-2 rounded-full bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
