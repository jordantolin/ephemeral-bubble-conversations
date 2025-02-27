
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BubbleData } from '@/types/bubble';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useBubbleInteraction } from '@/hooks/useBubbleInteraction';
import { Sparkles, MessageCircle, Share2 } from 'lucide-react';

interface BubbleContentProps {
  bubble: BubbleData;
  isActive: boolean;
}

const BubbleContent = ({ bubble, isActive }: BubbleContentProps) => {
  const { reflectBubble, isReflected, reflectCount } = useBubbleInteraction(bubble.id);
  const [animateIn, setAnimateIn] = useState(false);
  
  // Handle entrance animation when bubble becomes active
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setAnimateIn(true), 100);
      return () => {
        clearTimeout(timer);
        setAnimateIn(false);
      };
    }
  }, [isActive]);
  
  if (!isActive) return null;
  
  return (
    <div className="h-full w-full flex flex-col justify-between p-6 relative">
      {/* Gradient overlays for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
      
      {/* Content container with entrance animations */}
      <motion.div 
        className="z-10 mt-16 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: animateIn ? 1 : 0, y: animateIn ? 0 : 20 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-4"
        >
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-md">
            {bubble.name}
          </h1>
          <p className="text-white/80 text-lg font-medium drop-shadow-md">
            #{bubble.topic}
          </p>
        </motion.div>
        
        {/* User and description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center gap-3 mb-4"
        >
          <Avatar className="w-10 h-10 border-2 border-white/20">
            <AvatarFallback className="bg-[#ebbd34] text-white">
              {bubble.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-medium">@{bubble.username}</p>
            <p className="text-white/60 text-sm">
              {reflectCount} reflections
            </p>
          </div>
        </motion.div>
        
        {/* Bubble description with parallax effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="backdrop-blur-sm bg-white/10 rounded-xl p-4 my-4 max-w-lg"
        >
          <p className="text-white/90 leading-relaxed">
            {bubble.description || "Join the conversation about this fascinating topic!"}
          </p>
        </motion.div>
      </motion.div>
      
      {/* Interaction buttons with animations */}
      <motion.div 
        className="z-10 flex items-center gap-4 justify-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: animateIn ? 1 : 0, y: animateIn ? 0 : 20 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Button 
          onClick={() => reflectBubble()}
          variant="ghost" 
          size="lg"
          className={`rounded-full p-6 ${
            isReflected 
              ? 'bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90' 
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          <Sparkles className={`h-6 w-6 ${isReflected ? 'text-white' : 'text-white'}`} />
          <span className="ml-2">{isReflected ? 'Reflected' : 'Reflect'}</span>
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-full p-6 bg-white/20 text-white hover:bg-white/30"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-full p-6 bg-white/20 text-white hover:bg-white/30"
        >
          <Share2 className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  );
};

export default BubbleContent;
