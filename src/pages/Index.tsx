
import { useState, useEffect } from 'react';
import BubbleWorld from '@/components/BubbleWorld';
import { BubbleData } from '@/types/bubble';
import { useToast } from '@/hooks/use-toast';

// Sample data for bubbles
const SAMPLE_DATA: BubbleData[] = [
  { id: '1', name: 'Alice', username: 'alice_ai', topic: 'AI Ethics', reflect_count: 42, size: 'lg' },
  { id: '2', name: 'Bob', username: 'quantum_bob', topic: 'Quantum Computing', reflect_count: 31, size: 'md' },
  { id: '3', name: 'Charlie', username: 'crypto_charlie', topic: 'Blockchain', reflect_count: 27, size: 'md' },
  { id: '4', name: 'Diana', username: 'secure_diana', topic: 'Cybersecurity', reflect_count: 19, size: 'sm' },
  { id: '5', name: 'Eliot', username: 'bio_eliot', topic: 'Biotechnology', reflect_count: 24, size: 'md' },
  { id: '6', name: 'Fiona', username: 'space_fiona', topic: 'Space Exploration', reflect_count: 38, size: 'lg' },
  { id: '7', name: 'George', username: 'green_george', topic: 'Renewable Energy', reflect_count: 22, size: 'md' },
  { id: '8', name: 'Hannah', username: 'vr_hannah', topic: 'Virtual Reality', reflect_count: 17, size: 'sm' },
  { id: '9', name: 'Ian', username: 'robot_ian', topic: 'Robotics', reflect_count: 29, size: 'md' },
  { id: '10', name: 'Julia', username: 'neuro_julia', topic: 'Neuroscience', reflect_count: 34, size: 'lg' },
];

const Index = () => {
  const { toast } = useToast();
  const [bubbleData] = useState<BubbleData[]>(SAMPLE_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Debug logs to help track initialization
    console.log("Component mounted, initializing 3D world");
    
    // Add a slightly longer delay to ensure DOM is fully rendered before initializing Three.js
    const timer = setTimeout(() => {
      setIsLoaded(true);
      console.log("3D world should be loaded now - isLoaded set to true");
    }, 1000);
    
    return () => {
      console.log("Component unmounting, clearing timeout");
      clearTimeout(timer);
    };
  }, []);

  const handleBubbleClick = (id: string) => {
    const bubble = bubbleData.find(b => b.id === id);
    if (bubble) {
      console.log(`Bubble clicked: ${bubble.name} - ${bubble.topic}`);
      toast({
        title: bubble.name,
        description: `Topic: ${bubble.topic} - Reflections: ${bubble.reflect_count}`,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white">
      <div className="text-center py-8 px-4 border-b border-amber-200">
        <h1 className="text-4xl md:text-5xl font-bold text-amber-500 mb-3 tracking-tight">
          Bubble Hub
        </h1>
        <div className="h-1 w-24 bg-amber-400 mx-auto mb-6 rounded-full"></div>
        <p className="text-lg text-amber-600 max-w-2xl mx-auto">
          Explore bubbles made in the last 24 hours
        </p>
      </div>
      
      <div className="flex-1 w-full relative" style={{ minHeight: '75vh' }}>
        {isLoaded ? (
          <BubbleWorld topics={bubbleData} onBubbleClick={handleBubbleClick} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
            <p className="ml-4 text-amber-600 font-medium">Loading Bubble World...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
