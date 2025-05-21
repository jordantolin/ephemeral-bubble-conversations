
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from "@/hooks/use-toast";
import { BubbleData, BubbleWorldProps } from '@/types/bubble';
import WebGLDetector from './bubbleWorld/WebGLDetector';
import Bubble3DWorld from './bubbleWorld/Bubble3DWorld';
import BubbleWorld2D from './bubbleWorld/BubbleWorld2D';
import BubbleWorldModeSwitcher from './bubbleWorld/BubbleWorldModeSwitcher';
import BubbleWorldEmptyState from './bubbleWorld/BubbleWorldEmptyState';

const BubbleWorld: React.FC<BubbleWorldProps> = ({ bubbles, onBubbleClick }) => {
  const [explodingBubble, setExplodingBubble] = useState<string | null>(null);
  const [use3DMode, setUse3DMode] = useState<boolean>(false);
  const [renderAttempted, setRenderAttempted] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle case where bubbles is undefined or empty
  const validBubbles = Array.isArray(bubbles) ? bubbles : [];
  
  // Debug output to help troubleshoot
  useEffect(() => {
    console.log('BubbleWorld component received bubbles:', validBubbles.length);
  }, [validBubbles]);

  // Improved WebGL detection logic
  useEffect(() => {
    const checkWebGLSupport = async () => {
      try {
        const isSupported = WebGLDetector.isWebGLAvailable();
        console.log('WebGL support detected:', isSupported);
        setWebGLSupported(isSupported);
        
        // Only auto-enable 3D mode if WebGL is supported
        setUse3DMode(isSupported);
      } catch (error) {
        console.error('Error during WebGL detection:', error);
        setWebGLSupported(false);
        setUse3DMode(false);
      }
    };
    
    checkWebGLSupport();
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
      <BubbleWorldEmptyState 
        onReload={() => window.location.reload()} 
      />
    );
  }

  return (
    <div className="w-full h-full">
      {use3DMode ? (
        <>
          <Bubble3DWorld 
            bubbles={validBubbles} 
            onBubbleClick={onBubbleClick}
          />
          {webGLSupported !== null && (
            <BubbleWorldModeSwitcher 
              use3DMode={use3DMode}
              setUse3DMode={setUse3DMode}
              setRenderAttempted={setRenderAttempted}
            />
          )}
        </>
      ) : (
        <>
          <BubbleWorld2D
            bubbles={validBubbles}
            onBubbleClick={onBubbleClick}
            explodingBubble={explodingBubble}
            setExplodingBubble={setExplodingBubble}
          />
          {webGLSupported !== null && (
            <BubbleWorldModeSwitcher 
              use3DMode={use3DMode}
              setUse3DMode={setUse3DMode}
              setRenderAttempted={setRenderAttempted}
            />
          )}
        </>
      )}
    </div>
  );
};

export default BubbleWorld;
