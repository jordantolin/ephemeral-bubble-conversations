
import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { connectionUtils } from "@/integrations/supabase/client";

interface BubbleWorldHeaderProps {
  onCreateBubble: () => void;
}

const BubbleWorldHeader: React.FC<BubbleWorldHeaderProps> = ({ onCreateBubble }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreateClick = async () => {
    if (connectionUtils.isOffline()) {
      toast({
        title: "You're offline",
        description: "Please check your internet connection and try again",
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create a bubble",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await connectionUtils.retryOperation(async () => {
        onCreateBubble();
      });
    } catch (error) {
      toast({
        title: "Connection issue",
        description: "Unable to create a bubble. Please try again later.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#ebbd34]">
          Bubble World
        </h1>
        <p className="text-gray-600 mt-1">
          Join conversations that only last 24 hours
        </p>
      </div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button 
          onClick={handleCreateClick}
          className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Create New Bubble
        </Button>
      </motion.div>
    </div>
  );
};

export default BubbleWorldHeader;
