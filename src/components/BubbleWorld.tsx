
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Bubble from './Bubble';
import { BubbleData, BubbleWorldProps } from '@/types/bubble';

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

const BubbleWorld: React.FC<BubbleWorldProps> = ({ bubbles, onBubbleClick }) => {
  const [explodingBubble, setExplodingBubble] = useState<string | null>(null);
  const navigate = useNavigate();

  // Handle case where bubbles is undefined or empty
  const validBubbles = Array.isArray(bubbles) ? bubbles : [];
  
  // Debug output to help troubleshoot
  useEffect(() => {
    console.log('BubbleWorld component received bubbles:', validBubbles.length);
  }, [validBubbles]);

  const handleClick = (id: string) => {
    setExplodingBubble(id);
    
    // Navigate after bubble animation completes
    setTimeout(() => {
      onBubbleClick(id);
      setExplodingBubble(null);
    }, 500);
  };

  // If no valid bubbles, render placeholder content
  if (validBubbles.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-gray-500">No bubbles available to display</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="w-full h-full flex flex-wrap justify-center items-center gap-4 p-4 overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {validBubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className="flex flex-col items-center mx-2 my-2"
          variants={bubbleVariants}
        >
          <Bubble
            id={bubble.id}
            title={bubble.topic || 'Untitled'} // Add fallback for topic
            description={bubble.description || ''} // Add fallback for description
            timeLeft={bubble.expires_at ? new Date(bubble.expires_at).toLocaleString() : 'No expiry'}
            participants={0}
            reflects={bubble.reflect_count || 0} // Add fallback for reflect_count
            isExploding={explodingBubble === bubble.id}
            onClick={() => handleClick(bubble.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default BubbleWorld;
