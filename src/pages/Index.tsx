
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
  { id: "1", topic: "AI & Future", size: "lg" as const },
  { id: "2", topic: "Art & Design", size: "md" as const },
  { id: "3", topic: "Travel", size: "sm" as const },
  { id: "4", topic: "Music", size: "md" as const },
  { id: "5", topic: "Technology", size: "lg" as const },
  { id: "6", topic: "Books", size: "sm" as const },
];

const Index = () => {
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const selectedBubble = topics.find(t => t.id === selectedBubbleId);

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <MainNav />
      
      <main className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-primary mb-2">
            Welcome to Bubble Trouble
          </h1>
          <div className="h-px w-24 bg-primary/20 mx-auto" />
        </div>

        <div className="relative w-full max-w-4xl aspect-square rounded-lg overflow-hidden border border-primary/5 bg-white/50 backdrop-blur-sm">
          <BubbleWorld 
            topics={topics}
            onBubbleClick={(id) => setSelectedBubbleId(id)}
          />
        </div>

        <Button className="mt-8 flex items-center space-x-2 bg-white/80 hover:bg-white text-primary border border-primary/20">
          <Plus className="w-4 h-4" />
          <span>Create Bubble</span>
        </Button>
      </main>

      {selectedBubble && (
        <Dialog open={!!selectedBubbleId} onOpenChange={() => setSelectedBubbleId(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedBubble.topic}</DialogTitle>
            </DialogHeader>
            
            <div className="h-[400px] overflow-y-auto p-4 space-y-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 glass rounded-2xl p-3">
                  <p className="text-sm">Welcome to the bubble! Share your thoughts...</p>
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
      )}
    </div>
  );
};

export default Index;
