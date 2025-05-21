
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, ThumbsUp } from "lucide-react";
import { useSendBubbleMessage } from "@/hooks/useSendBubbleMessage";

interface BubbleChatInputProps {
  bubbleId: string;
  isBubbleExpired: boolean;
  onReflect: (bubbleId: string) => Promise<void>;
}

const BubbleChatInput: React.FC<BubbleChatInputProps> = ({
  bubbleId,
  isBubbleExpired,
  onReflect
}) => {
  const [messageContent, setMessageContent] = useState("");
  const { sendMessage, isSending } = useSendBubbleMessage(bubbleId);

  const handleSendMessage = async () => {
    if (!messageContent.trim()) return;
    
    const success = await sendMessage(messageContent);
    if (success) {
      setMessageContent("");
    }
  };

  if (isBubbleExpired) {
    return (
      <div className="text-center text-amber-500 p-2 border border-amber-200 rounded-md bg-amber-50">
        This bubble has expired and cannot receive new messages.
      </div>
    );
  }

  return (
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
          onClick={() => onReflect(bubbleId)}
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
  );
};

export default BubbleChatInput;
