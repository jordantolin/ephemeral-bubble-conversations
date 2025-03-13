
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageSquare, ThumbsUp, Clock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSendBubbleMessage } from "@/hooks/useSendBubbleMessage";
import { useReflectOnBubble } from "@/hooks/useReflectOnBubble";

interface BubbleChatProps {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  selectedBubbleId: string | null;
  selectedBubble: any;
  isLoadingBubbleDetails: boolean;
  messages: any[];
  isLoadingMessages: boolean;
  messagesError: any;
  isBubbleExpired: boolean;
  handleReflect: (bubbleId: string) => Promise<void>;
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
  handleReflect
}: BubbleChatProps) => {
  const [messageContent, setMessageContent] = useState("");
  const { sendMessage, isSending } = selectedBubbleId ? useSendBubbleMessage(selectedBubbleId) : { sendMessage: async () => false, isSending: false };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!selectedBubbleId || !messageContent.trim()) return;
    
    const success = await sendMessage(messageContent);
    if (success) {
      setMessageContent("");
    }
  };

  // Helper function to handle message time formatting
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to get colors based on username
  const getUserColor = (username: string) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Generate pastel colors
    const h = hash % 360;
    return `hsl(${h}, 70%, 80%)`;
  };

  return (
    <Dialog open={chatOpen} onOpenChange={setChatOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl border border-[#ebbd34]/20 shadow-lg">
        <DialogHeader className="px-4 py-3 border-b border-[#ebbd34]/10 bg-gradient-to-r from-[#fef7e4] to-[#faf2d2]">
          <DialogTitle className="text-center flex items-center justify-center">
            {isLoadingBubbleDetails ? (
              <div className="flex justify-center items-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#ebbd34]" />
                <span className="ml-2 text-[#ebbd34]">Loading bubble...</span>
              </div>
            ) : (
              <span className="font-semibold text-[#ebbd34] text-lg">{selectedBubble?.name || "Bubble Chat"}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div 
          className="flex-1 overflow-y-auto py-4 px-3 space-y-4 min-h-[300px] max-h-[60vh] bg-gradient-to-b from-[#fff]/80 to-[#fff]/60 backdrop-blur-sm"
          aria-live="polite"
          role="log"
        >
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#ebbd34] mx-auto mb-2" />
                <p className="text-[#ebbd34]/70 text-sm">Loading conversation...</p>
              </div>
            </div>
          ) : messagesError ? (
            <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg flex flex-col items-center">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="font-medium">Error loading messages</p>
              <p className="text-sm">Please try refreshing the page</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-[#ebbd34]/60 p-6 flex flex-col items-center justify-center h-full">
              <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Be the first to start a conversation!</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div 
                  key={message.id} 
                  className={`flex gap-2 ${index === messages.length - 1 ? 'mb-2' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback 
                      style={{ backgroundColor: getUserColor(message.username) }}
                      className="text-white text-xs font-medium"
                    >
                      {message.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="flex items-baseline">
                      <div className="text-sm font-medium text-[#ebbd34]">
                        {message.username.split('@')[0]}
                      </div>
                      <div className="text-xs text-[#ebbd34]/50 ml-2">
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                    <div className="text-sm mt-1 bg-white px-3 py-2 rounded-xl rounded-tl-none shadow-sm">
                      {message.content}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </AnimatePresence>
          )}
        </div>

        {!isBubbleExpired && selectedBubbleId ? (
          <div className="p-3 border-t border-[#ebbd34]/10 bg-white">
            <Textarea
              placeholder="Type your message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="resize-none focus-visible:ring-[#ebbd34]/30 border-[#ebbd34]/20 mb-2"
              rows={2}
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              aria-label="Message input"
            />
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedBubbleId && handleReflect(selectedBubbleId)}
                disabled={isLoadingBubbleDetails}
                className="text-[#ebbd34] border-[#ebbd34]/20 hover:bg-[#ebbd34]/5 hover:text-[#ebbd34] hover:border-[#ebbd34]/30"
                aria-label="Reflect on this bubble"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Reflect
              </Button>
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || isSending}
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </div>
            <p className="text-xs text-[#ebbd34]/50 text-center mt-2">
              Press Enter to send, Shift+Enter for a new line
            </p>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border-t border-amber-200">
            <div className="flex items-center justify-center gap-2 text-amber-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Bubble Expired</span>
            </div>
            <p className="text-sm text-amber-600/80 text-center">
              This bubble has completed its 24-hour lifecycle and cannot receive new messages.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BubbleChat;
