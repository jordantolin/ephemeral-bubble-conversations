// Format message timestamp
export const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format the date for the "created at" timestamp
export const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Get a truncated preview of message content
export const getMessagePreview = (content: string) => {
  // If it's media content, return an appropriate placeholder
  if (content.startsWith('data:image/')) {
    return "[Image]";
  } else if (content.startsWith('data:video/')) {
    return "[Video]";
  } else if (content.startsWith('data:audio/')) {
    return "[Voice message]";
  }
  
  // Otherwise truncate text
  return content.length > 25 ? content.substring(0, 22) + '...' : content;
};

// Get a random pastel color for user avatars
export const getUserColor = (username: string) => {
  // Generate a hash code from the username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate pastel colors (high lightness)
  const h = hash % 360;
  return `hsla(${h}, 70%, 80%, 0.8)`;
};

// Check if a bubble has expired
export const isBubbleExpired = (bubble: any) => {
  if (!bubble.expires_at) return false;
  return new Date(bubble.expires_at) < new Date();
};
