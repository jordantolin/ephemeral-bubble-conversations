
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// Extend the SupabaseClient to include our custom RPC function types
declare module '@supabase/supabase-js' {
  interface SupabaseClient<Database> {
    rpc<T = any>(
      fn: 'award_points',
      params: {
        user_id: string;
        amount: number;
        points_type: 'message' | 'bubble' | 'reflection' | 'general';
      }
    ): Promise<{ data: T; error: Error | null }>;
    
    rpc<T = any>(
      fn: 'award_achievement',
      params: {
        user_id: string;
        achievement_name: string;
        achievement_description: string;
        points: number;
      }
    ): Promise<{ data: T; error: Error | null }>;
    
    // Default case for other RPC functions
    rpc<T = any>(fn: string, params?: object): Promise<{ data: T; error: Error | null }>;
  }
}
