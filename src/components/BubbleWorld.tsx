
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
      className="w-full h-full flex flex-wrap justify-center items-center gap-4 p-4"
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
            topic={bubble.topic}
            username={bubble.username}
            name={bubble.name}
            size={bubble.size}
            reflectCount={bubble.reflect_count}
            isExploding={explodingBubble === bubble.id}
            onClick={() => handleClick(bubble.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default BubbleWorld;
