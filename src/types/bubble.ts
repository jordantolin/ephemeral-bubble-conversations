
export interface BubbleData {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: "sm" | "md" | "lg";
  reflect_count: number;
  created_at?: string;
  description?: string;
  expires_at?: string;
  isExploding?: boolean;
}

export interface BubbleProps {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: "sm" | "md" | "lg";
  reflectCount: number;
  isExploding?: boolean;
  onClick: () => void;
  onReflect?: (e: React.MouseEvent) => void;
}

export interface BubbleWorldProps {
  bubbles: BubbleData[];
  onBubbleClick: (id: string) => void;
}
