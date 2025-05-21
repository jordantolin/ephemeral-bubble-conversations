
import React, { useRef, useEffect } from "react";
import { useNetwork } from "@/context/NetworkContext";
import { useAuth } from "@/context/AuthContext";
import { Loader2, WifiOff, MessageSquare, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface OptimizedBubbleMessagesProps {
  messages: any[];
  isLoadingMessages: boolean;
  messagesError: any;
}

const OptimizedBubbleMessages: React.FC<OptimizedBubbleMessagesProps> = ({
  messages,
  isLoadingMessages,
  messagesError
}) => {
  const { isOnline } = useNetwork();
  const { profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages?.length && !isLoadingMessages) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isLoadingMessages]);

  // Handle loading state
  if (isLoadingMessages) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] py-8">
        <Loader2 className="h-8 w-8 text-yellow-400 animate-spin mb-2" />
        <p className="text-sm text-yellow-600">Loading messages...</p>
      </div>
    );
  }

  // Handle offline state
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
        <WifiOff className="h-12 w-12 text-gray-400 mb-2" />
        <h3 className="text-lg font-medium text-gray-600">You're offline</h3>
        <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">
          Messages will be available when you reconnect to the internet.
        </p>
      </div>
    );
  }

  // Handle error state
  if (messagesError) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-red-500">
        <AlertTriangle className="h-12 w-12 text-red-400 mb-2" />
        <h3 className="text-lg font-medium">Error loading messages</h3>
        <p className="text-sm mt-2 text-center max-w-xs">
          Something went wrong while loading the conversation. Try refreshing the page.
        </p>
      </div>
    );
  }

  // Handle empty messages
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
        <MessageSquare className="h-12 w-12 text-yellow-400 mb-2" />
        <h3 className="text-lg font-medium text-gray-600">No messages yet</h3>
        <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">
          Be the first to start this conversation!
        </p>
      </div>
    );
  }

  // Format date for messages
  const formatMessageDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, h:mm a');
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown time";
    }
  };

  // Render messages with better performance
  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-4 px-1">
        {messages.map((message) => {
          const isCurrentUser = profile?.username === message.username;
          
          return (
            <div
              key={message.id}
              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  isCurrentUser
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${isCurrentUser ? "text-yellow-100" : "text-gray-500"}`}>
                    {isCurrentUser ? "You" : message.username}
                  </span>
                </div>
                <p className="text-sm break-words">{message.content}</p>
                <span className={`text-xs block mt-1 text-right ${isCurrentUser ? "text-yellow-100" : "text-gray-500"}`}>
                  {formatMessageDate(message.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default OptimizedBubbleMessages;
