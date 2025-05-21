
import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageCircle, WifiOff } from "lucide-react";
import OptimizedBubbleMessages from "./OptimizedBubbleMessages";
import BubbleChatInput from "./BubbleChatInput";
import { useNetwork } from "@/context/NetworkContext";

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
  handleReflect
}) => {
  const { isOnline } = useNetwork();
  
  // Reset dialog state when connection issues are detected
  useEffect(() => {
    if (!isOnline && chatOpen) {
      // Show an offline warning before closing
      setTimeout(() => setChatOpen(false), 3000);
    }
  }, [isOnline, chatOpen, setChatOpen]);

  // Performance optimization - prevent rendering when closed
  if (!chatOpen) return null;

  return (
    <Dialog open={chatOpen} onOpenChange={setChatOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            {isLoadingBubbleDetails ? (
              <div className="flex justify-center items-center">
                <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
                <span className="ml-2 text-yellow-500">Loading bubble...</span>
              </div>
            ) : !isOnline ? (
              <div className="flex justify-center items-center text-red-500">
                <WifiOff className="h-5 w-5 mr-2" />
                <span>Connection lost</span>
              </div>
            ) : (
              <>
                <MessageCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">{selectedBubble?.name || "Bubble Chat"}</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4 px-1 min-h-[300px]">
          <OptimizedBubbleMessages 
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            messagesError={messagesError}
          />
        </div>

        {selectedBubbleId && isOnline && (
          <BubbleChatInput 
            bubbleId={selectedBubbleId}
            isBubbleExpired={isBubbleExpired}
            onReflect={() => selectedBubbleId && handleReflect(selectedBubbleId)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BubbleChat;
