
import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageCircle, WifiOff } from "lucide-react";
import BubbleChatMessages from "./BubbleChatMessages";
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

        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-4 min-h-[300px]">
          {!isOnline ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <WifiOff className="h-10 w-10 text-gray-400 mb-2" />
              <h3 className="text-lg font-medium text-gray-700">You're offline</h3>
              <p className="text-gray-500 mt-1">
                Chat messages will be available when you reconnect.
              </p>
            </div>
          ) : (
            <BubbleChatMessages 
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              messagesError={messagesError}
            />
          )}
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
