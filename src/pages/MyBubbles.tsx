
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Search, User, TrendingUp, Sparkles, ArrowRight, Clock, Calendar, ExternalLink, MessageSquare, Users, Info, X } from "lucide-react";
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const MyBubbles = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const animationFrameRef = useRef<number>();
  const [selectedBubble, setSelectedBubble] = useState<BubbleData | null>(null);
  const [selectedTab, setSelectedTab] = useState<"recent" | "participated" | "reflected">("recent");
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Query for recent bubbles (last 24 hours)
  const { data: recentBubbles = [], isLoading: isLoadingRecent } = useQuery({
    queryKey: ['bubbles', 'recent'],
    queryFn: async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      return data.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    },
    refetchInterval: 30000 // Refetch every 30 seconds to ensure data is fresh
  });

  // Query for bubbles the user has participated in (sent messages to)
  const { data: participatedBubbles = [], isLoading: isLoadingParticipated } = useQuery({
    queryKey: ['bubbles', 'participated', profile?.username],
    queryFn: async () => {
      if (!profile?.username) return [];
      
      // Get all message authors for this user
      const { data: messages, error: msgError } = await supabase
        .from('bubble_messages')
        .select('bubble_id')
        .eq('username', profile.username)
        .order('created_at', { ascending: false });
      
      if (msgError) throw msgError;
      
      if (messages.length === 0) return [];
      
      // Get unique bubble IDs
      const uniqueBubbleIds = [...new Set(messages.map(msg => msg.bubble_id))];
      
      // Fetch the bubble details
      const { data: bubbles, error: bubbleError } = await supabase
        .from('bubbles')
        .select('*')
        .in('id', uniqueBubbleIds);
      
      if (bubbleError) throw bubbleError;
      
      return bubbles.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    },
    enabled: !!profile?.username,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Query for bubbles the user has reflected
  const { data: reflectedBubbles = [], isLoading: isLoadingReflected } = useQuery({
    queryKey: ['bubbles', 'reflected', profile?.username],
    queryFn: async () => {
      if (!profile?.username) return [];
      
      // Get all reflects by this user
      const { data: reflects, error: reflectError } = await supabase
        .from('reflects')
        .select('bubble_id')
        .eq('username', profile.username);
      
      if (reflectError) throw reflectError;
      
      if (reflects.length === 0) return [];
      
      // Get unique bubble IDs
      const bubbleIds = reflects.map(reflect => reflect.bubble_id);
      
      // Fetch the bubble details
      const { data: bubbles, error: bubbleError } = await supabase
        .from('bubbles')
        .select('*')
        .in('id', bubbleIds);
      
      if (bubbleError) throw bubbleError;
      
      return bubbles.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    },
    enabled: !!profile?.username,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Log bubble data for debugging
  useEffect(() => {
    console.log("Current tab:", selectedTab);
    console.log("Recent bubbles:", recentBubbles);
    console.log("Participated bubbles:", participatedBubbles);
    console.log("Reflected bubbles:", reflectedBubbles);
    console.log("Active bubbles:", activeBubbles);
  }, [selectedTab, recentBubbles, participatedBubbles, reflectedBubbles]);

  // Determine which bubbles to display in the 3D world based on active tab
  const getActiveBubbles = () => {
    let bubbles: BubbleData[] = [];
    
    switch (selectedTab) {
      case "recent":
        bubbles = recentBubbles;
        break;
      case "participated":
        bubbles = participatedBubbles;
        break;
      case "reflected":
        bubbles = reflectedBubbles;
        break;
    }
    
    // Apply search filter if there's a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return bubbles.filter(bubble => 
        bubble.name.toLowerCase().includes(query) || 
        bubble.topic.toLowerCase().includes(query) ||
        (bubble.description && bubble.description.toLowerCase().includes(query))
      );
    }
    
    return bubbles;
  };

  const activeBubbles = getActiveBubbles();
  const isLoading = isLoadingRecent || isLoadingParticipated || isLoadingReflected;

  // Fetch messages for the selected bubble to show preview
  const { data: bubbleMessages = [] } = useQuery({
    queryKey: ['bubble-messages', selectedBubble?.id],
    queryFn: async () => {
      if (!selectedBubble) return [];
      
      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .eq('bubble_id', selectedBubble.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      
      return data;
    },
    enabled: !!selectedBubble
  });

  // Get counts of participants for all bubbles
  const { data: participantCounts = {} } = useQuery({
    queryKey: ['bubble-participants'],
    queryFn: async () => {
      const allBubbles = [...recentBubbles, ...participatedBubbles, ...reflectedBubbles];
      
      if (allBubbles.length === 0) return {};
      
      // Get unique bubble IDs
      const uniqueBubbleIds = [...new Set(allBubbles.map(b => b.id))];
      
      const { data, error } = await supabase
        .from('bubble_messages')
        .select('bubble_id, username')
        .in('bubble_id', uniqueBubbleIds);
      
      if (error) throw error;
      
      // Count unique usernames per bubble
      const counts: Record<string, number> = {};
      
      uniqueBubbleIds.forEach(id => {
        const messages = data.filter(msg => msg.bubble_id === id);
        const uniqueUsernames = [...new Set(messages.map(msg => msg.username))];
        counts[id] = uniqueUsernames.length;
      });
      
      return counts;
    },
    enabled: recentBubbles.length > 0 || participatedBubbles.length > 0 || reflectedBubbles.length > 0
  });

  // Check if a user has reflected a bubble
  const { data: userReflects = [], isLoading: isLoadingUserReflects } = useQuery({
    queryKey: ['user-reflects', profile?.username],
    queryFn: async () => {
      if (!profile?.username) return [];
      
      const { data, error } = await supabase
        .from('reflects')
        .select('bubble_id')
        .eq('username', profile.username);
      
      if (error) throw error;
      
      return data.map(reflect => reflect.bubble_id);
    },
    enabled: !!profile?.username
  });

  const hasUserReflected = (bubbleId: string) => {
    return userReflects.some(id => id === bubbleId);
  };

  // Reflect on a bubble
  const handleReflect = async (bubbleId: string) => {
    if (!user || !profile?.username) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    if (hasUserReflected(bubbleId)) {
      toast({
        title: "Already reflected",
        description: "You have already reflected this bubble",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('reflects')
        .insert({
          bubble_id: bubbleId,
          username: profile.username
        });
      
      if (error) throw error;
      
      toast({
        title: "Bubble reflected!",
        description: "This bubble will appear in your reflections"
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      queryClient.invalidateQueries({ queryKey: ['user-reflects'] });
      queryClient.invalidateQueries({ queryKey: ['bubble', bubbleId] });
    } catch (error: any) {
      console.error("Error reflecting bubble:", error);
      toast({
        title: "Error",
        description: "Failed to reflect bubble. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Create 3D bubble visualization
  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log("Initializing 3D scene with bubbles:", activeBubbles);
    
    // Even if there are no active bubbles, create the scene so we can at least see the container
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Use a smaller radius to ensure bubbles stay inside the visible container
    const radius = Math.min(width, height) / 3;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Adjust camera position to be closer for better visibility
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.z = 12; // Moved closer for better visibility
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8); // Increased intensity
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    // Create the container circle with solid fill
    const circleGeometry = new THREE.CircleGeometry(radius, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xebbd34,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    scene.add(circle);

    // Add visible border ring
    const ringGeometry = new THREE.RingGeometry(radius - 0.1, radius, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xebbd34,
      opacity: 0.8,
      transparent: true,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(ring);

    // Create info text if no bubbles
    if (activeBubbles.length === 0 && !isLoading) {
      const createInfoText = (message: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        
        context.fillStyle = 'transparent';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'bold 36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.shadowColor = 'rgba(0,0,0,0.8)';
        context.shadowBlur = 8;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        context.strokeStyle = 'rgba(0,0,0,0.8)';
        context.lineWidth = 6;
        context.strokeText(message, canvas.width/2, canvas.height/2);
        
        context.fillStyle = '#ebbd34';
        context.fillText(message, canvas.width/2, canvas.height/2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          depthTest: false
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(5, 2.5, 1);
        
        return sprite;
      };

      // Add hint text
      const noDataMessage = selectedTab === "recent" 
        ? "No recent bubbles found" 
        : selectedTab === "participated" 
          ? "You haven't chatted in any bubbles yet" 
          : "No reflected bubbles found";
      
      const infoText = createInfoText(noDataMessage);
      scene.add(infoText);
    }

    // Determine number of bubbles to adjust spacing
    const bubbleCount = activeBubbles.length;
    
    // Calculate optimal spacing between bubbles based on count
    // Cap the placement radius to ensure visibility
    const placementRadius = Math.min(radius * 0.65, Math.max(radius * 0.4, radius * (bubbleCount <= 5 ? 0.4 : 0.55)));
    
    // Calculate optimal bubble sizes based on count
    const getSizeMultiplier = () => {
      if (bubbleCount <= 5) return 1.8; // Very large bubbles for few items
      if (bubbleCount <= 10) return 1.5; // Large bubbles for small count
      if (bubbleCount <= 15) return 1.3; // Medium-large bubbles
      if (bubbleCount <= 20) return 1.2; // Medium bubbles
      return 1.1; // Slightly larger than default for many bubbles
    };
    
    const sizeMultiplier = getSizeMultiplier();

    // Create and position bubbles
    activeBubbles.forEach((bubble, index) => {
      const group = new THREE.Group();
      
      // Larger base sizes for better visibility
      const baseSize = (bubble.size === 'lg' ? 0.9 : 
                       bubble.size === 'md' ? 0.75 : 0.6) * sizeMultiplier;
                       
      const reflectScale = 1 + (bubble.reflect_count * 0.05);
      const finalSize = baseSize * reflectScale;
      
      // Check if bubble is expired
      const isExpired = new Date(bubble.expires_at) < new Date();
      
      // Create bubble sphere
      const geometry = new THREE.SphereGeometry(finalSize, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: isExpired ? 0x888888 : 0xebbd34,
        transparent: true,
        opacity: isExpired ? 0.5 : 0.8, // Increased opacity for better visibility
        metalness: 0.2,
        roughness: 0.1,
        transmission: isExpired ? 0.1 : 0.3,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });
      
      // Add light shimmer effect to bubbles
      if (!isExpired) {
        material.emissive = new THREE.Color(0xebbd34);
        material.emissiveIntensity = 0.2;
      }
      
      const bubble3D = new THREE.Mesh(geometry, material);
      group.add(bubble3D);

      // Add text sprites with larger font sizes for better readability
      const createSprite = (text: string, yOffset: number, color = '#FFFFFF', fontSize = 32) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Double canvas size for clearer text
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        
        context.fillStyle = 'transparent';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Use larger, bolder text for better visibility
        context.font = `bold ${fontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add stronger text shadow for better contrast
        context.shadowColor = 'rgba(0,0,0,0.8)';
        context.shadowBlur = 8;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        // Stroke border around text for better readability
        context.strokeStyle = 'rgba(0,0,0,0.8)';
        context.lineWidth = 6;
        context.strokeText(text, canvas.width/2, canvas.height/2);
        
        // Fill text
        context.fillStyle = color;
        context.fillText(text, canvas.width/2, canvas.height/2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter; // Improve text quality
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          depthTest: false // Make text always visible
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Scale sprite for better visibility
        sprite.scale.set(
          finalSize * 2.5, // Wider for text
          finalSize * 1.2, 
          1
        );
        
        sprite.position.y = yOffset * finalSize;
        return sprite;
      };

      // Add bubble name (larger font size)
      group.add(createSprite(bubble.name, 1.6, isExpired ? '#CCCCCC' : '#FFFFFF', 38));
      
      // Add topic text
      group.add(createSprite(bubble.topic, 0.5, isExpired ? '#BBBBBB' : '#F5F5F5', 28));
      
      // Add reflect count
      group.add(createSprite(`✨ ${bubble.reflect_count}`, -0.6, isExpired ? '#AAAAAA' : '#FFFFE0', 32));
      
      // For expired bubbles, add "EXPLODED" text more prominently
      if (isExpired) {
        group.add(createSprite(`EXPLODED`, -1.6, '#FF5555', 36));
      }

      // More evenly distribute bubbles in a spiral pattern
      const bubbleAngle = (index / bubbleCount) * Math.PI * 2;
      const spiralOffset = (index / bubbleCount) * (placementRadius * 0.5);
      const distanceFromCenter = Math.max(placementRadius * 0.3, 
                                         Math.min(placementRadius, placementRadius - spiralOffset));
      
      // Place bubbles in more readable pattern
      group.position.x = Math.cos(bubbleAngle) * distanceFromCenter;
      group.position.y = Math.sin(bubbleAngle) * distanceFromCenter;
      group.position.z = 0; // Keep all bubbles on same z plane for better visibility
      
      // Initial velocity - slower for better readability
      const speed = 0.005 + (Math.random() * 0.005); // Reduced speed for better focus
      const randomAngle = Math.random() * Math.PI * 2;
      group.userData = {
        vx: Math.cos(randomAngle) * speed,
        vy: Math.sin(randomAngle) * speed,
        id: bubble.id,
        isExpired: isExpired,
        // Add hover animation data
        hoverAnimation: {
          active: false,
          scale: 1.0,
          originalScale: finalSize,
          glowIntensity: isExpired ? 0 : 0.2
        }
      };

      bubblesRef.current[bubble.id] = group;
      scene.add(group);
    });

    // Make bubbles gently hover in place instead of moving too much
    const animate = () => {
      Object.values(bubblesRef.current).forEach(group => {
        // Update position with much gentler movement
        group.position.x += group.userData.vx * 0.6;
        group.position.y += group.userData.vy * 0.6;

        // Circle boundary collision with strict containment
        const distance = Math.sqrt(
          group.position.x * group.position.x + 
          group.position.y * group.position.y
        );
        
        const maxRadius = radius * 0.7; // Keep within 70% of circle radius
        if (distance > maxRadius) {
          // Push back inside the circle
          const angle = Math.atan2(group.position.y, group.position.x);
          group.position.x = maxRadius * Math.cos(angle);
          group.position.y = maxRadius * Math.sin(angle);
          
          // Bounce with increased damping for smoother movement
          const normal = new THREE.Vector2(
            group.position.x / distance,
            group.position.y / distance
          );
          const dot = normal.x * group.userData.vx + normal.y * group.userData.vy;
          group.userData.vx = (group.userData.vx - 2 * dot * normal.x) * 0.7;
          group.userData.vy = (group.userData.vy - 2 * dot * normal.y) * 0.7;
        }

        // Bubble collisions with gentle pushing behavior
        Object.values(bubblesRef.current).forEach(otherGroup => {
          if (group === otherGroup) return;

          const dx = otherGroup.position.x - group.position.x;
          const dy = otherGroup.position.y - group.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Larger minimum distance to prevent overlap
          const minDistance = 2.2;
          if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            const pushX = Math.cos(angle) * (minDistance - distance) * 0.4;
            const pushY = Math.sin(angle) * (minDistance - distance) * 0.4;
            
            group.position.x -= pushX;
            group.position.y -= pushY;
            otherGroup.position.x += pushX;
            otherGroup.position.y += pushY;
            
            // Gently exchange velocities for natural movement
            const tempVx = group.userData.vx;
            const tempVy = group.userData.vy;
            group.userData.vx = otherGroup.userData.vx * 0.9;
            group.userData.vy = otherGroup.userData.vy * 0.9;
            otherGroup.userData.vx = tempVx * 0.9;
            otherGroup.userData.vy = tempVy * 0.9;
          }
        });

        // Keep text facing camera
        group.quaternion.copy(camera.quaternion);

        // Very gentle floating effect
        group.userData.vy += Math.sin(Date.now() / 3000) * 0.00002;
        group.userData.vx += Math.cos(Date.now() / 3000) * 0.00002;

        // Strong velocity damping for more stable positions
        group.userData.vx *= 0.98;
        group.userData.vy *= 0.98;
        
        // Add jittery effect to expired bubbles
        if (group.userData.isExpired) {
          group.position.x += (Math.random() - 0.5) * 0.005;
          group.position.y += (Math.random() - 0.5) * 0.005;
        }
        
        // Apply hover animation if active
        if (group.userData.hoverAnimation?.active) {
          const bubbleMesh = group.children[0] as THREE.Mesh;
          if (bubbleMesh.material instanceof THREE.MeshPhysicalMaterial && !group.userData.isExpired) {
            bubbleMesh.material.emissiveIntensity = 
              0.2 + Math.sin(Date.now() / 300) * 0.1; // Pulsing glow effect
          }
        }
      });

      renderer.render(scene, camera);
      TWEEN.update();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Track mouse position for hover effects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredBubble: THREE.Group | null = null;
    
    const onMouseMove = (event: MouseEvent) => {
      // Calculate mouse position in normalized device coordinates
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);
      
      // Calculate objects intersecting the picking ray
      const bubbleMeshes = Object.values(bubblesRef.current).map(group => group.children[0]);
      const intersects = raycaster.intersectObjects(bubbleMeshes, true);
      
      // Reset previous hover effects
      if (hoveredBubble && (!intersects.length || 
          intersects[0].object.parent !== hoveredBubble)) {
        
        // Remove hover effect from previously hovered bubble
        const bubbleMesh = hoveredBubble.children[0] as THREE.Mesh;
        if (bubbleMesh.material instanceof THREE.MeshPhysicalMaterial) {
          // Reset glow
          bubbleMesh.material.emissiveIntensity = 
            hoveredBubble.userData.isExpired ? 0 : 0.2;
        }
        hoveredBubble.userData.hoverAnimation.active = false;
        
        // Reset cursor
        document.body.style.cursor = 'default';
        hoveredBubble = null;
      }
      
      // Apply hover effect to newly hovered bubble
      if (intersects.length > 0) {
        const object = intersects[0].object;
        const parent = object.parent as THREE.Group;
        
        if (parent && parent.userData?.id) {
          hoveredBubble = parent;
          
          // Scale effect and glow
          const bubbleMesh = object as THREE.Mesh;
          if (bubbleMesh.material instanceof THREE.MeshPhysicalMaterial && !parent.userData.isExpired) {
            bubbleMesh.material.emissiveIntensity = 0.5; // Enhanced glow
          }
          
          // Set hover animation flag
          parent.userData.hoverAnimation.active = true;
          
          // Change cursor to pointer
          document.body.style.cursor = 'pointer';
          
          // Scale the sprites (text) slightly
          for (let i = 1; i < parent.children.length; i++) {
            const sprite = parent.children[i] as THREE.Sprite;
            const pulseFactor = 1 + Math.sin(Date.now() / 300) * 0.03;
            sprite.scale.multiplyScalar(pulseFactor);
          }
        }
      }
    };

    // Click handling
    const onClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / width) * 2 - 1,
        -((event.clientY - rect.top) / height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const bubbleMeshes = Object.values(bubblesRef.current).map(group => group.children[0]);
      const intersects = raycaster.intersectObjects(bubbleMeshes, true);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const parent = obj.parent as THREE.Group;
        
        if (parent && parent.userData?.id) {
          const bubble = activeBubbles.find(b => b.id === parent.userData.id);
          if (bubble) {
            // Create click feedback animation
            const bubbleMesh = obj as THREE.Mesh;
            
            // Animate bubble scale
            const scaleTween = new TWEEN.Tween({ scale: 1 })
              .to({ scale: 1.2 }, 150)
              .easing(TWEEN.Easing.Quadratic.Out)
              .onUpdate(({ scale }) => {
                bubbleMesh.scale.set(scale, scale, scale);
              })
              .onComplete(() => {
                // Return to original scale
                new TWEEN.Tween({ scale: 1.2 })
                  .to({ scale: 1 }, 150)
                  .easing(TWEEN.Easing.Quadratic.In)
                  .onUpdate(({ scale }) => {
                    bubbleMesh.scale.set(scale, scale, scale);
                  })
                  .start();
              })
              .start();
            
            setSelectedBubble(bubble);
          }
        }
      }
    };

    // Add event listeners
    container.addEventListener('click', onClick);
    container.addEventListener('mousemove', onMouseMove);
    
    animate();

    return () => {
      container.removeEventListener('click', onClick);
      container.removeEventListener('mousemove', onMouseMove);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      // Clean up bubbles
      Object.values(bubblesRef.current).forEach(bubble => {
        scene.remove(bubble);
      });
      bubblesRef.current = {};
    };
  }, [activeBubbles, isLoading, selectedTab]);

  // Format relative time (like "2 hours ago")
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // Format the date for bubble expiration
  const formatExpirationTime = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    
    // Calculate time remaining
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return "Expired";
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 23) {
      return `Expires in ${Math.floor(diffHours / 24)} day(s)`;
    }
    
    return `Expires in ${diffHours}h ${diffMins}m`;
  };

  // Check if a bubble has expired
  const isBubbleExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Get a random user color for avatars
  const getUserColor = (username: string) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsla(${h}, 70%, 80%, 0.8)`;
  };

  // Handle going to bubble chat
  const goToBubbleChat = (bubbleId: string) => {
    navigate(`/bubbles/${bubbleId}`, { state: { from: 'myBubbles' } });
  };

  const getTabDescription = () => {
    switch (selectedTab) {
      case "recent":
        return "Bubbles created in the last 24 hours";
      case "participated":
        return "Bubbles you've chatted in";
      case "reflected":
        return "Bubbles you've reflected on";
    }
  };

  const getEmptyStateMessage = () => {
    if (searchQuery) {
      return `No bubbles match "${searchQuery}". Try a different search.`;
    }
    
    switch (selectedTab) {
      case "recent":
        return "There are no recent bubbles created in the last 24 hours.";
      case "participated":
        return "You haven't participated in any bubble chats yet.";
      case "reflected":
        return "You haven't reflected on any bubbles yet.";
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold text-[#ebbd34] hidden sm:inline">
                  Bubble Trouble
                </span>
              </Link>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search bubbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34]"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white z-[100]">
                  <DropdownMenuItem className="flex flex-col items-start p-3">
                    <span className="font-medium text-[#ebbd34]">
                      {profile?.display_name || user?.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      @{profile?.username || user?.email?.split('@')[0]}
                    </span>
                  </DropdownMenuItem>
                  <Link to="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
            />
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-light text-[#ebbd34] mb-2">
            My Bubble Space
          </h1>
          <p className="text-[#ebbd34]/80">
            Your personal collection of bubbles
          </p>
          <div className="h-px w-24 bg-[#ebbd34]/30 mx-auto mt-4" />
        </div>

        {/* Tabs for different bubble categories */}
        <div className="max-w-3xl mx-auto">
          <Tabs 
            defaultValue="recent" 
            className="w-full" 
            value={selectedTab}
            onValueChange={(value) => setSelectedTab(value as "recent" | "participated" | "reflected")}
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger 
                value="recent" 
                className="data-[state=active]:bg-[#ebbd34]/20 text-[#ebbd34]"
              >
                <Clock className="w-4 h-4 mr-2" />
                Recent Bubbles
              </TabsTrigger>
              <TabsTrigger 
                value="participated" 
                className="data-[state=active]:bg-[#ebbd34]/20 text-[#ebbd34]"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                My Chats
              </TabsTrigger>
              <TabsTrigger 
                value="reflected" 
                className="data-[state=active]:bg-[#ebbd34]/20 text-[#ebbd34]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                My Reflections
              </TabsTrigger>
            </TabsList>

            <div className="mb-4 text-center">
              <p className="text-[#ebbd34]/80">{getTabDescription()}</p>
            </div>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="w-12 h-12 border-4 border-[#ebbd34]/20 border-t-[#ebbd34] rounded-full animate-spin"></div>
            <p className="ml-4 text-[#ebbd34]">Loading your bubbles...</p>
          </div>
        ) : activeBubbles.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white/50 rounded-xl shadow-sm">
            <img 
              src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
              alt="No bubbles" 
              className="w-20 h-20 opacity-40 mb-4"
            />
            <h3 className="text-xl font-semibold text-[#ebbd34] mb-2">No bubbles found</h3>
            <p className="text-[#ebbd34]/70 max-w-md mb-6">
              {getEmptyStateMessage()}
            </p>
            <Button 
              onClick={() => navigate('/')} 
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
            >
              Go to Bubble World
            </Button>
          </div>
        ) : (
          <div 
            ref={containerRef}
            style={{ 
              position: 'relative',
              width: '100%',
              height: '550px', // Taller container for better visibility
              margin: '0 auto',
              zIndex: 10,
              maxWidth: '800px' // Wider container for better spacing
            }}
            className="bg-white/50 rounded-xl shadow-sm overflow-hidden border border-[#ebbd34]/10"
          />
        )}

        {/* Bubble details dialog */}
        <Dialog open={!!selectedBubble} onOpenChange={(open) => !open && setSelectedBubble(null)}>
          <DialogContent className="sm:max-w-[550px] bg-white/95 backdrop-blur-md">
            {selectedBubble && (
              <>
                <DialogHeader className="relative">
                  <div className="absolute right-0 top-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedBubble(null)}
                      className="h-8 w-8 text-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <DialogTitle className="text-[#ebbd34] text-2xl flex items-center mr-6">
                    {selectedBubble.name}
                    {isBubbleExpired(selectedBubble.expires_at) && (
                      <Badge className="ml-2 bg-red-500 text-white">Exploded</Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="flex items-center text-[#ebbd34]/80">
                    <span>{selectedBubble.topic}</span>
                    <span className="mx-2">•</span>
                    <span>by @{selectedBubble.username.split('@')[0]}</span>
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Bubble stats */}
                  <div className="flex items-center justify-between bg-[#ebbd34]/5 rounded-lg p-3">
                    <div className="flex items-center">
                      <Sparkles className="w-4 h-4 text-[#ebbd34] mr-2" />
                      <span className="text-[#ebbd34]">{selectedBubble.reflect_count} reflects</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-[#ebbd34] mr-2" />
                      <span className="text-[#ebbd34]">{participantCounts[selectedBubble.id] || 0} participants</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-[#ebbd34] mr-2" />
                      <span className="text-[#ebbd34]">{formatRelativeTime(selectedBubble.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* Bubble expiration */}
                  <div className={`flex items-center justify-center p-2 rounded-md ${
                    isBubbleExpired(selectedBubble.expires_at) 
                      ? "bg-red-100 text-red-600" 
                      : "bg-yellow-100 text-amber-600"
                  }`}>
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      {isBubbleExpired(selectedBubble.expires_at) 
                        ? "This bubble has exploded" 
                        : formatExpirationTime(selectedBubble.expires_at)}
                    </span>
                  </div>
                  
                  {/* Bubble description */}
                  {selectedBubble.description && (
                    <div className="bg-[#ebbd34]/5 p-4 rounded-lg">
                      <h4 className="text-[#ebbd34] font-medium mb-2">About this bubble</h4>
                      <p className="text-gray-700">{selectedBubble.description}</p>
                    </div>
                  )}
                  
                  {/* Recent messages */}
                  {bubbleMessages.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-[#ebbd34] font-medium">Recent Messages</h4>
                      {bubbleMessages.map((message: any) => (
                        <div key={message.id} className="flex items-start gap-2 bg-white/80 p-3 rounded-lg shadow-sm">
                          <div 
                            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm text-white"
                            style={{ backgroundColor: getUserColor(message.username) }}
                          >
                            {message.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-[#ebbd34]">
                                @{message.username.split('@')[0]}
                              </p>
                              <span className="text-xs text-gray-500 ml-2">
                                {formatRelativeTime(message.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm line-clamp-1">
                              {message.content.startsWith('data:image/') 
                                ? '[Image]' 
                                : message.content.startsWith('data:video/') 
                                  ? '[Video]' 
                                  : message.content.startsWith('data:audio/') 
                                    ? '[Audio]' 
                                    : message.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-[#ebbd34]/5 rounded-lg">
                      <p className="text-gray-500">No messages in this bubble yet</p>
                    </div>
                  )}
                </div>
                
                <DialogFooter className="flex sm:justify-between gap-2 mt-4">
                  {!isBubbleExpired(selectedBubble.expires_at) && !hasUserReflected(selectedBubble.id) && (
                    <Button
                      variant="outline"
                      onClick={() => handleReflect(selectedBubble.id)}
                      className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/5 gap-2"
                      disabled={isLoadingUserReflects}
                    >
                      <Sparkles className="h-4 w-4" />
                      Reflect
                    </Button>
                  )}
                  
                  {hasUserReflected(selectedBubble.id) && (
                    <div className="flex items-center text-sm text-[#ebbd34]">
                      <Sparkles className="h-4 w-4 mr-1" />
                      <span>You've reflected this bubble</span>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => goToBubbleChat(selectedBubble.id)}
                    className={`${
                      isBubbleExpired(selectedBubble.expires_at)
                        ? "bg-gray-400 hover:bg-gray-500"
                        : "bg-[#ebbd34] hover:bg-[#ebbd34]/90"
                    } text-white gap-2`}
                    disabled={isBubbleExpired(selectedBubble.expires_at)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {isBubbleExpired(selectedBubble.expires_at) ? "Bubble Exploded" : "Join Chat"}
                  </Button>
                </DialogFooter>
                
                {isBubbleExpired(selectedBubble.expires_at) && (
                  <div className="text-center text-sm text-red-500 mt-2 bg-red-50 py-1 px-3 rounded-md flex items-center justify-center">
                    <Info className="h-4 w-4 mr-2" />
                    This bubble has exploded and can no longer be accessed
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MyBubbles;
