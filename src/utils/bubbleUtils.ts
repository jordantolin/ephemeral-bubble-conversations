
import { BubbleData } from "@/types/bubble";
import { connectionManager } from "./connectionManager";

// Export the connection manager for direct use
export { connectionManager };

/**
 * Calcola se una bolla è scaduta
 */
export function isBubbleExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  
  try {
    const expiryTime = new Date(expiresAt);
    const now = new Date();
    return expiryTime < now;
  } catch (error) {
    console.error("Error checking bubble expiry:", error);
    return true; // Consider expired on error
  }
}

/**
 * Calcola se mostrare una bolla nel feed
 * Mostra bolle non scadute e bolle scadute da meno di 24 ore
 */
export function shouldShowInFeed(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  
  try {
    const expiryTime = new Date(expiresAt);
    const now = new Date();
    
    // Se non è scaduta, mostrala
    if (expiryTime > now) return true;
    
    // Se è scaduta, controlla se è entro 24h dalla scadenza
    const cutoffTime = new Date(expiryTime);
    cutoffTime.setHours(cutoffTime.getHours() + 24);
    
    return now < cutoffTime;
  } catch (error) {
    console.error("Error checking bubble visibility:", error);
    return false;
  }
}

/**
 * Calcola le dimensioni della bolla in base al numero di riflessioni
 */
export function calculateBubbleSize(reflectCount: number): "sm" | "md" | "lg" {
  if (reflectCount >= 10) {
    return "lg";
  } else if (reflectCount >= 5) {
    return "md";
  }
  return "sm";
}

/**
 * Genera un ID casuale per una bolla
 */
export function generateBubbleId(): string {
  return `bubble-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Genera dati di esempio per le bolle
 */
export function generateSampleBubbles(count: number = 5): BubbleData[] {
  const topics = ["React", "JavaScript", "TypeScript", "CSS", "HTML"];
  const sizes: ("sm" | "md" | "lg")[] = ["sm", "md", "lg"];
  const names = ["Thinking...", "Idea!", "Question", "Cool stuff", "Discovery"];
  
  return Array.from({ length: count }).map((_, index) => {
    const now = new Date();
    const expiryHours = 2 + Math.floor(Math.random() * 5); // 2-7 hours
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
    
    return {
      id: generateBubbleId(),
      topic: topics[index % topics.length],
      name: `${names[index % names.length]} ${index + 1}`,
      username: `user${index + 1}`,
      size: sizes[Math.floor(Math.random() * sizes.length)],
      created_at: now.toISOString(),
      reflect_count: Math.floor(Math.random() * 15),
      expires_at: expiresAt.toISOString(),
      isExploding: false
    };
  });
}
