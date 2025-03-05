
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
      await awardAchievementIfNotExists(userId, 'Bubble Creator');
    }
    
    // Check for "Bubble Enthusiast" achievement (5 bubbles)
    if (bubbleCount >= 5) {
      await awardAchievementIfNotExists(userId, 'Bubble Enthusiast');
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
      await awardAchievementIfNotExists(userId, 'Conversation Starter');
    }
    
    // Check for "Active Participant" achievement (10 messages)
    if (messageCount >= 10) {
      await awardAchievementIfNotExists(userId, 'Active Participant');
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
      await awardAchievementIfNotExists(userId, 'Reflector');
    }
    
    // Check for "Explorer" achievement (10 different bubbles)
    if (uniqueBubbleCount >= 10) {
      await awardAchievementIfNotExists(userId, 'Explorer');
    }
    
  } catch (error) {
    console.error("Error checking reflection achievements:", error);
    throw error;
  }
};

// Award an achievement if the user hasn't already earned it
export const awardAchievementIfNotExists = async (
  userId: string, 
  achievementName: string
) => {
  try {
    // Get the achievement ID
    const { data: achievements, error: achievementError } = await supabase
      .from('achievements')
      .select('id, points, description, icon_type')
      .eq('name', achievementName);
    
    if (achievementError || !achievements || achievements.length === 0) {
      console.error(`Achievement "${achievementName}" not found`, achievementError);
      return;
    }
    
    const achievement = achievements[0];
    
    // Check if the user already has this achievement
    const { data: existingAchievements, error: existingError } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievement.id);
    
    if (!existingError && existingAchievements && existingAchievements.length > 0) {
      // User already has this achievement
      return;
    }
    
    // Award the achievement
    const { error: awardError } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievement.id
      });
    
    if (awardError) throw awardError;
    
    // Create a notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Achievement Unlocked!',
        message: `You earned "${achievementName}": ${achievement.description}`,
        type: 'achievement',
        icon_type: achievement.icon_type,
        points: achievement.points,
        read: false
      });
    
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
