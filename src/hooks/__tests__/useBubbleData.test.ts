
import { renderHook } from '@testing-library/react-hooks';
import useBubbleData from '../useBubbleData';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((callback) => callback({ 
      data: [], 
      error: null 
    })),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    removeChannel: jest.fn(),
    channel: jest.fn().mockReturnThis(),
  }
}));

// Mock the connection manager
jest.mock('@/utils/bubbleUtils', () => ({
  connectionManager: {
    createChannel: jest.fn(),
    removeChannel: jest.fn(),
    logActiveChannels: jest.fn(),
  },
  isBubbleExpired: jest.fn().mockReturnValue(false),
  shouldShowInFeed: jest.fn().mockReturnValue(true),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

describe('useBubbleData', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useBubbleData());
    
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedBubbleId).toBe(null);
    expect(result.current.selectedBubble).toBe(null);
    expect(result.current.isLoadingBubbleDetails).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoadingMessages).toBe(false);
    expect(result.current.messagesError).toBe(null);
    expect(result.current.chatOpen).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.filteredBubbles).toEqual([]);
    expect(result.current.isLoadingBubbles).toBe(true);
    expect(result.current.bubblesError).toBe(null);
  });
});
