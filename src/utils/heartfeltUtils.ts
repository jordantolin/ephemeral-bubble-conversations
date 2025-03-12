import { ConnectionNode, ConnectionLink } from '@/types/heartfelt';

// Generate a heart shape for nodes
export const generateHeartShape = (count: number, width: number, height: number): [number, number][] => {
  const points: [number, number][] = [];
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) * 0.4; // Scale to fit within the container
  
  // Generate points along a heart curve
  for (let i = 0; i < count; i++) {
    const t = (i / count) * 2 * Math.PI;
    
    // Heart curve parametric equations
    // x = 16 * sin(t)^3
    // y = 13 * cos(t) - 5 * cos(2t) - 2 * cos(3t) - cos(4t)
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    
    // Scale and position the heart
    const scaledX = centerX + (x * scale / 16);
    const scaledY = centerY - (y * scale / 16); // Subtract because SVG y increases downward
    
    points.push([scaledX, scaledY]);
  }
  
  return points;
};

// Generate sample connection data for demo purposes
export const generateSampleConnections = (): { nodes: ConnectionNode[], links: ConnectionLink[] } => {
  // Sample nodes representing important connections
  const nodes: ConnectionNode[] = [
    { 
      id: "1", name: "Sarah", type: "family", category: "person", 
      size: 25, depth: 0.9, recency: 0.95, location: "Chicago" 
    },
    { 
      id: "2", name: "Michael", type: "romantic", category: "person", 
      size: 30, depth: 1.0, recency: 1.0, location: "Chicago" 
    },
    { 
      id: "3", name: "College Friends", type: "friend", category: "person", 
      size: 20, depth: 0.8, recency: 0.7, location: "Boston" 
    },
    { 
      id: "4", name: "Childhood Home", type: "location", category: "location", 
      size: 18, depth: 0.9, recency: 0.3, location: "Portland" 
    },
    { 
      id: "5", name: "First Job", type: "work", category: "experience", 
      size: 15, depth: 0.6, recency: 0.2, location: "Seattle" 
    },
    { 
      id: "6", name: "Mom", type: "family", category: "person", 
      size: 28, depth: 1.0, recency: 0.9, location: "Portland" 
    },
    { 
      id: "7", name: "Dad", type: "family", category: "person", 
      size: 26, depth: 0.9, recency: 0.85, location: "Portland" 
    },
    { 
      id: "8", name: "Alex", type: "friend", category: "person", 
      size: 22, depth: 0.8, recency: 0.9, location: "Chicago" 
    },
    { 
      id: "9", name: "European Trip", type: "experience", category: "experience", 
      size: 20, depth: 0.95, recency: 0.6, location: "Paris" 
    },
    { 
      id: "10", name: "Mentor", type: "mentor", category: "person", 
      size: 18, depth: 0.7, recency: 0.8, location: "New York" 
    },
    { 
      id: "11", name: "Current Company", type: "work", category: "work", 
      size: 22, depth: 0.8, recency: 1.0, location: "Chicago" 
    },
    { 
      id: "12", name: "College", type: "experience", category: "location", 
      size: 20, depth: 0.8, recency: 0.4, location: "Boston" 
    }
  ];
  
  // Links between nodes representing relationships
  const links: ConnectionLink[] = [
    { source: "2", target: "1", type: "romantic", strength: 0.95, communicationType: "inPerson", frequency: 0.9 },
    { source: "1", target: "8", type: "friendship", strength: 0.8, communicationType: "text", frequency: 0.7 },
    { source: "6", target: "7", type: "family", strength: 0.9, communicationType: "phone", frequency: 0.8 },
    { source: "1", target: "6", type: "family", strength: 0.9, communicationType: "phone", frequency: 0.7 },
    { source: "1", target: "7", type: "family", strength: 0.85, communicationType: "phone", frequency: 0.6 },
    { source: "1", target: "4", type: "location", strength: 0.7, communicationType: "inPerson", frequency: 0.3 },
    { source: "1", target: "11", type: "work", strength: 0.8, communicationType: "inPerson", frequency: 0.9 },
    { source: "10", target: "11", type: "work", strength: 0.6, communicationType: "email", frequency: 0.5 },
    { source: "1", target: "10", type: "mentor", strength: 0.7, communicationType: "text", frequency: 0.6 },
    { source: "1", target: "3", type: "friendship", strength: 0.8, communicationType: "text", frequency: 0.5 },
    { source: "3", target: "12", type: "location", strength: 0.9, communicationType: "inPerson", frequency: 0.4 },
    { source: "1", target: "12", type: "location", strength: 0.8, communicationType: "inPerson", frequency: 0.2 },
    { source: "1", target: "9", type: "experience", strength: 0.85, communicationType: "inPerson", frequency: 0.1 },
    { source: "8", target: "11", type: "work", strength: 0.6, communicationType: "inPerson", frequency: 0.8 },
    { source: "2", target: "9", type: "experience", strength: 0.9, communicationType: "inPerson", frequency: 0.1 },
    { source: "1", target: "5", type: "work", strength: 0.5, communicationType: "inPerson", frequency: 0.1 }
  ];
  
  return { nodes, links };
};

// Function to get color based on relationship type
export const getRelationshipColor = (type: string): string => {
  const colors: Record<string, string> = {
    family: '#FF9AA2',      // Soft pink
    romantic: '#FF6B6B',    // Red-pink
    friend: '#C7CEEA',      // Soft blue
    colleague: '#B5EAD7',   // Mint green
    mentor: '#FFD166',      // Gold yellow
    work: '#A0C4FF',        // Light blue
    location: '#FFDAC1',    // Peach
    experience: '#E2F0CB'   // Light green
  };
  
  return colors[type] || '#BBBBBB'; // Default gray
};

// Function to calculate link strength for visual representation
export const calculateLinkStrength = (link: ConnectionLink): number => {
  // Combine frequency and strength for visual weight
  return (link.strength + link.frequency) / 2;
};

// Export the generateSampleData function that's required in HeartfeltConnections
export const generateSampleData = (): { nodes: ConnectionNode[], links: ConnectionLink[] } => {
  // This function will call the existing generateSampleConnections function
  return generateSampleConnections();
};
