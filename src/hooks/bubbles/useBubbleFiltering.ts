
import { useMemo } from "react";
import { BubbleData } from "@/types/bubble";
import { useBubbleUtils } from "./useBubbleUtils";

/**
 * Hook for filtering bubble data
 */
export const useBubbleFiltering = (
  bubbles: any[],
  searchQuery: string,
  explodingBubbleId: string | null
) => {
  const { shouldShowInFeed } = useBubbleUtils();

  // Filter bubbles based on search query
  const filteredBubbles = useMemo(() => {
    if (!bubbles || !Array.isArray(bubbles)) return [];
    if (!searchQuery.trim()) return bubbles;
    
    const query = searchQuery.toLowerCase();
    return bubbles.filter((bubble) => 
      bubble.name.toLowerCase().includes(query) || 
      bubble.topic.toLowerCase().includes(query) ||
      (bubble.description && bubble.description.toLowerCase().includes(query))
    );
  }, [bubbles, searchQuery]);

  // Get top bubbles by reflection count for the Feed page
  const topBubblesByReflections = useMemo(() => {
    if (!bubbles || !Array.isArray(bubbles)) return [];
    
    // Filter to show only non-expired bubbles or those that expired less than 24h ago
    const visibleBubbles = bubbles.filter(bubble => shouldShowInFeed(bubble));
    
    // Sort by reflection count (descending)
    return [...visibleBubbles].sort((a, b) => {
      return (b.reflect_count || 0) - (a.reflect_count || 0);
    });
  }, [bubbles, shouldShowInFeed]);

  // Map to BubbleData needed for BubbleWorld component
  const bubbleDataForComponent = useMemo(() => {
    if (!filteredBubbles || !Array.isArray(filteredBubbles)) return [];
    
    return filteredBubbles.map((bubble): BubbleData => ({
      id: bubble.id,
      topic: bubble.topic,
      username: bubble.username,
      name: bubble.name,
      size: bubble.size, // Already validated as "sm" | "md" | "lg"
      reflect_count: bubble.reflect_count,
      created_at: bubble.created_at,
      description: bubble.description || undefined,
      expires_at: bubble.expires_at,
      isExploding: explodingBubbleId === bubble.id
    }));
  }, [filteredBubbles, explodingBubbleId]);

  return {
    filteredBubbles,
    topBubblesByReflections,
    bubbleDataForComponent
  };
};

export default useBubbleFiltering;
