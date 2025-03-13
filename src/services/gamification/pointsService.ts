
import { supabase } from "@/integrations/supabase/client";

export async function updatePointsInDB(
  userId: string, 
  points: number, 
  level: number, 
  bubblePoints: number, 
  reflectionPoints: number, 
  messagePoints: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        points: points,
        level: level,
        bubble_points: bubblePoints,
        reflection_points: reflectionPoints,
        message_points: messagePoints
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating points:", error.message);
      throw error;
    }
  } catch (e) {
    console.error("Unexpected error in updatePointsInDB:", e);
  }
}
