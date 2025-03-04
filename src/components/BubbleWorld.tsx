
import { BubbleWorldProps } from '@/types/bubble';
import BubbleAnimate from './bubbleWorld3D/BubbleAnimate';

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  console.log("BubbleWorld initialization with topics:", topics);
  
  return (
    <BubbleAnimate topics={topics} onBubbleClick={onBubbleClick} />
  );
};

export default BubbleWorld;
