
import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useBubbleData from '@/hooks/useBubbleData';
import { supabase } from '@/integrations/supabase/client';
import { ReactNode } from 'react';

// Mock dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [
              { 
                id: 'bubble-1',
                name: 'Test Bubble',
                topic: 'Testing',
                description: 'A test bubble',
                size: 'md',
                expires_at: new Date(Date.now() + 3600000).toISOString(),
                created_at: new Date().toISOString(),
                reflect_count: 5,
                username: 'testuser'
              }
            ],
            error: null
          }))
        }))
      })),
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: { id: 'bubble-1', name: 'Test Bubble' },
          error: null
        }))
      })),
      insert: jest.fn(() => ({ error: null }))
    })
  }
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ search: '' })
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { username: 'testuser' }
  })
}));

// Setup wrapper with required providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBubbleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData(), {
      wrapper: createWrapper(),
    });
    
    // Initial state before data loading
    expect(result.current.isLoadingBubbles).toBe(true);
    expect(result.current.bubbles).toEqual([]);
    expect(result.current.searchQuery).toBe('');
    
    await waitForNextUpdate();
    
    // After data is loaded
    expect(result.current.isLoadingBubbles).toBe(false);
    expect(result.current.bubbles.length).toBeGreaterThan(0);
    expect(result.current.bubbles[0].name).toBe('Test Bubble');
  });

  it('should filter bubbles when search query changes', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData(), {
      wrapper: createWrapper(),
    });
    
    await waitForNextUpdate();
    
    // Change search query to match
    act(() => {
      result.current.setSearchQuery('Test');
    });
    
    expect(result.current.filteredBubbles.length).toBe(1);
    
    // Change search query to not match
    act(() => {
      result.current.setSearchQuery('Nonexistent');
    });
    
    expect(result.current.filteredBubbles.length).toBe(0);
  });

  it('should handle bubble selection', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData(), {
      wrapper: createWrapper(),
    });
    
    await waitForNextUpdate();
    
    expect(result.current.selectedBubbleId).toBeNull();
    expect(result.current.chatOpen).toBe(false);
    
    // Select a bubble
    act(() => {
      result.current.setSelectedBubbleId('bubble-1');
      result.current.setChatOpen(true);
    });
    
    expect(result.current.selectedBubbleId).toBe('bubble-1');
    expect(result.current.chatOpen).toBe(true);
  });
});
