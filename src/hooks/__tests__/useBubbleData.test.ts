
import { renderHook, act } from '@testing-library/react-hooks';
import useBubbleData from '../useBubbleData';
import '@testing-library/jest-dom';

// Mock data for testing
const mockData = [
  {
    id: '1',
    name: 'First Bubble',
    description: 'Test description 1',
    username: 'user1',
    created_at: '2023-01-01T00:00:00Z',
    reflect_count: 2,
    size: 'sm',
    color: 'blue',
    topic: 'Test Topic 1',
    expires_at: '2023-01-08T00:00:00Z',
    position: { x: 0, y: 0, z: 0 }
  },
  {
    id: '2',
    name: 'Second Bubble',
    description: 'Test description 2',
    username: 'user2',
    created_at: '2023-01-02T00:00:00Z',
    reflect_count: 5,
    size: 'md',
    color: 'red',
    topic: 'Test Topic 2',
    expires_at: '2023-01-09T00:00:00Z',
    position: { x: 1, y: 1, z: 1 }
  }
];

// Mock the bubbleService
jest.mock('@/services/bubbleService', () => ({
  getBubbles: jest.fn(() => Promise.resolve(mockData)),
  searchBubbles: jest.fn((searchTerm) => 
    Promise.resolve(
      mockData.filter(bubble => 
        bubble.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        bubble.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  )
}));

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: mockData, error: null }))
          })),
          single: jest.fn(() => Promise.resolve({ data: mockData[0], error: null }))
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: mockData, error: null }))
        })),
        in: jest.fn(() => Promise.resolve({ data: mockData, error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })
  },
}));

describe('useBubbleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should initialize with the correct default values', () => {
    const { result } = renderHook(() => useBubbleData());
    
    expect(result.current.bubbles).toEqual([]);
    expect(result.current.isLoadingBubbles).toBe(true);
    expect(result.current.bubblesError).toBe(null);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedBubble).toBe(null);
  });
  
  it('should load bubbles on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData());
    
    await waitForNextUpdate();
    
    expect(result.current.bubbles).toEqual(mockData);
    expect(result.current.isLoadingBubbles).toBe(false);
  });
  
  it('should filter bubbles when search term changes', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData());
    
    await waitForNextUpdate();
    
    act(() => {
      result.current.setSearchQuery('First');
    });
    
    await waitForNextUpdate();
    
    expect(result.current.filteredBubbles.length).toBe(1);
    expect(result.current.filteredBubbles[0].name).toBe('First Bubble');
  });
  
  it('should set selected bubble id', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData());
    
    await waitForNextUpdate();
    
    act(() => {
      result.current.setSelectedBubbleId(mockData[0].id);
    });
    
    expect(result.current.selectedBubbleId).toEqual(mockData[0].id);
  });
});
