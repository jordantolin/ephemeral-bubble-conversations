
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
      <div className="w-full bg-[#ebbd34]/5 rounded-xl p-3 border border-[#ebbd34]/10 text-center mt-1 backdrop-blur-sm">
        <div className="h-1 w-20 bg-[#ebbd34]/20 rounded-full mx-auto mb-2 animate-pulse"></div>
        <div className="h-2 w-32 bg-[#ebbd34]/10 rounded-full mx-auto animate-pulse"></div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="w-full bg-[#ebbd34]/5 rounded-xl p-3 border border-[#ebbd34]/10 text-center mt-1 backdrop-blur-sm">
        <p className="text-xs text-[#ebbd34]/60">No messages yet. Be the first to chat!</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#ebbd34]/5 rounded-xl p-2 border border-[#ebbd34]/10 mt-1 backdrop-blur-sm">
      <h4 className="text-xs text-[#ebbd34] font-semibold mb-1 flex items-center">
        <MessageCircle className="w-3 h-3 mr-1" /> 
        Recent Chat
      </h4>
      <div className="overflow-hidden max-h-[80px]">
        {messages.slice(0, 3).map((message: any, idx: number) => (
          <motion.div 
            key={idx} 
            className="flex items-start gap-1 mb-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.1 }}
          >
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[0.5rem] text-white shadow-sm"
              style={{ backgroundColor: getUserColor(message.username) }}
            >
              {message.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center">
                <p className="text-[0.65rem] font-medium text-[#ebbd34]/80 mr-1">
                  @{message.username.split('@')[0]}
                </p>
                <span className="text-[0.6rem] text-[#ebbd34]/50">
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
              <p className="text-[0.7rem] text-[#ebbd34]/70 line-clamp-1 bg-white/40 px-1.5 py-0.5 rounded-md">
                {getMessagePreview(message.content)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-center mt-1">
        <Link 
          to={`/bubble/${bubbleId}`} 
          className="text-[0.7rem] text-[#ebbd34] hover:underline inline-flex items-center transition-all duration-200 hover:scale-105"
        >
          View full conversation <ArrowRight className="w-2.5 h-2.5 ml-1" />
        </Link>
      </div>
    </div>
  );
};

export default ChatMessagePreview;
