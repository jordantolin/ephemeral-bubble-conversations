
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

interface ChatMessagePreviewProps {
  bubbleId: string;
  messages: any[];
  getUserColor: (username: string) => string;
  formatMessageTime: (timestamp: string) => string;
  getMessagePreview: (content: string) => string;
  messagesLoading: boolean;
}

const ChatMessagePreview: React.FC<ChatMessagePreviewProps> = ({
  bubbleId,
  messages,
  getUserColor,
  formatMessageTime,
  getMessagePreview,
  messagesLoading
}) => {
  if (messagesLoading) {
    return (
      <div className="w-full bg-[#ebbd34]/5 rounded-xl p-3 border border-[#ebbd34]/10 text-center mt-1">
        <p className="text-xs text-[#ebbd34]/60">Loading messages...</p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="w-full bg-[#ebbd34]/5 rounded-xl p-3 border border-[#ebbd34]/10 text-center mt-1">
        <p className="text-xs text-[#ebbd34]/60">No messages yet. Be the first to chat!</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#ebbd34]/5 rounded-xl p-2 border border-[#ebbd34]/10 mt-1">
      <h4 className="text-xs text-[#ebbd34] font-semibold mb-1 flex items-center">
        <MessageCircle className="w-3 h-3 mr-1" /> 
        Recent Chat
      </h4>
      <div className="overflow-hidden max-h-[80px]">
        {messages.slice(0, 3).map((message: any, idx: number) => (
          <div key={idx} className="flex items-start gap-1 mb-1">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[0.5rem] text-white font-bold"
              style={{ backgroundColor: getUserColor(message.username) }}
            >
              {message.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center">
                <p className="text-[0.65rem] font-medium text-[#ebbd34]/90 mr-1">
                  @{message.username.split('@')[0]}
                </p>
                <span className="text-[0.6rem] text-[#ebbd34]/50">
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
              <p className="text-[0.7rem] text-[#ebbd34]/80 line-clamp-1 font-medium">
                {getMessagePreview(message.content)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center">
        <Link to={`/bubble/${bubbleId}`} className="text-[0.7rem] text-[#ebbd34] hover:underline font-medium">
          View full conversation →
        </Link>
      </div>
    </div>
  );
};

export default ChatMessagePreview;
