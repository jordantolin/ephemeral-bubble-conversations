
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useBubbleData from '../useBubbleData';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Mock dei moduli esterni
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

describe('useBubbleData', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    
    // Setup dei mock
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
      profile: { username: 'test-user' },
    });
    
    (useNavigate as jest.Mock).mockReturnValue(jest.fn());
    
    (useToast as jest.Mock).mockReturnValue({
      toast: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with correct default values', () => {
    // Setup del mock di Supabase
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }));
    
    const { result } = renderHook(() => useBubbleData(), { wrapper });

    expect(result.current.bubbles).toEqual([]);
    expect(result.current.filteredBubbles).toEqual([]);
    expect(result.current.isLoadingBubbles).toBe(true);
    expect(result.current.selectedBubbleId).toBe(null);
    expect(result.current.chatOpen).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
  });

  // Aggiungi ulteriori test se necessario
});
