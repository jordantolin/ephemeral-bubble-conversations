
import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BubbleData } from "@/types/bubble";
import { getInitials } from "@/utils/bubbleUtils";
import { Loader2, SendHorizonal, AlertTriangle, ThumbsUp, MapPin, AlertCircle, Clock } from "lucide-react";
import { useSendBubbleMessage } from "@/hooks/useSendBubbleMessage";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistance } from "date-fns";
import { getLocationName } from "@/utils/geoCoordinates"; 

interface BubbleMessage {
  id: string;
  content: string;
  username: string;
  created_at: string;
}

interface BubbleChatProps {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  selectedBubbleId: string | null;
  selectedBubble: BubbleData | null;
  isLoadingBubbleDetails: boolean;
  messages: BubbleMessage[];
  isLoadingMessages: boolean;
  messagesError: Error | null;
  isBubbleExpired: boolean;
  handleReflect: (bubbleId: string) => void;
}

const BubbleChat = ({
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
}: BubbleChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isSending } = useSendBubbleMessage(selectedBubbleId || "");
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send messages",
        variant: "destructive",
      });
      return;
    }

    if (!newMessage.trim()) return;

    const success = await sendMessage(newMessage);
    if (success) {
      setNewMessage("");
      // Focus back on textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Handle textarea key press (send on Enter without shift)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format location name from coordinates
  const formatLocation = (latitude?: number, longitude?: number) => {
    if (latitude === undefined || longitude === undefined) {
      return "Unknown location";
    }
    return getLocationName(latitude, longitude);
  };

  return (
    <Dialog open={chatOpen} onOpenChange={setChatOpen}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        {isLoadingBubbleDetails ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#ebbd34]" />
            <p className="text-center text-muted-foreground">Loading bubble details...</p>
          </div>
        ) : selectedBubble ? (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="text-[#ebbd34] text-xl flex items-center gap-2">
                {selectedBubble.name}
                <span className="bg-[#ebbd34]/10 text-xs px-2 py-1 rounded-full text-[#ebbd34]">
                  {selectedBubble.topic}
                </span>
              </DialogTitle>
              
              <DialogDescription className="text-sm">
                {selectedBubble.description}
              </DialogDescription>
              
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Created: {selectedBubble.created_at ? format(new Date(selectedBubble.created_at), 'PPp') : 'Unknown'}
                </div>
                
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {selectedBubble.reflect_count || 0} reflections
                </div>
                
                {selectedBubble.latitude && selectedBubble.longitude && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {formatLocation(selectedBubble.latitude, selectedBubble.longitude)}
                  </div>
                )}
              </div>
              
              {isBubbleExpired && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>
                    This bubble has expired. You can still view the conversation but cannot send new messages.
                  </span>
                </div>
              )}
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col min-h-[60vh]">
              <ScrollArea className="flex-1 pr-4 -mr-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-[#ebbd34]" />
                  </div>
                ) : messagesError ? (
                  <div className="flex items-center justify-center p-4 text-destructive">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>Error loading messages</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <p className="mb-2">No messages yet</p>
                    <p className="text-sm">Be the first to start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className="bg-[#ebbd34]/20 text-[#ebbd34] text-xs">
                            {getInitials(message.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{message.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistance(new Date(message.created_at), new Date(), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {!isBubbleExpired && (
                <div className="pt-4 border-t mt-4">
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Write a message..."
                      className="min-h-[60px] resize-none border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]"
                      disabled={isSending || !user}
                    />
                    <Button
                      className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                      disabled={!newMessage.trim() || isSending || !user}
                      onClick={handleSendMessage}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizonal className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {!user && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Please sign in to participate in the conversation
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-between items-center border-t">
              <div className="text-xs text-muted-foreground">
                Created by: <span className="font-medium">{selectedBubble.username}</span>
              </div>
              <Button
                onClick={() => handleReflect(selectedBubble.id)}
                variant="outline"
                size="sm"
                className="gap-1 text-[#ebbd34] border-[#ebbd34]/20 hover:bg-[#ebbd34]/5"
              >
                <ThumbsUp className="h-4 w-4" />
                <span>Reflect</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p>Bubble not found or has been removed</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BubbleChat;
