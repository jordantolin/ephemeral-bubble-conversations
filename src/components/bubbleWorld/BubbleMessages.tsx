
import React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

interface BubbleMessagesProps {
  messages: any[];
  isLoadingMessages: boolean;
  messagesError: any;
}

const BubbleMessages: React.FC<BubbleMessagesProps> = ({
  messages,
  isLoadingMessages,
  messagesError
}) => {
  if (isLoadingMessages) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="text-center text-red-500">
        Error loading messages. Please try again.
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No messages yet. Be the first to start a conversation!
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className="flex gap-2">
          <Avatar className="h-8 w-8">
            <div className="bg-primary text-primary-foreground w-full h-full flex items-center justify-center text-sm font-medium">
              {message.username.charAt(0).toUpperCase()}
            </div>
          </Avatar>
          <div className="flex flex-col">
            <div className="text-sm font-medium">{message.username}</div>
            <div className="text-sm">{message.content}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default BubbleMessages;
