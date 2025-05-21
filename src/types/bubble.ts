
export interface BubbleData {
  id: string;
  topic: string;
  username: string;
  name: string;
  size?: "sm" | "md" | "lg";
  reflect_count: number;
  created_at?: string;
  description?: string;
  expires_at?: string;
  // Position data
  x?: number;
  y?: number;
  angle?: number;
  radius?: number;
  isExploding?: boolean;
}

export interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (id: string) => void;
  initialAnimationEnabled?: boolean; // Nuova proprietà per controllare l'animazione iniziale
}
