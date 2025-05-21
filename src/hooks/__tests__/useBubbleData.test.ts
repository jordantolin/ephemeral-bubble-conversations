
import { renderHook, act } from '@testing-library/react-hooks';
import { useBubbleData } from '../useBubbleData';

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

describe('useBubbleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should initialize with the correct default values', () => {
    const { result } = renderHook(() => useBubbleData());
    
    expect(result.current.bubbles).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.searchTerm).toBe('');
    expect(result.current.selectedBubble).toBe(null);
  });
  
  it('should load bubbles on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData());
    
    await waitForNextUpdate();
    
    expect(result.current.bubbles).toEqual(mockData);
    expect(result.current.loading).toBe(false);
  });
  
  it('should filter bubbles when search term changes', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData());
    
    await waitForNextUpdate();
    
    act(() => {
      result.current.setSearchTerm('First');
    });
    
    await waitForNextUpdate();
    
    expect(result.current.bubbles.length).toBe(1);
    expect(result.current.bubbles[0].name).toBe('First Bubble');
  });
  
  it('should set selected bubble', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBubbleData());
    
    await waitForNextUpdate();
    
    act(() => {
      result.current.selectBubble(mockData[0]);
    });
    
    expect(result.current.selectedBubble).toEqual(mockData[0]);
  });
});
