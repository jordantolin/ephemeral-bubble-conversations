
import { ConnectionNode, ConnectionLink } from '@/types/heartfelt';

/**
 * Generates sample connection data for the Heartfelt Connections visualization
 */
export function generateSampleData() {
  // Create sample nodes
  const nodes: ConnectionNode[] = [
    // Family connections
    {
      id: 'mom',
      name: 'Mom',
      type: 'family',
      category: 'person',
      size: 30,
      depth: 0.9,
      recency: 0.95,
      location: 'Chicago, IL',
      lastContact: '2 days ago',
      description: 'My biggest supporter and confidant. We speak almost daily.'
    },
    {
      id: 'dad',
      name: 'Dad',
      type: 'family',
      category: 'person',
      size: 28,
      depth: 0.85,
      recency: 0.8,
      location: 'Chicago, IL',
      lastContact: '1 week ago',
      description: 'Always there with wisdom and advice when I need it most.'
    },
    {
      id: 'sister',
      name: 'Sister',
      type: 'family',
      category: 'person',
      size: 25,
      depth: 0.78,
      recency: 0.9,
      location: 'New York, NY',
      lastContact: '3 days ago',
      description: 'We've grown closer as adults despite the distance.'
    },
    
    // Close friends
    {
      id: 'alex',
      name: 'Alex',
      type: 'friend',
      category: 'person',
      size: 26,
      depth: 0.85,
      recency: 0.7,
      location: 'Boston, MA',
      lastContact: '2 weeks ago',
      description: 'Best friend since college. We've been through everything together.'
    },
    {
      id: 'jamie',
      name: 'Jamie',
      type: 'friend',
      category: 'person',
      size: 24,
      depth: 0.75,
      recency: 0.85,
      location: 'Seattle, WA',
      lastContact: '5 days ago',
      description: 'A newer friendship that quickly became important in my life.'
    },
    {
      id: 'taylor',
      name: 'Taylor',
      type: 'friend',
      category: 'person',
      size: 22,
      depth: 0.7,
      recency: 0.6,
      location: 'Portland, OR',
      lastContact: '3 weeks ago',
      description: 'We bonded over shared creative interests.'
    },
    
    // Work connections
    {
      id: 'boss',
      name: 'Morgan',
      type: 'colleague',
      category: 'work',
      size: 20,
      depth: 0.6,
      recency: 0.95,
      location: 'San Francisco, CA',
      lastContact: '1 day ago',
      description: 'My mentor at work who has helped guide my career.'
    },
    {
      id: 'coworker1',
      name: 'Casey',
      type: 'colleague',
      category: 'work',
      size: 18,
      depth: 0.5,
      recency: 0.9,
      location: 'San Francisco, CA',
      lastContact: '1 day ago',
      description: 'We collaborate daily and have become friends outside work.'
    },
    {
      id: 'coworker2',
      name: 'Jordan',
      type: 'colleague',
      category: 'work',
      size: 16,
      depth: 0.4,
      recency: 0.8,
      location: 'San Francisco, CA',
      lastContact: '3 days ago',
      description: 'A friendly presence in the office and occasional lunch companion.'
    },
    
    // Significant places
    {
      id: 'hometown',
      name: 'Hometown',
      type: 'place',
      category: 'location',
      size: 24,
      depth: 0.8,
      recency: 0.3,
      location: 'Chicago, IL',
      description: 'Where I grew up and still feel most at home.'
    },
    {
      id: 'college',
      name: 'University',
      type: 'place',
      category: 'location',
      size: 22,
      depth: 0.7,
      recency: 0.5,
      location: 'Boston, MA',
      description: 'Where I discovered myself and formed lifelong friendships.'
    },
    {
      id: 'park',
      name: 'Central Park',
      type: 'place',
      category: 'location',
      size: 18,
      depth: 0.5,
      recency: 0.6,
      location: 'New York, NY',
      description: 'My favorite place to reflect and find peace in the city.'
    },
    
    // Romantic connection
    {
      id: 'partner',
      name: 'Sam',
      type: 'romantic',
      category: 'person',
      size: 32,
      depth: 0.95,
      recency: 0.99,
      location: 'San Francisco, CA',
      lastContact: 'Today',
      description: 'My partner and closest confidant in all things.'
    },
    
    // Mentor
    {
      id: 'professor',
      name: 'Dr. Williams',
      type: 'mentor',
      category: 'person',
      size: 20,
      depth: 0.65,
      recency: 0.4,
      location: 'Boston, MA',
      lastContact: '2 months ago',
      description: 'My college professor who still offers guidance and wisdom.'
    },
  ];
  
  // Create links between nodes
  const links: ConnectionLink[] = [
    // Family connections
    { source: 'mom', target: 'dad', type: 'family', strength: 0.9, communicationType: 'phone', frequency: 0.8 },
    { source: 'mom', target: 'sister', type: 'family', strength: 0.85, communicationType: 'text', frequency: 0.7 },
    { source: 'dad', target: 'sister', type: 'family', strength: 0.8, communicationType: 'phone', frequency: 0.6 },
    
    // Friend connections
    { source: 'alex', target: 'jamie', type: 'friend', strength: 0.7, communicationType: 'text', frequency: 0.5 },
    { source: 'alex', target: 'taylor', type: 'friend', strength: 0.6, communicationType: 'text', frequency: 0.4 },
    
    // Work connections
    { source: 'boss', target: 'coworker1', type: 'colleague', strength: 0.7, communicationType: 'email', frequency: 0.9 },
    { source: 'coworker1', target: 'coworker2', type: 'colleague', strength: 0.6, communicationType: 'inPerson', frequency: 0.8 },
    { source: 'boss', target: 'coworker2', type: 'colleague', strength: 0.5, communicationType: 'email', frequency: 0.6 },
    
    // Personal connections to self
    { source: 'partner', target: 'mom', type: 'family', strength: 0.8, communicationType: 'phone', frequency: 0.6 },
    { source: 'partner', target: 'dad', type: 'family', strength: 0.75, communicationType: 'phone', frequency: 0.5 },
    { source: 'partner', target: 'sister', type: 'family', strength: 0.7, communicationType: 'text', frequency: 0.6 },
    { source: 'partner', target: 'alex', type: 'friend', strength: 0.85, communicationType: 'inPerson', frequency: 0.7 },
    
    // Friend to family connections
    { source: 'alex', target: 'mom', type: 'friend', strength: 0.4, communicationType: 'text', frequency: 0.2 },
    { source: 'alex', target: 'sister', type: 'friend', strength: 0.6, communicationType: 'text', frequency: 0.5 },
    
    // Work and social crossover
    { source: 'coworker1', target: 'alex', type: 'friend', strength: 0.5, communicationType: 'text', frequency: 0.3 },
    
    // Places connections
    { source: 'mom', target: 'hometown', type: 'place', strength: 0.9, communicationType: 'inPerson', frequency: 0.5 },
    { source: 'dad', target: 'hometown', type: 'place', strength: 0.9, communicationType: 'inPerson', frequency: 0.5 },
    { source: 'sister', target: 'hometown', type: 'place', strength: 0.8, communicationType: 'inPerson', frequency: 0.3 },
    { source: 'alex', target: 'college', type: 'place', strength: 0.8, communicationType: 'inPerson', frequency: 0.2 },
    { source: 'professor', target: 'college', type: 'place', strength: 0.9, communicationType: 'inPerson', frequency: 0.5 },
    { source: 'sister', target: 'park', type: 'place', strength: 0.7, communicationType: 'inPerson', frequency: 0.4 },
    
    // Mentor connections
    { source: 'professor', target: 'alex', type: 'mentor', strength: 0.6, communicationType: 'email', frequency: 0.3 },
    
    // More connections for density
    { source: 'partner', target: 'park', type: 'place', strength: 0.7, communicationType: 'inPerson', frequency: 0.6 },
    { source: 'jamie', target: 'taylor', type: 'friend', strength: 0.8, communicationType: 'text', frequency: 0.7 },
  ];
  
  return { nodes, links };
}
