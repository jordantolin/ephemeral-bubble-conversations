
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { 
  createBubbleGeometry, 
  createBubbleMaterial, 
  createTextCanvas,
  createCentralWorldGeometry,
  createCentralWorldMaterial,
} from '@/utils/bubbleUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Send, Sparkles, Clock, X, Image, Video, Mic, SmilePlus, MessageCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Format time remaining for display
const formatTimeRemaining = (expiryTime: Date) => {
  try {
    const now = new Date();
    const timeDiff = expiryTime.getTime() - now.getTime();
    if (timeDiff <= 0) return "Expired";
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error formatting time remaining:", error);
    return "Time error";
  }
};

interface Message {
  id: string;
  bubble_id: string;
  content: string;
  username: string;
  created_at: string;
}

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const centralWorldRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const particlesRef = useRef<{[key: string]: THREE.Points}>({});
  const interactionRef = useRef({
    isInteracting: false,
    lastX: 0,
    lastY: 0,
    rotationSpeed: { x: 0, y: 0 },
    momentum: { x: 0, y: 0 },
    zoom: {
      current: 12,
      target: 12,
      min: 3,
      max: 25
    },
    pinchDistance: 0,
    lastPinchTime: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    moveThreshold: 5
  });
  
  // New state for chat functionality
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch selected bubble details
  const { data: selectedBubble } = useQuery({
    queryKey: ['bubble', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return null;
      
      try {
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .eq('id', selectedBubbleId)
          .single();
        
        if (error) {
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error("Error fetching bubble details:", error);
        return null;
      }
    },
    enabled: !!selectedBubbleId && chatOpen
  });

  // Fetch messages for selected bubble
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];
      
      try {
        const { data, error } = await supabase
          .from('bubble_messages')
          .select('*')
          .eq('bubble_id', selectedBubbleId)
          .order('created_at', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
    },
    enabled: !!selectedBubbleId && chatOpen
  });

  // Set up real-time updates for messages
  useEffect(() => {
    if (!selectedBubbleId || !chatOpen) return;

    const messagesChannel = supabase
      .channel(`messages-${selectedBubbleId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'bubble_messages', filter: `bubble_id=eq.${selectedBubbleId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedBubbleId, chatOpen, queryClient]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatOpen && messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch (error) {
      console.error("Error formatting message time:", error);
      return "Unknown time";
    }
  };

  const formatExpiry = (expiryDate: string) => {
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      
      const timeDiff = expiry.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        return "Expired";
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
      } else {
        return `${minutes}m remaining`;
      }
    } catch (error) {
      console.error("Error formatting expiry time:", error);
      return "Time unknown";
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send messages",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedBubbleId || !newMessage.trim()) {
      return;
    }
    
    setIsSendingMessage(true);
    
    try {
      const username = profile?.username || user?.email || "";
      
      const { error } = await supabase
        .from('bubble_messages')
        .insert({
          bubble_id: selectedBubbleId,
          content: newMessage,
          username
        });

      if (error) {
        throw error;
      }

      setNewMessage("");
    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send your message",
        variant: "destructive"
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleReflect = async () => {
    if (!user || !selectedBubbleId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const username = profile?.username || user?.email || "";
      
      const { error } = await supabase
        .from('reflects')
        .insert({ 
          bubble_id: selectedBubbleId,
          username
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            title: "Already reflected",
            description: "You have already reflected this bubble",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Bubble reflected!",
        description: "This bubble will appear in your profile",
      });
      
      // Refresh the bubble data
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
    } catch (error: any) {
      console.error("Error reflecting bubble:", error);
      toast({
        title: "Error reflecting bubble",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Use a soft light background color that complements the gold bubbles
    scene.background = new THREE.Color('#F9F7F0');

    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 768;

    // Create perspective camera with improved field of view for better immersion
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    
    // Position camera to view the world from a better angle
    camera.position.z = isMobile ? 8 : 10;
    camera.position.y = 1; // Slightly above the center for a better looking-down perspective
    
    interactionRef.current.zoom.current = camera.position.z;
    interactionRef.current.zoom.target = camera.position.z;
    cameraRef.current = camera;

    // Enhanced renderer with better anti-aliasing for smoother edges
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting setup for more realistic bubble appearance
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.5);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight('#FFFFFF', '#F5E1C0', 1.5);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2.2);
    mainLight.position.set(5, 7, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const secondaryLight = new THREE.DirectionalLight('#FFF5E0', 1.2);
    secondaryLight.position.set(-7, -5, -8);
    scene.add(secondaryLight);

    // Add subtle point light at the center to enhance the central world glow
    const centerLight = new THREE.PointLight('#FBE8A6', 1.5, 10);
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);

    // Create central world with enhanced appearance
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    centralWorld.castShadow = true;
    centralWorld.receiveShadow = true;
    centralWorldRef.current = centralWorld;
    scene.add(centralWorld);

    // Add subtle environment fog for depth
    scene.fog = new THREE.FogExp2('#F9F7F0', 0.03);

    // Create explosion particles function with more realistic effect
    const createExplosionParticles = (position: THREE.Vector3, size: number) => {
      const particleCount = 250; // More particles for richer effect
      const geometry = new THREE.BufferGeometry();
      const initialPositions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      
      // Start all particles at center
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        initialPositions[i3] = 0;
        initialPositions[i3 + 1] = 0;
        initialPositions[i3 + 2] = 0;
        
        // Gradient from gold to amber for more vibrant explosion
        const colorRand = Math.random();
        colors[i3] = 0.9 + (colorRand * 0.1);     // R
        colors[i3 + 1] = 0.7 + (colorRand * 0.2);  // G
        colors[i3 + 2] = 0.2 + (colorRand * 0.1);  // B
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      // Enhanced particle material with better blending and size
      const material = new THREE.PointsMaterial({
        size: 0.15,
        transparent: true,
        opacity: 1,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        depthWrite: false
      });
      
      const particles = new THREE.Points(geometry, material);
      particles.position.copy(position);
      scene.add(particles);
      
      // More complex explosion animation
      const positions = particles.geometry.attributes.position.array;
      const dirs = [];
      
      // Create varied explosion directions
      for (let i = 0; i < particleCount; i++) {
        const speed = 0.5 + Math.random() * 4.5;
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        
        dirs.push({
          x: Math.sin(angle1) * Math.cos(angle2) * speed,
          y: Math.sin(angle1) * Math.sin(angle2) * speed, 
          z: Math.cos(angle1) * speed
        });
      }
      
      // Two-phase animation: explosion and fade
      const duration = 2000;
      new TWEEN.Tween({ progress: 0, opacity: 1 })
        .to({ progress: 1, opacity: 0 }, duration)
        .easing(TWEEN.Easing.Exponential.Out)
        .onUpdate(({ progress, opacity }) => {
          for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Non-linear expansion for more natural look
            const expandFactor = progress < 0.3 
              ? progress * 3.3 
              : 1 + (progress - 0.3) * 0.5;
            
            positions[i3] = dirs[i].x * expandFactor * size;
            positions[i3 + 1] = dirs[i].y * expandFactor * size;
            positions[i3 + 2] = dirs[i].z * expandFactor * size;
          }
          particles.geometry.attributes.position.needsUpdate = true;
          
          // Fade out gradually
          (particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - (progress * 1.2));
        })
        .onComplete(() => {
          scene.remove(particles);
        })
        .start();
      
      return particles;
    };

    // Create bubbles with enhanced random positioning and improved visuals
    topics.forEach((topic, index) => {
      // Skip if bubble is already in exploding animation
      if (topic.isExploding) {
        // Create explosion effect if not already created
        if (!particlesRef.current[topic.id]) {
          // Use the last known position or a default
          const lastKnownBubble = bubblesRef.current[topic.id];
          if (lastKnownBubble) {
            const position = lastKnownBubble.position.clone();
            const size = topic.size === 'lg' ? 0.9 : 
                        topic.size === 'md' ? 0.7 : 0.5;
            const finalSize = size * (1 + topic.reflect_count * 0.1);
            
            particlesRef.current[topic.id] = createExplosionParticles(position, finalSize * 2);
            
            // Remove the original bubble
            scene.remove(lastKnownBubble);
            delete bubblesRef.current[topic.id];
          }
        }
        return;
      }
      
      const bubbleGroup = new THREE.Group();
      
      // Larger base sizes for better visibility
      const baseSize = topic.size === 'lg' ? 0.9 : 
                      topic.size === 'md' ? 0.7 : 0.5;
      const reflectScale = 1 + (topic.reflect_count * 0.1);
      const finalSize = baseSize * reflectScale;
      
      const geometry = createBubbleGeometry(finalSize);
      const material = createBubbleMaterial();
      const bubble = new THREE.Mesh(geometry, material);
      bubble.castShadow = true;
      bubble.receiveShadow = true;
      bubbleGroup.add(bubble);

      // Calculate time until expiry
      const now = new Date();
      const expiryTime = topic.expires_at ? new Date(topic.expires_at) : new Date(now.getTime() + 24*60*60*1000);
      const timeUntilExpiry = Math.max(0, expiryTime.getTime() - now.getTime());
      const expiryRatio = timeUntilExpiry / (24*60*60*1000); // 0-1 value, 1 is fresh, 0 is expired
      
      // Make newer bubbles more vibrant
      if (material instanceof THREE.MeshPhysicalMaterial) {
        // Enhanced bubble appearance based on expiry time
        material.opacity = 0.5 + (expiryRatio * 0.5); // More transparent as it ages
        material.transmission = 0.2 + (expiryRatio * 0.3);
        material.emissive = new THREE.Color(0xebbd34);
        material.emissiveIntensity = 0.05 + (expiryRatio * 0.25); // Stronger glow for fresh bubbles
        material.clearcoat = 1.0;
        material.clearcoatRoughness = 0.1;
        material.metalness = 0.1;
        material.roughness = 0.2;
      }

      bubbleGroup.userData = {
        id: topic.id,
        orbitIndex: index,
        originalScale: finalSize,
        textScales: {
          nameScale: finalSize * 1.6, // Larger text scales for better readability
          topicScale: finalSize * 1.4,
          reflectScale: finalSize * 1.2,
          timeScale: finalSize
        },
        // More interesting movement patterns
        movement: {
          speed: (Math.random() * 0.002 + 0.001) * (0.5 + expiryRatio * 0.5), // Slower as it ages
          radius: Math.random() * 3.5 + 2 + (Math.random() * expiryRatio * 2), // Wider orbits for newer bubbles
          angle: Math.random() * Math.PI * 2,
          verticalSpeed: (Math.random() * 0.004 - 0.002) * expiryRatio, // More up/down movement when fresh
          verticalRange: Math.random() * 2.5 * expiryRatio, // Higher amplitude when fresh
          verticalOffset: Math.random() * Math.PI * 2,
          rotationSpeed: Math.random() * 0.012 - 0.006,
          wobble: Math.random() * 0.003 * expiryRatio // Extra random movement
        },
        expiryRatio, // Store for animation use
        expiryTime // Store actual time
      };

      // Create text labels with enhanced visibility
      const createLabelSprite = (text: string, position: THREE.Vector3, fontSize: number) => {
        const canvas = createTextCanvas(text, fontSize);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          depthTest: false
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(
          finalSize * 1.6, // Wider text for better readability
          finalSize * 0.8, 
          1
        );
        
        sprite.position.copy(position);
        return sprite;
      };

      // Position text labels within bubble with better spacing
      bubbleGroup.add(createLabelSprite(
        topic.name, 
        new THREE.Vector3(0, finalSize * 0.3, 0), 
        isMobile ? 36 : 42 // Larger font sizes
      ));
      
      bubbleGroup.add(createLabelSprite(
        topic.topic, 
        new THREE.Vector3(0, -finalSize * 0.2, 0), 
        isMobile ? 30 : 34
      ));
      
      bubbleGroup.add(createLabelSprite(
        `⭐ ${topic.reflect_count}`, 
        new THREE.Vector3(0, -finalSize * 0.6, 0), 
        isMobile ? 26 : 30
      ));
      
      // Add time remaining label
      bubbleGroup.add(createLabelSprite(
        `⏱ ${formatTimeRemaining(expiryTime)}`, 
        new THREE.Vector3(0, -finalSize * 0.95, 0), 
        isMobile ? 24 : 28
      ));

      // Set initial random position with wider distribution
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3.5 + 2;
      const y = (Math.random() - 0.5) * 4.5;
      bubbleGroup.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    // Improved touch handling
    let initialPinchDistance = 0;
    
    const getPinchDistance = (e: TouchEvent) => {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      return Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance = getPinchDistance(e);
        interactionRef.current.pinchDistance = initialPinchDistance;
        interactionRef.current.lastPinchTime = Date.now();
      } else if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        interactionRef.current.lastX = touch.clientX;
        interactionRef.current.lastY = touch.clientY;
        interactionRef.current.isInteracting = true;
        interactionRef.current.isDragging = false;
        interactionRef.current.startX = touch.clientX;
        interactionRef.current.startY = touch.clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e);
        const delta = (currentDistance - interactionRef.current.pinchDistance) * 0.01;
        interactionRef.current.zoom.target = Math.max(
          interactionRef.current.zoom.min,
          Math.min(interactionRef.current.zoom.max,
            interactionRef.current.zoom.target - delta
          )
        );
        interactionRef.current.pinchDistance = currentDistance;
      } else if (e.touches.length === 1 && interactionRef.current.isInteracting) {
        e.preventDefault();
        const touch = e.touches[0];
        
        const deltaX = Math.abs(touch.clientX - interactionRef.current.startX);
        const deltaY = Math.abs(touch.clientY - interactionRef.current.startY);
        
        if (deltaX > interactionRef.current.moveThreshold || 
            deltaY > interactionRef.current.moveThreshold) {
          interactionRef.current.isDragging = true;
        }
        
        if (interactionRef.current.isDragging && centralWorldRef.current) {
          const dx = touch.clientX - interactionRef.current.lastX;
          const dy = touch.clientY - interactionRef.current.lastY;
          
          centralWorldRef.current.rotation.y += dx * 0.01;
          centralWorldRef.current.rotation.x += dy * 0.01;
          
          interactionRef.current.momentum = {
            x: dx * 0.01 * 0.8,
            y: dy * 0.01 * 0.8
          };
        }
        
        interactionRef.current.lastX = touch.clientX;
        interactionRef.current.lastY = touch.clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (interactionRef.current.isInteracting) {
        const wasDragging = interactionRef.current.isDragging;
        interactionRef.current.isInteracting = false;
        
        if (!wasDragging && e.changedTouches.length === 1) {
          const touch = e.changedTouches[0];
          const rect = container.getBoundingClientRect();
          const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
          mouseRef.current.set(x, y);
          handleBubbleClick(e);
        }
        
        if (wasDragging && centralWorldRef.current) {
          const decay = 0.95;
          const applyMomentum = () => {
            if (!centralWorldRef.current) return;
            
            const momentum = interactionRef.current.momentum;
            if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
              centralWorldRef.current.rotation.y += momentum.x;
              centralWorldRef.current.rotation.x += momentum.y;
              momentum.x *= decay;
              momentum.y *= decay;
              requestAnimationFrame(applyMomentum);
            }
          };
          
          applyMomentum();
        }
      }
    };

    // Handle bubble clicks with improved interaction
    const handleBubbleClick = (event: MouseEvent | TouchEvent) => {
      if (interactionRef.current.isDragging) return;
      
      const rect = container.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        const touch = event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      }

      const x = (clientX - rect.left) / rect.width * 2 - 1;
      const y = -(clientY - rect.top) / rect.height * 2 + 1;

      if (camera) {
        mouseRef.current.set(x, y);
        raycasterRef.current.setFromCamera(mouseRef.current, camera);

        const bubbleMeshes = Object.values(bubblesRef.current).map(group => group.children[0]);
        const intersects = raycasterRef.current.intersectObjects(bubbleMeshes, true);

        if (intersects.length > 0) {
          const bubbleObject = intersects[0].object;
          let parent = bubbleObject.parent;
          while (parent && (!parent.userData || !parent.userData.id)) {
            parent = parent.parent;
          }
          
          if (parent && parent.userData && parent.userData.id) {
            // Enhanced click animation with bounce effect
            const originalScale = { value: 1 };
            const targetScale = { value: 1.3 }; // More pronounced scaling
            
            new TWEEN.Tween(originalScale)
              .to(targetScale, 200)
              .easing(TWEEN.Easing.Bounce.Out) // Bounce effect
              .onUpdate(() => {
                if (!bubbleObject) return;
                bubbleObject.scale.set(
                  originalScale.value,
                  originalScale.value,
                  originalScale.value
                );
              })
              .chain(
                new TWEEN.Tween(targetScale)
                  .to({ value: 1 }, 200)
                  .easing(TWEEN.Easing.Elastic.Out) // Elastic return
                  .onUpdate(() => {
                    if (!bubbleObject) return;
                    bubbleObject.scale.set(
                      targetScale.value,
                      targetScale.value,
                      targetScale.value
                    );
                  })
              )
              .start();
            
            // Opening chat dialog directly within this component
            setSelectedBubbleId(parent.userData.id);
            setChatOpen(true);
            
            // Also call the provided onBubbleClick callback for external handling
            onBubbleClick(parent.userData.id);
          }
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      interactionRef.current.isInteracting = true;
      interactionRef.current.lastX = e.clientX;
      interactionRef.current.lastY = e.clientY;
      interactionRef.current.isDragging = false;
      interactionRef.current.startX = e.clientX;
      interactionRef.current.startY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!interactionRef.current.isInteracting || !centralWorldRef.current) return;

      const deltaX = Math.abs(e.clientX - interactionRef.current.startX);
      const deltaY = Math.abs(e.clientY - interactionRef.current.startY);
      
      if (deltaX > interactionRef.current.moveThreshold || 
          deltaY > interactionRef.current.moveThreshold) {
        interactionRef.current.isDragging = true;
      }
      
      if (interactionRef.current.isDragging) {
        const dx = e.clientX - interactionRef.current.lastX;
        const dy = e.clientY - interactionRef.current.lastY;

        centralWorldRef.current.rotation.y += dx * 0.005;
        centralWorldRef.current.rotation.x += dy * 0.005;

        interactionRef.current.momentum = {
          x: dx * 0.005 * 0.8,
          y: dy * 0.005 * 0.8
        };
      }

      interactionRef.current.lastX = e.clientX;
      interactionRef.current.lastY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      const wasDragging = interactionRef.current.isDragging;
      interactionRef.current.isInteracting = false;

      if (!wasDragging) {
        handleBubbleClick(e);
      }

      if (wasDragging && centralWorldRef.current) {
        const decay = 0.95;
        const applyMomentum = () => {
          if (!centralWorldRef.current) return;
          
          const momentum = interactionRef.current.momentum;
          if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
            centralWorldRef.current.rotation.y += momentum.x;
            centralWorldRef.current.rotation.x += momentum.y;
            momentum.x *= decay;
            momentum.y *= decay;
            requestAnimationFrame(applyMomentum);
          }
        };
        
        applyMomentum();
      }
    };

    const onMouseLeave = () => {
      interactionRef.current.isInteracting = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoom = interactionRef.current.zoom;
      const zoomSensitivity = 0.005 * (zoom.current / zoom.min);
      const delta = e.deltaY * zoomSensitivity;
      
      zoom.target = Math.max(zoom.min, Math.min(zoom.max, zoom.target + delta));
    };

    // Add event listeners with proper cleanup
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Enhanced animation loop with more dynamic effects
    let time = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.002;
      
      // Smoother camera movement with enhanced zooming
      const zoom = interactionRef.current.zoom;
      const zoomLerpFactor = isMobile ? 0.15 : 0.1;
      zoom.current += (zoom.target - zoom.current) * zoomLerpFactor;
      if (camera) {
        camera.position.z = zoom.current;
      }

      // Calculate zoom scaling factor with improved curve for more natural scaling
      const zoomRange = interactionRef.current.zoom.max - interactionRef.current.zoom.min;
      const normalizedZoom = (interactionRef.current.zoom.max - zoom.current) / zoomRange;
      const zoomFactor = 1 + Math.pow(normalizedZoom, 1.3);

      // Update bubble positions with enhanced random movement
      Object.values(bubblesRef.current).forEach(bubble => {
        const movement = bubble.userData.movement;
        const expiryRatio = bubble.userData.expiryRatio || 1;
        
        // Calculate new position with more dynamic random movement
        const angle = time * movement.speed + movement.angle;
        const wobble = Math.sin(time * 5 * movement.wobble) * expiryRatio * 0.2;
        const verticalMovement = Math.sin(time * movement.verticalSpeed + movement.verticalOffset) * movement.verticalRange;
        
        // Apply rotation from central world for coordinated movement
        const rotationOffset = new THREE.Euler(
          centralWorld.rotation.x,
          centralWorld.rotation.y,
          centralWorld.rotation.z
        );
        
        const x = Math.cos(angle) * movement.radius + wobble;
        const y = verticalMovement;
        const z = Math.sin(angle) * movement.radius + wobble;
        
        const position = new THREE.Vector3(x, y, z).applyEuler(rotationOffset);
        bubble.position.copy(position);
        
        // Add subtle rotation to each bubble
        bubble.rotation.y += movement.rotationSpeed;
        
        // Make bubbles face camera for better text readability
        bubble.quaternion.copy(camera.quaternion);
        
        // Scale the bubble and text based on zoom level
        const origScale = bubble.userData.originalScale;
        const bubbleMesh = bubble.children[0] as THREE.Mesh;
        const scaleFactor = origScale * zoomFactor;
        bubbleMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        
        // Update bubble appearance based on time remaining
        if (bubbleMesh.material instanceof THREE.MeshPhysicalMaterial) {
          // Update expiry ratio
          const now = new Date();
          const expiryTime = bubble.userData.expiryTime || new Date();
          const timeUntilExpiry = Math.max(0, expiryTime.getTime() - now.getTime());
          const updatedExpiryRatio = timeUntilExpiry / (24*60*60*1000);
          bubble.userData.expiryRatio = updatedExpiryRatio;
          
          // Pulse effect as bubble gets closer to expiry
          if (updatedExpiryRatio < 0.1) {
            const pulseIntensity = 0.2 + Math.sin(time * 20) * 0.2;
            bubbleMesh.material.emissiveIntensity = pulseIntensity;
            bubbleMesh.material.opacity = 0.5 + pulseIntensity * 0.5;
          }
        }
        
        // Update time remaining label
        if (bubble.children.length >= 4) {
          const timeRemainingSprite = bubble.children[3] as THREE.Sprite;
          if (bubble.userData.expiryTime) {
            const now = new Date();
            const expiryTime = bubble.userData.expiryTime;
            
            // If it's been more than a minute, update the label
            if (now.getTime() % 60000 < 1000) {
              const formattedTime = formatTimeRemaining(expiryTime);
              const canvas = createTextCanvas(`⏱ ${formattedTime}`, isMobile ? 24 : 28);
              const texture = new THREE.CanvasTexture(canvas);
              texture.needsUpdate = true;
              
              if (timeRemainingSprite.material instanceof THREE.SpriteMaterial) {
                timeRemainingSprite.material.map = texture;
                timeRemainingSprite.material.needsUpdate = true;
              }
            }
          }
        }
        
        // Scale text sprites with improved proportions
        for (let i = 1; i < bubble.children.length; i++) {
          const sprite = bubble.children[i] as THREE.Sprite;
          const textScales = bubble.userData.textScales;
          const textScaleFactor = zoomFactor * 0.8;
          
          let baseScale;
          let yOffset;
          if (i === 1) {
            baseScale = textScales.nameScale;
            yOffset = scaleFactor * 0.3;
          } else if (i === 2) {
            baseScale = textScales.topicScale;
            yOffset = -scaleFactor * 0.2;
          } else if (i === 3) {
            baseScale = textScales.reflectScale;
            yOffset = -scaleFactor * 0.6;
          } else {
            baseScale = textScales.timeScale;
            yOffset = -scaleFactor * 0.95;
          }
          
          sprite.scale.set(
            baseScale * textScaleFactor,
            baseScale * textScaleFactor * 0.5,
            1
          );
          sprite.position.set(0, yOffset, 0);
        }
      });

      // Apply gentle auto-rotation to central world when not interacting
      if (!interactionRef.current.isInteracting && centralWorld) {
        centralWorld.rotation.y += 0.0003;
      }

      TWEEN.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    let resizeTimeout: number;
    const handleResize = () => {
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }

      resizeTimeout = window.setTimeout(() => {
        if (!container || !camera || !renderer) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        const isMobile = width < 768;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('wheel', onWheel);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [topics, onBubbleClick]);

  return (
    <>
      <div 
        ref={containerRef} 
        className="w-full h-full touch-none select-none"
        style={{ touchAction: 'none' }}
      />
      
      {/* Chat Dialog */}
      <Dialog open={chatOpen && !!selectedBubbleId} onOpenChange={(open) => {
        if (!open) setChatOpen(false);
      }}>
        <DialogContent className="sm:max-w-[550px] md:max-w-[650px] max-h-[90vh] flex flex-col overflow-hidden rounded-lg p-0">
          <DialogHeader className="bg-[#ebbd34] text-white px-6 py-4 gap-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {selectedBubble?.name || 'Loading...'}
              </DialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 h-8 w-8"
                onClick={() => setChatOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DialogDescription className="text-white/90 mt-1 text-base">
              {selectedBubble?.topic}
            </DialogDescription>
            
            <div className="flex items-center justify-between mt-2 text-sm">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-white/10 text-white border-0 gap-1 font-normal">
                  <Clock className="h-3 w-3" />
                  {selectedBubble ? formatExpiry(selectedBubble.expires_at) : 'Loading...'}
                </Badge>
                
                <div className="flex items-center gap-1 text-white/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{selectedBubble?.reflect_count || 0} reflects</span>
                </div>
              </div>
                
              <Button
                variant="outline"
                size="sm"
                onClick={handleReflect}
                className="text-white border-white/20 bg-white/10 hover:bg-white/20 hover:text-white gap-1 h-8 px-3"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Reflect
              </Button>
            </div>
          </DialogHeader>
          
          {selectedBubble?.description && (
            <div className="bg-[#ebbd34]/10 px-6 py-3 text-sm text-gray-700">
              {selectedBubble.description}
            </div>
          )}
          
          {/* Messages Area */}
          <ScrollArea className="flex-1 px-6 py-4 max-h-[50vh]">
            {isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-2 border-[#ebbd34]"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-[#ebbd34]/30" />
                <p className="text-lg font-medium text-[#ebbd34]/60 mb-2">No messages yet</p>
                <p className="text-gray-500">Start the conversation! This bubble will disappear in 24 hours.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message: Message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.username === (profile?.username || user?.email) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`rounded-lg px-4 py-3 max-w-[85%] break-words shadow-sm ${
                        message.username === (profile?.username || user?.email)
                          ? 'bg-[#ebbd34] text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-baseline gap-4 mb-1">
                        <span className="font-medium text-xs">
                          {message.username === (profile?.username || user?.email) ? 'You' : message.username}
                        </span>
                        <span className="text-xs opacity-70">{formatMessageTime(message.created_at)}</span>
                      </div>
                      <p className="break-words">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          {/* Message Input */}
          <div className="p-4 border-t mt-auto">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isSendingMessage}
                maxLength={500}
                className="bg-white h-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage} 
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90 h-11 px-5"
                disabled={isSendingMessage || !newMessage.trim()}
              >
                {isSendingMessage ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="flex mt-3 justify-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/10">
                <Image className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/10">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/10">
                <Mic className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/10">
                <SmilePlus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BubbleWorld;
