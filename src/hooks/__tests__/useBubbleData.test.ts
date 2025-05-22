
import { renderHook } from '@testing-library/react-hooks';
import { describe, it, expect, vi } from 'vitest';
import useBubbleData from '../useBubbleData';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((callback) => callback({ 
      data: [], 
      error: null 
    })),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    removeChannel: vi.fn(),
    channel: vi.fn().mockReturnThis(),
  }
}));

// Mock the connection manager and bubble utils
vi.mock('@/utils/bubbleUtils', () => ({
  connectionManager: {
    createChannel: vi.fn(),
    removeChannel: vi.fn(),
    logActiveChannels: vi.fn(),
    removeAllChannels: vi.fn(),
  },
  isBubbleExpired: vi.fn().mockReturnValue(false),
  shouldShowInFeed: vi.fn().mockReturnValue(true),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
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
