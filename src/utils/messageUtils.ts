
// Format timestamp for messages
export const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date for displaying
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

// Get user avatar color based on username
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

// Format notification time (relative to now)
export const formatNotificationTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Less than a minute
  if (diffMs < 60000) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diffMs < 3600000) {
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  // Less than a day
  if (diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  // Less than a week
  if (diffMs < 604800000) {
    const days = Math.floor(diffMs / 86400000);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  
  // Default to date
  return date.toLocaleDateString();
};

// Get notification icon color based on type
export const getNotificationColor = (type: string) => {
  switch (type) {
    case 'achievement':
      return 'bg-amber-500';
    case 'level-up':
      return 'bg-green-500';
    case 'streak':
      return 'bg-orange-500';
    case 'reward':
      return 'bg-purple-500';
    default:
      return 'bg-blue-500';
  }
};
