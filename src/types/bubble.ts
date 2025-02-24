
export interface BubbleData {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: "sm" | "md" | "lg";
  reflect_count: number;
  created_at?: string;
  description?: string; // Add this as it might be used
}

export interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (id: string) => void;
}
