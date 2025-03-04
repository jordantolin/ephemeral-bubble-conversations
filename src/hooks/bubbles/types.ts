
// Bubble data type definition matched to database schema
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

// Message data type definition matched to database schema
export interface BubbleMessage {
  id: string;
  bubble_id: string;
  content: string;
  username: string;
  created_at: string;
}
