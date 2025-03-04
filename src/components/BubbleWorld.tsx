
import { BubbleWorldProps } from '@/types/bubble';
import BubbleAnimate from './bubbleWorld3D/BubbleAnimate';

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  console.log("BubbleWorld rendering with topics:", topics.length, topics);
  
  if (!topics || topics.length === 0) {
    console.log("No topics provided to BubbleWorld");
  }
  
  return (
    <div className="w-full h-full">
      <BubbleAnimate topics={topics} onBubbleClick={onBubbleClick} />
    </div>
  );
};

export default BubbleWorld;
