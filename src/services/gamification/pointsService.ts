
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
    console.log(`Updating points for user ${userId}: ${points} points, level ${level}`);
    console.log(`Activity points - Bubble: ${bubblePoints}, Reflection: ${reflectionPoints}, Message: ${messagePoints}`);
    
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        points: points,
        level: level,
        bubble_points: bubblePoints,
        reflection_points: reflectionPoints,
        message_points: messagePoints,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating points:", error.message);
      throw error;
    }
    
    console.log("Points updated successfully");
  } catch (e) {
    console.error("Unexpected error in updatePointsInDB:", e);
    throw e; // Rethrow to allow proper error handling upstream
  }
}
