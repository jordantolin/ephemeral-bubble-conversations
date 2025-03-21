
import { useState } from "react";
import { MessageCircle, Timer, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BubbleProps {
  id: string;
  title: string;
  description: string;
  timeLeft: string;
  participants: number;
  reflects: number;
  isExploding?: boolean;
  onClick?: () => void;
}

const Bubble = ({ 
  title, 
  description, 
  timeLeft, 
  participants, 
  reflects, 
  isExploding,
  onClick 
}: BubbleProps) => {
  const [isReflected, setIsReflected] = useState(false);

  return (
    <Card 
      className={`bubble overflow-hidden group hover:scale-[1.02] transition-all duration-300 ${
        isExploding ? 'scale-110 opacity-0 transition-all duration-500' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full ${
              isReflected ? "text-primary bg-primary/10" : "text-muted-foreground"
            }`}
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the card's onClick
              setIsReflected(!isReflected);
            }}
          >
            <Star className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Timer className="w-4 h-4 mr-1" />
            <span>{timeLeft}</span>
          </div>
          <div className="flex items-center">
            <MessageCircle className="w-4 h-4 mr-1" />
            <span>{participants}</span>
          </div>
          <div className="flex items-center">
            <Star className="w-4 h-4 mr-1" />
            <span>{reflects}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full group-hover:bg-primary/90">Join Bubble</Button>
      </CardFooter>
    </Card>
  );
};

export default Bubble;
