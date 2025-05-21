
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageCircle } from "lucide-react";
import BubbleChatMessages from "./BubbleChatMessages";
import BubbleChatInput from "./BubbleChatInput";

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
  return (
    <Dialog open={chatOpen} onOpenChange={setChatOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            {isLoadingBubbleDetails ? (
              <div className="flex justify-center items-center">
                <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
                <span className="ml-2 text-yellow-500">Loading bubble...</span>
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
          <BubbleChatMessages 
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            messagesError={messagesError}
          />
        </div>

        {selectedBubbleId && (
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
