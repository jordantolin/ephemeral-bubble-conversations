
// Format message timestamp with better readability
export const formatMessageTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffHours = diff / (1000 * 60 * 60);
    
    // If less than 24 hours ago, show relative time
    if (diffHours < 24) {
      if (diffHours < 1) {
        // Less than an hour ago
        const diffMinutes = Math.floor(diff / (1000 * 60));
        return diffMinutes <= 1 ? 'just now' : `${diffMinutes}m ago`;
      } else {
        // Hours ago
        const hours = Math.floor(diffHours);
        return `${hours}h ago`;
      }
    } else {
      // More than 24 hours ago, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch (error) {
    console.error("Error formatting time:", error);
    return "unknown time";
  }
};

// Format the date for the "created at" timestamp with improved readability
export const formatDate = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show how many hours ago
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      // Format date for older messages
      const options: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric',
        year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
      };
      return date.toLocaleDateString(undefined, options);
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "unknown date";
  }
};

// Get a better truncated preview of message content
export const getMessagePreview = (content: string) => {
  try {
    // If it's media content, return an appropriate placeholder
    if (!content) return "[Empty message]";
    
    if (content.startsWith('data:image/')) {
      return "📷 [Image]";
    } else if (content.startsWith('data:video/')) {
      return "🎥 [Video]";
    } else if (content.startsWith('data:audio/')) {
      return "🎤 [Voice message]";
    }
    
    // For normal text messages
    const truncateLength = 28;
    if (content.length <= truncateLength) return content;
    
    // Find a good breaking point (space, comma, period)
    const breakPoints = [' ', ',', '.', '!', '?'];
    let breakPoint = truncateLength;
    
    for (let i = truncateLength; i >= truncateLength - 10 && i > 0; i--) {
      if (breakPoints.includes(content[i])) {
        breakPoint = i;
        break;
      }
    }
    
    return content.substring(0, breakPoint) + '...';
  } catch (error) {
    console.error("Error generating message preview:", error);
    return "[Message]";
  }
};

// Get a visually pleasing pastel color for user avatars
export const getUserColor = (username: string) => {
  try {
    if (!username) return 'hsl(200, 70%, 80%)'; // Default color
    
    // Generate a hash code from the username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Create a pleasant palette of pastel colors
    // Using golden ratio to get a good distribution of colors
    const hue = (hash % 360);
    const saturation = 70 + (hash % 20); // 70-90%
    const lightness = 75 + (hash % 15);  // 75-90%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } catch (error) {
    console.error("Error generating user color:", error);
    return 'hsl(200, 70%, 80%)'; // Default color
  }
};

// Enhanced bubble expiration check with grace period
export const isBubbleExpired = (bubble: any) => {
  try {
    if (!bubble || !bubble.expires_at) return false;
    
    const expiryTime = new Date(bubble.expires_at);
    const now = new Date();
    
    // Add a 5-minute grace period
    const gracePeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
    expiryTime.setTime(expiryTime.getTime() + gracePeriod);
    
    return now > expiryTime;
  } catch (error) {
    console.error("Error checking bubble expiration:", error);
    return false; // Default to not expired if there's an error
  }
};

// Format time remaining until expiration
export const getTimeRemaining = (expiryTimestamp: string) => {
  try {
    if (!expiryTimestamp) return { text: "Unknown", isExpiring: false };
    
    const expiryTime = new Date(expiryTimestamp);
    const now = new Date();
    
    if (expiryTime <= now) {
      return { text: "Expired", isExpiring: false };
    }
    
    const diffMs = expiryTime.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Consider as "expiring soon" if less than 2 hours remaining
    const isExpiring = diffHrs < 2;
    
    if (diffHrs === 0) {
      return { 
        text: `${diffMins}m left`, 
        isExpiring: true 
      };
    } else {
      return { 
        text: `${diffHrs}h ${diffMins}m left`, 
        isExpiring 
      };
    }
  } catch (error) {
    console.error("Error calculating time remaining:", error);
    return { text: "Unknown", isExpiring: false };
  }
};
