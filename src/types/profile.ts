
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  daily_streak: number;
  experience: number;
  level: number;
  total_points: number;
  last_streak_date: string;
}
