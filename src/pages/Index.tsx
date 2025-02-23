
import MainNav from "@/components/MainNav";
import Bubble from "@/components/Bubble";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const mockBubbles = [
  {
    id: "1",
    title: "Tech Enthusiasts Hub",
    description: "Discussing the latest in AI and machine learning",
    timeLeft: "2h left",
    participants: 24,
    reflects: 12,
  },
  {
    id: "2",
    title: "Creative Corner",
    description: "Share your latest artistic projects and get feedback",
    timeLeft: "45m left",
    participants: 15,
    reflects: 8,
  },
  {
    id: "3",
    title: "Travel Tales",
    description: "Exchange travel stories and tips from around the world",
    timeLeft: "3h left",
    participants: 32,
    reflects: 18,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary/20">
      <MainNav />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Discover Bubbles
            </h1>
            <p className="mt-2 text-muted-foreground">
              Join ephemeral conversations that matter
            </p>
          </div>
          
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Bubble</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockBubbles.map((bubble) => (
            <Bubble key={bubble.id} {...bubble} />
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
