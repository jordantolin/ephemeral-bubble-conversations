import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Image, Video, Mic, SmilePlus, X, Clock, Award, Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createRateLimiter, createRetryHandler } from "@/utils/bubbleUtils";
import { useGamification } from "@/context/GamificationContext";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface BubbleChatProps {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  selectedBubbleId: string | null;
  selectedBubble: any;
  isLoadingBubbleDetails: boolean;
  messages: any[];
  isLoadingMessages: boolean;
  messagesError: any;
  isBubbleExpired: (bubble: any) => boolean;
  handleReflect: (bubbleId: string) => Promise<void>;
}

const BubbleChat: React.FC<BubbleChatProps> = ({
  chatOpen,
  setChatOpen,
  selectedBubbleId,
  selectedBubble,
  isLoadingBubbleDetails,
  messages,
  isLoadingMessages,
  messagesError,
  isBubbleExpired,
  handleReflect,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageRewardShown, setMessageRewardShown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use gamification hooks
  const { addPoints, incrementAchievementProgress, checkAchievement } = useGamification();
  
  // Create rate limiters and retry handlers
  const messageLimiter = useRef(createRateLimiter(5, 5000));
  const sendRetry = useRef(createRetryHandler(3, 1000));

  // Scroll to bottom when new messages arrive
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null;
  
  useEffect(() => {
    if (chatOpen && messages.length > 0 && messagesEndRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [lastMessageId, chatOpen]);
  
  // Reset message reward when opening chat
  useEffect(() => {
    if (chatOpen) {
      setMessageRewardShown(false);
    }
  }, [chatOpen]);

  // Enhanced message sending with debounce, rate limiting and retry
  const handleSendMessage = async (content?: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send messages",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedBubbleId) {
      toast({
        title: "Error",
        description: "No bubble selected",
        variant: "destructive"
      });
      return;
    }
    
    // Check if the selected bubble has expired
    if (selectedBubble && isBubbleExpired(selectedBubble)) {
      toast({
        title: "Bubble Expired",
        description: "This bubble has expired and is no longer available for messages",
        variant: "destructive"
      });
      setChatOpen(false);
      return;
    }
    
    const messageContent = content || newMessage;
    if (!messageContent.trim()) return;
    
    // Check rate limiting
    if (!messageLimiter.current.canMakeRequest()) {
      const waitTime = messageLimiter.current.getWaitTime();
      toast({
        title: "Slow down",
        description: `Please wait ${Math.ceil(waitTime / 1000)} seconds before sending more messages`,
        variant: "default"
      });
      return;
    }
    
    // Start sending
    setIsSendingMessage(true);
    
    try {
      const username = profile?.username || user?.email || "";
      
      // Save message content before clearing input
      const messageToSend = messageContent;
      setNewMessage("");
      
      await sendRetry.current(async () => {
        const { error } = await supabase
          .from('bubble_messages')
          .insert({
            bubble_id: selectedBubbleId,
            content: messageToSend,
            username
          });

        if (error) {
          throw error;
        }
        
        // Add points for sending a message
        await addPoints(5, 'message');
        
        // Increment achievement progress
        await incrementAchievementProgress('social-butterfly');
        
        // Show message reward if not shown yet
        if (!messageRewardShown) {
          setMessageRewardShown(true);
        }
      });
      
    } catch (error: any) {
      console.error("Failed to send message after retries:", error);
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send your message",
        variant: "destructive"
      });
      
      // If message wasn't sent, put it back in the input
      if (content) {
        setNewMessage(content);
      } else {
        setNewMessage(messageContent);
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

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
      
      // Calculate time difference in milliseconds
      const timeDiff = expiry.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        return "Expired";
      }
      
      // Format remaining time
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
  
  // Handle reflection with gamification
  const handleReflectWithPoints = async () => {
    if (!selectedBubbleId) return;
    
    await handleReflect(selectedBubbleId);
    
    // Add points for reflecting
    await addPoints(10, 'reflection');
    
    // Increment reflection master achievement
    await incrementAchievementProgress('reflection-master');
  };

  return (
    <Dialog open={chatOpen && !!selectedBubbleId} onOpenChange={(open) => {
      if (!open) setChatOpen(false);
    }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col overflow-hidden rounded-lg p-0 bg-white/95 backdrop-blur-md border border-[#ebbd34]/20 shadow-xl">
        <DialogHeader className="border-b pb-3 px-4 pt-4 bg-gradient-to-r from-[#ebbd34]/10 to-transparent">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl text-[#ebbd34] font-bold flex items-center">
              {isLoadingBubbleDetails ? (
                <span className="flex items-center">
                  <span className="h-5 w-5 rounded-full border-2 border-[#ebbd34] border-t-transparent animate-spin mr-2"></span>
                  Loading...
                </span>
              ) : selectedBubble?.name}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)} className="hover:bg-[#ebbd34]/10">
              <X className="h-5 w-5 text-[#ebbd34]" />
            </Button>
          </div>
          {!isLoadingBubbleDetails && selectedBubble && (
            <div className="flex flex-col text-sm mt-2">
              <div className="flex justify-between items-center">
                <span className="text-[#ebbd34]/80 font-medium flex items-center gap-1">
                  Topic: {selectedBubble.topic}
                </span>
                <Badge variant="outline" className="text-[#ebbd34] border-[#ebbd34]/20 font-medium">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatExpiry(selectedBubble.expires_at)}
                </Badge>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-[#ebbd34]/70 flex items-center">
                  <Sparkles className="h-4 w-4 mr-1" />
                  {selectedBubble.reflect_count} reflects
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReflectWithPoints}
                  className="text-[#ebbd34] hover:bg-[#ebbd34]/10 h-8 text-xs px-3 border-[#ebbd34]/20"
                  disabled={isSendingMessage}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Reflect
                </Button>
              </div>
              {selectedBubble.description && (
                <motion.div 
                  className="mt-3 p-3 bg-[#ebbd34]/5 rounded-md text-sm text-gray-700"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {selectedBubble.description}
                </motion.div>
              )}
            </div>
          )}
        </DialogHeader>
        
        {/* Messages Area with improved scrolling and animation */}
        <ScrollArea className="flex-1 p-4 max-h-[50vh] relative">
          {messageRewardShown && (
            <motion.div
              className="sticky top-0 bg-[#ebbd34]/10 rounded-md p-2 mb-3 flex justify-between items-center text-sm z-10"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <span className="text-gray-700">Keep the conversation going!</span>
              <div className="flex items-center">
                <Star className="h-3 w-3 text-[#ebbd34] mr-1" />
                <span className="text-[#ebbd34] font-medium">+5 points per message</span>
              </div>
            </motion.div>
          )}
          
          {isLoadingMessages ? (
            <div className="p-8 flex justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-[#ebbd34] border-t-transparent animate-spin"></div>
            </div>
          ) : messagesError ? (
            <div className="text-center py-8 text-gray-500">
              <X className="h-10 w-10 mx-auto mb-3 text-red-400" />
              <p className="mb-3">There was an error loading messages.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] })}
                className="border-[#ebbd34]/30 text-[#ebbd34] hover:bg-[#ebbd34]/10"
              >
                Retry
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-[#ebbd34]/30" />
              <p className="text-lg font-medium text-[#ebbd34]/60 mb-2">No messages yet</p>
              <p className="text-gray-500">Start the conversation! This bubble will disappear in 24 hours.</p>
              
              <motion.div
                className="mt-6 bg-[#ebbd34]/10 rounded-lg p-3 mx-auto max-w-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="flex items-center mb-2">
                  <Award className="h-4 w-4 text-[#ebbd34] mr-2" />
                  <span className="text-sm font-medium text-gray-700">First Message Bonus</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">Be the first to send a message and earn bonus points!</p>
                <div className="flex items-center">
                  <Star className="h-3 w-3 text-[#ebbd34] mr-1" />
                  <span className="text-xs font-medium text-[#ebbd34]">+10 points</span>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <motion.div 
                  key={message.id}
                  className={`flex ${message.username === (profile?.username || user?.email) ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, x: message.username === (profile?.username || user?.email) ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
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
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        {/* Social Butterfly Achievement Progress */}
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
            <span className="flex items-center">
              <Award className="h-3 w-3 mr-1 text-[#ebbd34]" />
              Social Butterfly
            </span>
            <span>Send 10 messages</span>
          </div>
          <Progress 
            value={(messages.filter(m => m.username === (profile?.username || user?.email)).length / 10) * 100} 
            className="h-1 bg-gray-100" 
          />
        </div>
        
        {/* Enhanced Message Input with typing indicators */}
        <div className="p-4 border-t mt-auto bg-white/80">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSendingMessage}
              maxLength={500}
              className="bg-white h-11 focus-visible:ring-[#ebbd34]/30 border-[#ebbd34]/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={() => handleSendMessage()} 
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
  );
};

export default BubbleChat;
