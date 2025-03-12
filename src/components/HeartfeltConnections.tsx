
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Heart, UserRound, MapPin, Users, Briefcase, Home, MessagesSquare, Clock, Star } from 'lucide-react';
import { ConnectionNode, ConnectionLink, HeartfeltConnectionsProps } from '@/types/heartfelt';
import ConnectionDetails from './ConnectionDetails';
import { generateSampleData } from '@/utils/heartfeltUtils';

const HeartfeltConnections: React.FC<HeartfeltConnectionsProps> = ({ 
  connections = generateSampleData(),
  width = 800, 
  height = 600,
  onNodeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<ConnectionNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ConnectionNode | null>(null);
  
  // Responsive dimensions
  const [dimensions, setDimensions] = useState({
    width: width,
    height: height
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && svgRef.current.parentElement) {
        const { width, height } = svgRef.current.parentElement.getBoundingClientRect();
        setDimensions({
          width: width,
          height: Math.max(height, 500) // minimum height
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup and render the visualization
  useEffect(() => {
    if (!svgRef.current || connections.nodes.length === 0) return;

    // Clear any previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Set up heart shape
    const heartSize = Math.min(width, height) * 0.8;
    const heartPath = createHeartPath(centerX, centerY, heartSize);
    
    // Add gradient for the heart
    const defs = svg.append("defs");
    
    // Heart gradient
    const heartGradient = defs.append("linearGradient")
      .attr("id", "heartGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
      
    heartGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#FF9AA2")
      .attr("stop-opacity", 1);
      
    heartGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#FFDAC1")
      .attr("stop-opacity", 0.8);

    // World map overlay (simplified)
    const worldMapGroup = svg.append("g")
      .attr("class", "world-map")
      .style("opacity", 0.08);
      
    // Simplified world map representation - would be replaced with actual world map data
    worldMapGroup.append("ellipse")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("rx", heartSize * 0.7)
      .attr("ry", heartSize * 0.4)
      .attr("fill", "none")
      .attr("stroke", "#C7CEEA")
      .attr("stroke-width", 1);
    
    // Create the heart outline
    const heart = svg.append("path")
      .attr("d", heartPath)
      .attr("fill", "url(#heartGradient)")
      .attr("fill-opacity", 0.2)
      .attr("stroke", "#FF9AA2")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7);
    
    // Heart pulsing animation
    function pulseHeart() {
      heart
        .transition()
        .duration(1500)
        .attr("stroke-opacity", 0.9)
        .attr("fill-opacity", 0.3)
        .transition()
        .duration(1500)
        .attr("stroke-opacity", 0.6)
        .attr("fill-opacity", 0.2)
        .on("end", pulseHeart);
    }
    
    pulseHeart();
    
    // Create force simulation
    const forceSimulation = d3.forceSimulation(connections.nodes)
      .force("link", d3.forceLink(connections.links)
        .id((d: any) => d.id)
        .distance(d => {
          // Distance based on relationship strength
          return 100 - ((d as any).strength * 50);
        })
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(centerX, centerY))
      .force("collide", d3.forceCollide().radius(d => (d as ConnectionNode).size + 10))
      // Custom force to constrain nodes within heart shape
      .force("boundary", alpha => {
        connections.nodes.forEach(node => {
          // Get polar coordinates from center
          const dx = node.x! - centerX;
          const dy = node.y! - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          
          // Get max radius for this angle based on heart shape
          const maxRadius = heartDistanceFromCenter(angle, heartSize);
          
          // If outside heart, move back inside
          if (distance > maxRadius * 0.75) {
            const scale = (maxRadius * 0.75) / distance;
            node.x = centerX + dx * scale;
            node.y = centerY + dy * scale;
          }
        });
      });
    
    // Create particle definitions
    connections.links.forEach((link, i) => {
      const particleGradient = defs.append("linearGradient")
        .attr("id", `particleGradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse");
        
      particleGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", getCommunicationColor(link.communicationType));
        
      particleGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", getCommunicationColor(link.communicationType, 0.6));
    });
    
    // Create link elements
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(connections.links)
      .join("line")
      .attr("stroke-width", d => Math.max(1, d.strength * 3))
      .attr("stroke", d => getRelationshipColor(d.type))
      .attr("stroke-opacity", 0.5);
      
    // Particles group
    const particlesGroup = svg.append("g")
      .attr("class", "particles");
      
    // Create node elements
    const nodeGroup = svg.append("g")
      .attr("class", "nodes");
      
    const node = nodeGroup.selectAll("g")
      .data(connections.nodes)
      .join("g")
      .attr("class", "node")
      .call(d3.drag<SVGGElement, ConnectionNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event, d) => {
        setSelectedNode(d);
        if (onNodeClick) onNodeClick(d);
        event.stopPropagation();
      })
      .on("mouseover", (event, d) => setHoveredNode(d))
      .on("mouseout", () => setHoveredNode(null));
    
    // Add circle for each node
    node.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => getNodeFill(d))
      .attr("stroke", d => d3.color(getNodeFill(d))?.darker().toString() || "#999")
      .attr("stroke-width", 1.5);
      
    // Add node icons
    node.append("foreignObject")
      .attr("width", d => d.size * 1.2)
      .attr("height", d => d.size * 1.2)
      .attr("x", d => -d.size * 0.6)
      .attr("y", d => -d.size * 0.6)
      .html(d => {
        const iconColor = d3.color(getNodeFill(d))?.darker().toString() || "#333";
        return `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            <div style="color: ${iconColor}; transform: scale(${d.size / 20});">
              ${getNodeIcon(d.category)}
            </div>
          </div>
        `;
      });
      
    // Add text labels
    node.append("text")
      .attr("dy", d => d.size + 10)
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .attr("font-size", d => Math.max(8, Math.min(12, d.size / 3)))
      .attr("fill", "#333");
      
    // Location indicator
    node.append("text")
      .attr("dy", d => d.size + 20)
      .attr("text-anchor", "middle")
      .text(d => d.location)
      .attr("font-size", "8px")
      .attr("fill", "#666");
      
    // Update positions on simulation tick
    forceSimulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as ConnectionNode).x!)
        .attr("y1", d => (d.source as ConnectionNode).y!)
        .attr("x2", d => (d.target as ConnectionNode).x!)
        .attr("y2", d => (d.target as ConnectionNode).y!);
        
      node.attr("transform", d => `translate(${d.x},${d.y})`);
      
      // Update particles
      updateParticles();
    });
    
    // Background click to deselect
    svg.on("click", () => {
      setSelectedNode(null);
    });
    
    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, ConnectionNode, any>, d: ConnectionNode) {
      if (!event.active) forceSimulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: d3.D3DragEvent<SVGGElement, ConnectionNode, any>, d: ConnectionNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: d3.D3DragEvent<SVGGElement, ConnectionNode, any>, d: ConnectionNode) {
      if (!event.active) forceSimulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Particle animation
    function updateParticles() {
      connections.links.forEach((link, i) => {
        const source = link.source as ConnectionNode;
        const target = link.target as ConnectionNode;
        
        if (!source.x || !source.y || !target.x || !target.y) return;
        
        // Only show particles for active links (when one of the nodes is hovered/selected)
        const isActive = hoveredNode && (
          link.source === hoveredNode || link.target === hoveredNode || 
          link.source === selectedNode || link.target === selectedNode
        );
        
        const frequency = link.frequency || 0.3;
        
        if (isActive && Math.random() < frequency * 0.1) {
          const particleId = `particle-${i}-${Date.now()}`;
          
          // Random position along the link
          const startPos = Math.random();
          
          particlesGroup.append("circle")
            .attr("id", particleId)
            .attr("r", 2 + (link.strength || 0.5) * 2)
            .attr("cx", source.x * (1 - startPos) + target.x * startPos)
            .attr("cy", source.y * (1 - startPos) + target.y * startPos)
            .attr("fill", `url(#particleGradient-${i})`)
            .attr("opacity", 0)
            .transition()
            .duration(2000)
            .attr("cx", source.x * (1 - (startPos + 0.2)) + target.x * (startPos + 0.2))
            .attr("cy", source.y * (1 - (startPos + 0.2)) + target.y * (startPos + 0.2))
            .attr("opacity", 0.8)
            .transition()
            .duration(1000)
            .attr("opacity", 0)
            .remove();
        }
      });
    }
    
    // Highlight connections on hover
    function updateHighlights() {
      if (!hoveredNode && !selectedNode) {
        // Reset all to default
        link.attr("stroke-opacity", 0.5)
            .attr("stroke-width", d => Math.max(1, d.strength * 3));
        node.select("circle")
            .attr("r", d => d.size)
            .attr("stroke-width", 1.5);
        return;
      }
      
      const activeNode = hoveredNode || selectedNode;
      
      // Dim all links initially
      link.attr("stroke-opacity", 0.2)
          .attr("stroke-width", d => Math.max(1, d.strength * 2));
      
      // Highlight connections for active node
      link.filter(d => d.source === activeNode || d.target === activeNode)
          .attr("stroke-opacity", 0.8)
          .attr("stroke-width", d => Math.max(2, d.strength * 4));
          
      // Update node appearances
      node.select("circle")
          .attr("r", d => d === activeNode ? d.size * 1.2 : d.size)
          .attr("stroke-width", d => {
            // Check if this node is connected to the active node
            if (d === activeNode) return 3;
            const isConnected = connections.links.some(link => 
              (link.source === activeNode && link.target === d) || 
              (link.source === d && link.target === activeNode)
            );
            return isConnected ? 2.5 : 1.5;
          });
    }
    
    // Update highlights when selected/hovered node changes
    const highlightInterval = setInterval(updateHighlights, 100);
    
    return () => clearInterval(highlightInterval);
  }, [connections, dimensions, hoveredNode, selectedNode, onNodeClick]);

  // Helper function to create heart path
  function createHeartPath(centerX: number, centerY: number, size: number) {
    // Heart shape is shifted up slightly from center
    const adjustedY = centerY - size * 0.05;
    
    // Create heart shape using bezier curves
    return `
      M ${centerX} ${adjustedY + size * 0.3}
      C ${centerX + size * 0.4} ${adjustedY - size * 0.05}, 
        ${centerX + size * 0.5} ${adjustedY + size * 0.1}, 
        ${centerX} ${adjustedY + size * 0.5}
      C ${centerX - size * 0.5} ${adjustedY + size * 0.1}, 
        ${centerX - size * 0.4} ${adjustedY - size * 0.05}, 
        ${centerX} ${adjustedY + size * 0.3}
    `;
  }
  
  // Helper function to calculate heart boundary distance from center
  function heartDistanceFromCenter(angle: number, size: number) {
    // Simplified heart shape in polar coordinates
    const heartFactor = Math.abs(Math.sin(angle)) * Math.cos(angle) * Math.sin(angle);
    const baseRadius = size * 0.4;
    return baseRadius + heartFactor * size * 0.1;
  }
  
  // Helper function to get relationship color
  function getRelationshipColor(type: string) {
    switch (type) {
      case 'family': return '#FF9AA2';
      case 'friend': return '#FFB7B2';
      case 'colleague': return '#C7CEEA';
      case 'romantic': return '#E2F0CB';
      case 'mentor': return '#B5EAD7';
      default: return '#FFDAC1';
    }
  }
  
  // Helper function to get node fill color
  function getNodeFill(node: ConnectionNode) {
    const baseColor = getRelationshipColor(node.type);
    
    // Adjust saturation and brightness based on relationship depth
    const depth = node.depth || 0.5;
    const color = d3.hsl(baseColor);
    
    // Deeper relationships are more saturated
    color.s = Math.min(1, color.s + depth * 0.3);
    
    // Active relationships are brighter
    const recency = node.recency || 0.5;
    color.l = Math.max(0.4, Math.min(0.7, color.l + (recency - 0.5) * 0.2));
    
    return color.toString();
  }
  
  // Helper function to get communication color
  function getCommunicationColor(type: string, opacity = 1) {
    switch (type) {
      case 'text': return `rgba(255, 170, 162, ${opacity})`;
      case 'phone': return `rgba(199, 206, 234, ${opacity})`;
      case 'email': return `rgba(226, 240, 203, ${opacity})`;
      case 'inPerson': return `rgba(181, 234, 215, ${opacity})`;
      default: return `rgba(255, 218, 193, ${opacity})`;
    }
  }
  
  // Helper function to get icon HTML based on category
  function getNodeIcon(category: string) {
    const iconSize = 16;
    switch (category) {
      case 'person': return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`;
      case 'location': return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
      case 'family': return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9V5a2 2 0 0 1 2-2h2"/><path d="M19 9V5a2 2 0 0 0-2-2h-2"/></svg>`;
      case 'work': return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
      default: return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v2"/><path d="M8 9v2"/><path d="M12 12v2"/></svg>`;
    }
  }

  return (
    <div className="heartfelt-container relative w-full h-full min-h-[500px]">
      <svg 
        ref={svgRef}
        width={dimensions.width} 
        height={dimensions.height}
        className="w-full h-full"
      />
      
      {selectedNode && (
        <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-80 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <ConnectionDetails node={selectedNode} connections={connections} />
        </div>
      )}
    </div>
  );
};

export default HeartfeltConnections;
