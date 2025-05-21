
import { useState } from "react";
import { MessageCircle, Image, Video, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FloatingBubbleProps {
  id: string;
  topic: string;
  size?: "sm" | "md" | "lg";
  delay?: "1" | "2" | "3";
  position?: { x: number; y: number };
}

const FloatingBubble = ({ topic, size = "md", delay, position }: FloatingBubbleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-40 h-40",
  };

  return (
    <>
      <button
        className={`bubble gentle-float ${sizeClasses[size]} flex items-center justify-center cursor-pointer overflow-hidden`}
        style={{
          position: "absolute",
          left: `${position?.x ?? Math.random() * 60}%`,
          top: `${position?.y ?? Math.random() * 60}%`,
        }}
        onClick={() => setIsOpen(true)}
      >
        <p className="text-sm font-medium text-center">{topic}</p>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{topic}</DialogTitle>
          </DialogHeader>
          
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {/* Sample messages */}
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 glass rounded-2xl p-3">
                <p className="text-sm">Welcome to the bubble! Share your thoughts...</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Image className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Mic className="w-5 h-5" />
              </Button>
              
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-full bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              
              <Button size="icon">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingBubble;
