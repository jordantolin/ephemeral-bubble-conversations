
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, ThumbsUp } from "lucide-react";
import BubbleMessages from "./BubbleMessages";
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

  const handleSendMessage = async () => {
    if (!selectedBubbleId || !messageContent.trim()) return;
    
    const success = await sendMessage(messageContent);
    if (success) {
      setMessageContent("");
    }
  };

  return (
    <Dialog open={chatOpen} onOpenChange={setChatOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isLoadingBubbleDetails ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              selectedBubble?.name || "Bubble Chat"
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-4 min-h-[300px]">
          <BubbleMessages 
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            messagesError={messagesError}
          />
        </div>

        {!isBubbleExpired && selectedBubbleId && (
          <div className="mt-4 space-y-2">
            <Textarea
              placeholder="Type your message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="resize-none"
              disabled={isSending}
            />
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedBubbleId && handleReflect(selectedBubbleId)}
                disabled={isLoadingBubbleDetails}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Reflect
              </Button>
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </div>
        )}

        {isBubbleExpired && (
          <div className="text-center text-amber-500 p-2 border border-amber-200 rounded-md bg-amber-50">
            This bubble has expired and cannot receive new messages.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BubbleChat;
