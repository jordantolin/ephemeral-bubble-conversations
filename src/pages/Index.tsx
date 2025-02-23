
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
  "Tecnologia",
  "Arte",
  "Musica",
  "Viaggi",
  "Sport",
  "Cucina",
  "Cinema",
  "Letteratura",
  "Scienza",
  "Gaming"
];

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
    name: "",
    description: "",
    topic: "",
    username: "@user" // Default value
  });
  const { toast } = useToast();

  const handleCreateBubble = () => {
    if (!newBubble.name || !newBubble.description || !newBubble.topic) {
      toast({
        title: "Campi mancanti",
        description: "Per favore compila tutti i campi richiesti",
        variant: "destructive"
      });
      return;
    }

    topics.push({
      id: (topics.length + 1).toString(),
      topic: newBubble.topic,
      username: newBubble.username,
      name: newBubble.name,
      size: "md"
    });

    toast({
      title: "Bolla creata!",
      description: "La tua bolla è stata creata con successo",
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
          className="mt-4 sm:mt-8 relative z-10 bg-[#FFE566] hover:bg-[#FFD700] text-primary-foreground shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 border-none"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span>Crea Bolla</span>
        </Button>
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#FFFDF7]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-primary">Crea Nuova Bolla</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Aggiungi una nuova bolla al tuo universo digitale
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome Bolla
              </Label>
              <Input
                id="name"
                value={newBubble.name}
                onChange={(e) => setNewBubble({ ...newBubble, name: e.target.value })}
                placeholder="Inserisci il nome della bolla..."
                className="bg-white/50 border-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Descrizione Bolla
              </Label>
              <Textarea
                id="description"
                value={newBubble.description}
                onChange={(e) => setNewBubble({ ...newBubble, description: e.target.value })}
                placeholder="Descrivi la tua bolla..."
                className="bg-white/50 border-primary/20 focus:border-primary min-h-[100px] resize-none"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="topic" className="text-sm font-medium">
                Topic
              </Label>
              <Select
                value={newBubble.topic}
                onValueChange={(value) => setNewBubble({ ...newBubble, topic: value })}
              >
                <SelectTrigger className="bg-white/50 border-primary/20 focus:border-primary">
                  <SelectValue placeholder="Seleziona un topic" />
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

          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-primary/20 hover:bg-primary/5"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              onClick={handleCreateBubble}
              className="bg-[#FFE566] hover:bg-[#FFD700] text-primary-foreground border-none"
            >
              Crea Bolla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
