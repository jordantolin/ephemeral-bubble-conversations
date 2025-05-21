
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Bubble from '../Bubble';
import { BubbleData } from '@/types/bubble';

// Create a staggered animation for bubbles
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const bubbleVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  }
};

interface BubbleWorld2DProps {
  bubbles: BubbleData[];
  onBubbleClick: (id: string) => void;
  explodingBubble: string | null;
  setExplodingBubble: (id: string | null) => void;
}

const BubbleWorld2D: React.FC<BubbleWorld2DProps> = ({ 
  bubbles, 
  onBubbleClick,
  explodingBubble,
  setExplodingBubble
}) => {
  // Handle click with animation
  const handleClick = (id: string) => {
    setExplodingBubble(id);
    
    // Navigate after bubble animation completes
    setTimeout(() => {
      onBubbleClick(id);
      setExplodingBubble(null);
    }, 500);
  };

  return (
    <motion.div 
      className="w-full h-full flex flex-wrap justify-center items-center gap-4 p-4 overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {bubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className="flex flex-col items-center mx-2 my-2"
          variants={bubbleVariants}
        >
          <Bubble
            id={bubble.id}
            title={bubble.topic || 'Untitled'}
            description={bubble.description || ''}
            timeLeft={bubble.expires_at ? new Date(bubble.expires_at).toLocaleString() : 'No expiry'}
            participants={0}
            reflects={bubble.reflect_count || 0}
            isExploding={explodingBubble === bubble.id}
            onClick={() => handleClick(bubble.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default BubbleWorld2D;
