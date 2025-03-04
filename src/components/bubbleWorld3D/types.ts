
import { BubbleData } from '@/types/bubble';

export type BubbleClickHandler = (id: string) => void;

export interface InteractionState {
  isInteracting: boolean;
  lastX: number;
  lastY: number;
  rotationSpeed: { x: number; y: number };
  momentum: { x: number; y: number };
  zoom: {
    current: number;
    target: number;
    min: number;
    max: number;
  };
  pinchDistance: number;
  lastPinchTime: number;
  isDragging: boolean;
  startX: number;
  startY: number;
  moveThreshold: number;
}

export interface BubbleAnimateProps {
  topics: BubbleData[];
  onBubbleClick: BubbleClickHandler;
}
