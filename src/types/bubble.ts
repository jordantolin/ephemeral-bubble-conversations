
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
  latitude?: number;
  longitude?: number;
  location?: string;
}

export interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (id: string) => void;
  showEarth?: boolean;
}
