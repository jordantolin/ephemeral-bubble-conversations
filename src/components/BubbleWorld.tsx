
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Bubble from './Bubble';
import Bubble3DWorld from './bubbleWorld/Bubble3DWorld';
import { BubbleData, BubbleWorldProps } from '@/types/bubble';
import { useToast } from "@/hooks/use-toast";

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
  const [use3DMode, setUse3DMode] = useState<boolean>(true);
  const [renderAttempted, setRenderAttempted] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
  
  // Improved WebGL detection logic
  useEffect(() => {
    const detectWebGL = () => {
      try {
        // Create temporary canvas for WebGL detection
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || 
                 canvas.getContext('experimental-webgl') || 
                 canvas.getContext('webgl2');
        
        // Check if context creation was successful
        if (!gl) {
          console.log('WebGL not supported, falling back to 2D mode');
          setUse3DMode(false);
          return false;
        }
        
        // Additional capability check
        const extensionsSupported = gl.getSupportedExtensions();
        if (!extensionsSupported || extensionsSupported.length < 5) {
          console.log('WebGL supported but with limited extensions, using 2D mode');
          setUse3DMode(false);
          return false;
        }
        
        // Check for Three.js specific requirements
        try {
          // Basic Three.js initialization test
          const THREE = window.THREE;
          if (!THREE) {
            throw new Error('THREE is not defined');
          }
          
          console.log('WebGL supported with Three.js, using 3D mode');
          setUse3DMode(true);
          return true;
        } catch (e) {
          console.error('Three.js initialization test failed:', e);
          setUse3DMode(false);
          return false;
        }
      } catch (e) {
        console.error('WebGL detection error:', e);
        setUse3DMode(false);
        return false;
      }
    };
    
    // Force 3D mode with fallback
    setUse3DMode(true);
    detectWebGL();
  }, []);

  // Force 3D rendering and handle potential errors
  useEffect(() => {
    const render3DWorld = () => {
      try {
        setRenderAttempted(true);
        // This just marks that we've tried to render
        // The actual rendering happens in the JSX via Bubble3DWorld
      } catch (error) {
        console.error('Error while attempting to render 3D world:', error);
        setRenderError('Failed to initialize 3D world');
        setUse3DMode(false);
      }
    };

    if (use3DMode && validBubbles.length > 0 && !renderAttempted) {
      render3DWorld();
    }
  }, [use3DMode, validBubbles.length, renderAttempted]);

  // If there's an error in 3D rendering, show a toast once
  useEffect(() => {
    if (renderError && !use3DMode) {
      toast({
        title: "3D Rendering Issue",
        description: "Using 2D mode instead. Try refreshing the browser.",
        variant: "destructive"
      });
    }
  }, [renderError, toast, use3DMode]);

  // If no valid bubbles, render placeholder content
  if (validBubbles.length === 0) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center">
        <p className="text-gray-500 mb-4">No bubbles available to display</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-yellow-500/70 text-white rounded-md hover:bg-yellow-600/70 transition-colors"
        >
          Reload Bubbles
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {use3DMode ? (
        <>
          <Bubble3DWorld 
            bubbles={validBubbles} 
            onBubbleClick={handleClick}
          />
          {renderAttempted && validBubbles.length > 0 && (
            <div className="absolute bottom-4 right-4 z-10">
              <button 
                onClick={() => setUse3DMode(false)}
                className="px-3 py-1.5 bg-gray-800/70 text-white text-xs rounded-md hover:bg-gray-700/70 transition-colors backdrop-blur-sm"
              >
                Switch to 2D Mode
              </button>
            </div>
          )}
        </>
      ) : (
        <>
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
          <div className="absolute bottom-4 right-4 z-10">
            <button 
              onClick={() => {
                setUse3DMode(true);
                setRenderAttempted(false);
              }}
              className="px-3 py-1.5 bg-yellow-500/70 text-white text-xs rounded-md hover:bg-yellow-600/70 transition-colors backdrop-blur-sm"
            >
              Try 3D Mode
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BubbleWorld;
