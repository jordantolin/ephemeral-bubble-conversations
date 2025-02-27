
import { useState } from 'react';
import BubbleWorld from '@/components/BubbleWorld';
import { BubbleData } from '@/types/bubble';
import { useToast } from '@/hooks/use-toast';

// Sample data for bubbles
const SAMPLE_DATA: BubbleData[] = [
  { id: '1', name: 'Alice', topic: 'AI Ethics', reflect_count: 42, size: 'lg' },
  { id: '2', name: 'Bob', topic: 'Quantum Computing', reflect_count: 31, size: 'md' },
  { id: '3', name: 'Charlie', topic: 'Blockchain', reflect_count: 27, size: 'md' },
  { id: '4', name: 'Diana', topic: 'Cybersecurity', reflect_count: 19, size: 'sm' },
  { id: '5', name: 'Eliot', topic: 'Biotechnology', reflect_count: 24, size: 'md' },
  { id: '6', name: 'Fiona', topic: 'Space Exploration', reflect_count: 38, size: 'lg' },
  { id: '7', name: 'George', topic: 'Renewable Energy', reflect_count: 22, size: 'md' },
  { id: '8', name: 'Hannah', topic: 'Virtual Reality', reflect_count: 17, size: 'sm' },
  { id: '9', name: 'Ian', topic: 'Robotics', reflect_count: 29, size: 'md' },
  { id: '10', name: 'Julia', topic: 'Neuroscience', reflect_count: 34, size: 'lg' },
];

const Index = () => {
  const { toast } = useToast();
  const [bubbleData] = useState<BubbleData[]>(SAMPLE_DATA);

  const handleBubbleClick = (id: string) => {
    const bubble = bubbleData.find(b => b.id === id);
    if (bubble) {
      toast({
        title: bubble.name,
        description: `Topic: ${bubble.topic} - Reflections: ${bubble.reflect_count}`,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="text-center py-8">
        <h1 className="bubble-hub-title">Bubble Hub</h1>
        <p className="bubble-hub-subtitle">
          Explore bubbles made in the last 24 hours
        </p>
      </div>
      <div className="flex-1 w-full" style={{ minHeight: '70vh' }}>
        <BubbleWorld topics={bubbleData} onBubbleClick={handleBubbleClick} />
      </div>
    </div>
  );
};

export default Index;
