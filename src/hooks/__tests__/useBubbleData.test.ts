
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useBubbleData from '../useBubbleData';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    data: [
      { id: '123', topic: 'Test Topic', username: 'testuser', name: 'Test Bubble' }
    ],
    removeChannel: jest.fn(),
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis()
  }
}));

// Create a wrapper for the renderHook function with the QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBubbleData hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useBubbleData(), {
      wrapper: createWrapper()
    });
    
    expect(result.current.selectedBubbleId).toBeNull();
    expect(result.current.selectedBubble).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.chatOpen).toBe(false);
  });
  
  it('should set selected bubble ID', () => {
    const { result } = renderHook(() => useBubbleData(), {
      wrapper: createWrapper()
    });
    
    // Act
    result.current.setSelectedBubbleId('123');
    
    // Assert
    waitFor(() => {
      expect(result.current.selectedBubbleId).toBe('123');
    });
  });
  
  it('should open and close chat', () => {
    const { result } = renderHook(() => useBubbleData(), {
      wrapper: createWrapper()
    });
    
    // Act
    result.current.setChatOpen(true);
    
    // Assert
    expect(result.current.chatOpen).toBe(true);
    
    // Act
    result.current.setChatOpen(false);
    
    // Assert
    expect(result.current.chatOpen).toBe(false);
  });
});
