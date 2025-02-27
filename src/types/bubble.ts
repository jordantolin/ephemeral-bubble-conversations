
export interface BubbleData {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: string; // Changed from "sm" | "md" | "lg" to string to match database
  reflect_count: number;
  created_at?: string;
  description?: string;
  expires_at?: string;
}

export interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (id: string) => void;
}
