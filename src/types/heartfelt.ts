
import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export interface ConnectionNode extends SimulationNodeDatum {
  id: string;
  name: string;
  type: string;          // family, friend, colleague, romantic, mentor
  category: string;      // person, location, experience, work
  size: number;          // visual size, corresponds to significance
  depth: number;         // 0-1 representing depth of relationship
  recency: number;       // 0-1 representing how recent (1 = very recent)
  location: string;      // geographic location
  lastContact?: string;  // date of last contact
  description?: string;  // short description of the relationship
  x?: number;            // d3 positioning
  y?: number;            // d3 positioning
  fx?: number | null;    // fixed x position (null if not fixed)
  fy?: number | null;    // fixed y position (null if not fixed)
}

export interface ConnectionLink extends SimulationLinkDatum<ConnectionNode> {
  source: ConnectionNode | string;
  target: ConnectionNode | string;
  type: string;              // relationship type
  strength: number;          // 0-1 representing connection strength
  communicationType: string; // text, phone, email, inPerson
  frequency: number;         // 0-1 representing frequency of communication
}

export interface HeartfeltConnectionsProps {
  connections?: {
    nodes: ConnectionNode[];
    links: ConnectionLink[];
  };
  width?: number;
  height?: number;
  onNodeClick?: (node: ConnectionNode) => void;
}
