
import { supabase } from "@/integrations/supabase/client";

// Check and award achievements based on user actions
export const checkAndAwardAchievements = async (
  userId: string, 
  username: string
) => {
  try {
    // Check for bubble-related achievements
    await checkBubbleAchievements(userId, username);
    
    // Check for message-related achievements
    await checkMessageAchievements(userId, username);
    
    // Check for reflection-related achievements
    await checkReflectionAchievements(userId, username);
    
  } catch (error) {
    console.error("Error checking and awarding achievements:", error);
  }
};

// Check for bubble creation related achievements
const checkBubbleAchievements = async (userId: string, username: string) => {
  try {
    // Get the user's bubble count
    const { data: bubbles, error: bubbleError } = await supabase
      .from('bubbles')
      .select('id')
      .eq('username', username);
      
    if (bubbleError) throw bubbleError;
    
    const bubbleCount = bubbles?.length || 0;
    
    // Check for "Bubble Creator" achievement (first bubble)
    if (bubbleCount > 0) {
      await awardAchievementByName(userId, 'Bubble Creator');
    }
    
    // Check for "Bubble Enthusiast" achievement (5 bubbles)
    if (bubbleCount >= 5) {
      await awardAchievementByName(userId, 'Bubble Enthusiast');
    }
    
  } catch (error) {
    console.error("Error checking bubble achievements:", error);
    throw error;
  }
};

// Check for message related achievements
const checkMessageAchievements = async (userId: string, username: string) => {
  try {
    // Get the user's message count
    const { data: messages, error: messageError } = await supabase
      .from('bubble_messages')
      .select('id')
      .eq('username', username);
      
    if (messageError) throw messageError;
    
    const messageCount = messages?.length || 0;
    
    // Check for "Conversation Starter" achievement (first message)
    if (messageCount > 0) {
      await awardAchievementByName(userId, 'Conversation Starter');
    }
    
    // Check for "Active Participant" achievement (10 messages)
    if (messageCount >= 10) {
      await awardAchievementByName(userId, 'Active Participant');
    }
    
  } catch (error) {
    console.error("Error checking message achievements:", error);
    throw error;
  }
};

// Check for reflection related achievements
const checkReflectionAchievements = async (userId: string, username: string) => {
  try {
    // Get the user's reflection count
    const { data: reflects, error: reflectError } = await supabase
      .from('reflects')
      .select('bubble_id')
      .eq('username', username);
      
    if (reflectError) throw reflectError;
    
    if (!reflects) return;
    
    // Count unique bubbles reflected on
    const uniqueBubbleIds = new Set(reflects.map(r => r.bubble_id));
    const uniqueBubbleCount = uniqueBubbleIds.size;
    
    // Check for "Reflector" achievement (5 different bubbles)
    if (uniqueBubbleCount >= 5) {
      await awardAchievementByName(userId, 'Reflector');
    }
    
    // Check for "Explorer" achievement (10 different bubbles)
    if (uniqueBubbleCount >= 10) {
      await awardAchievementByName(userId, 'Explorer');
    }
    
  } catch (error) {
    console.error("Error checking reflection achievements:", error);
    throw error;
  }
};

// Award an achievement by name if the user hasn't already earned it
export const awardAchievementByName = async (
  userId: string, 
  achievementName: string
) => {
  try {
    // Use a stored procedure to handle the achievement awarding
    // The RPC expects named parameters
    const { data, error } = await supabase.rpc(
      'award_achievement_by_name',
      { 
        user_id_param: userId,
        achievement_name_param: achievementName
      }
    );
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error awarding achievement "${achievementName}":`, error);
    throw error;
  }
};

// Format number with commas
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Calculate level from points
export const calculateLevel = (points: number): number => {
  return Math.max(1, Math.floor(points / 500) + 1);
};

// Calculate progress to next level (0-100%)
export const calculateLevelProgress = (points: number): number => {
  const level = calculateLevel(points);
  const pointsForCurrentLevel = (level - 1) * 500;
  const pointsForNextLevel = level * 500;
  const pointsInCurrentLevel = points - pointsForCurrentLevel;
  const pointsNeededForNextLevel = pointsForNextLevel - pointsForCurrentLevel;
  
  return Math.min(100, (pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
};
