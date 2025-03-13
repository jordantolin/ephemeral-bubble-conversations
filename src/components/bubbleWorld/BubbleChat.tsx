
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/context/GamificationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Loader2, MessageSquare, ThumbsUp } from "lucide-react";
import { GamificationContextType } from "@/types/gamification";
import { formatMessageTime } from "@/utils/feedHelpers";

export const useSendBubbleMessage = (bubbleId: string) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const { trackMessageSent } = useGamification();

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return false;

    setIsSending(true);

    try {
      const username = profile?.username || user.email || "";

      const { error } = await supabase
        .from("bubble_messages")
        .insert({
          content: content.trim(),
          bubble_id: bubbleId,
          username
        });

      if (error) throw error;

      await trackMessageSent();

      setIsSending(false);
      toast({
        title: "Message sent",
        description: "Your message has been posted successfully",
        variant: "default"
      });
      return true;
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error sending message",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsSending(false);
      return false;
    }
  };

  return { sendMessage, isSending };
};

export const useReflectOnBubble = (bubbleId: string) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isReflecting, setIsReflecting] = useState(false);
  const gamification = useGamification() as GamificationContextType;
  const { addPoints, incrementAchievementProgress } = gamification;

  const reflectOnBubble = async () => {
    if (!user) return false;

    setIsReflecting(true);

    try {
      const username = profile?.username || user.email || "";

      const { data: existingReflects } = await supabase
        .from("reflects")
        .select("id")
        .eq("bubble_id", bubbleId)
        .eq("username", username);

      if (existingReflects && existingReflects.length > 0) {
        toast({
          title: "Already Reflected",
          description: "You have already reflected on this bubble",
          variant: "default"
        });
        setIsReflecting(false);
        return false;
      }

      const { error } = await supabase
        .from("reflects")
        .insert({
          bubble_id: bubbleId,
          username
        });

      if (error) throw error;

      await supabase.rpc('increment_reflect_count', { bubble_id: bubbleId });

      await addPoints(10, 'reflection');

      await incrementAchievementProgress('reflection-master');

      toast({
        title: "Reflection Added!",
        description: "Your reflection has been added to this bubble",
        variant: "default"
      });

      setIsReflecting(false);
      return true;
    } catch (error: any) {
      console.error("Error reflecting on bubble:", error);
      toast({
        title: "Error Adding Reflection",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsReflecting(false);
      return false;
    }
  };

  return { reflectOnBubble, isReflecting };
};

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

// Message component for better organization
const ChatMessage = ({ message }: { message: any }) => {
  return (
    <div className="flex gap-2 animate-fadeIn">
      <Avatar className="h-8 w-8 shrink-0">
        <div className="bg-primary text-primary-foreground w-full h-full flex items-center justify-center text-sm font-medium">
          {message.username.charAt(0).toUpperCase()}
        </div>
      </Avatar>
      <div className="flex flex-col">
        <div className="flex items-end gap-2">
          <span className="text-sm font-medium">{message.username}</span>
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
        </div>
        <div className="text-sm mt-1 bg-secondary/50 p-2 rounded-md">{message.content}</div>
      </div>
    </div>
  );
};

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

  // Handle Enter key to send messages
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
          {selectedBubble && !isLoadingBubbleDetails && (
            <p className="text-center text-sm text-muted-foreground">
              {selectedBubble.topic} • {selectedBubble.username}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-4 min-h-[300px] max-h-[50vh]">
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messagesError ? (
            <div className="text-center text-red-500">
              Error loading messages. Please try again.
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No messages yet. Be the first to start a conversation!
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </>
          )}
        </div>

        {!isBubbleExpired && selectedBubbleId && (
          <div className="mt-4 space-y-2">
            <Textarea
              placeholder="Type your message... (Press Enter to send)"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="resize-none min-h-[80px]"
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
          <div className="text-center text-amber-500 p-3 border border-amber-200 rounded-md bg-amber-50 mt-3">
            <p className="font-medium mb-1">This bubble has expired</p>
            <p className="text-sm">Bubbles only last for 24 hours. Browse other active bubbles to continue conversations!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BubbleChat;
