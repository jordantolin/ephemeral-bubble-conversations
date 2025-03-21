
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

// Add Bubble interface to match database schema
export interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  size: 'sm' | 'md' | 'lg';
  expires_at: string;
  created_at: string;
  reflect_count: number;
  username: string;
}

// Add BubbleMessage interface
export interface BubbleMessage {
  id: string;
  bubble_id: string;
  content: string;
  username: string;
  created_at: string;
}

// Add Reflect interface
export interface Reflect {
  id: string;
  bubble_id: string;
  username: string;
  created_at: string;
}
