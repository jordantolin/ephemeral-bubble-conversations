
import MainNav from "@/components/MainNav";
import FloatingBubble from "@/components/FloatingBubble";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const topics = [
  { id: "1", topic: "AI & Future", size: "lg" as const, delay: "1" as const },
  { id: "2", topic: "Art & Design", size: "md" as const, delay: "2" as const },
  { id: "3", topic: "Travel", size: "sm" as const, delay: "3" as const },
  { id: "4", topic: "Music", size: "md" as const, delay: "1" as const },
  { id: "5", topic: "Technology", size: "lg" as const, delay: "2" as const },
  { id: "6", topic: "Books", size: "sm" as const, delay: "3" as const },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background overflow-hidden">
      <MainNav />
      
      <main className="container mx-auto px-4 pt-24 pb-12 relative min-h-[80vh]">
        <div className="text-center mb-12">
          <img 
            src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
            alt="Bubble Trouble"
            className="w-24 h-24 mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-primary">
            Welcome to Bubble Trouble
          </h1>
          <p className="mt-2 text-muted-foreground">
            Join ephemeral conversations that matter
          </p>
          <Button className="mt-6 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Bubble</span>
          </Button>
        </div>

        <div className="relative w-full h-[60vh]">
          {topics.map((topic) => (
            <FloatingBubble
              key={topic.id}
              {...topic}
            />
          ))}
        </div>
      </main>

      <footer className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>Join the ephemeral interaction revolution!</p>
      </footer>
    </div>
  );
};

export default Index;
