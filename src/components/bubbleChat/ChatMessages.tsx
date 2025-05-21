
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Download, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMessageTime, getUserColor } from "@/utils/messageUtils";

interface ChatMessagesProps {
  messages: any[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  playingAudioId: string | null;
  isCurrentUser: (username: string) => boolean;
  togglePlayAudio: (messageId: string, audioSrc: string) => void;
  handleDownloadMedia: (content: string, type: string) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  messagesEndRef,
  playingAudioId,
  isCurrentUser,
  togglePlayAudio,
  handleDownloadMedia
}) => {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <MessageCircle className="w-10 h-10 text-[#ebbd34]/30 mb-2" />
        <p className="text-[#ebbd34]/70">No messages yet. Be the first to chat!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100dvh-350px)]">
      <div className="space-y-4 px-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex mb-4 ${isCurrentUser(message.username) ? "justify-end" : "justify-start"}`}
          >
            {!isCurrentUser(message.username) && (
              <div 
                className="w-8 h-8 rounded-full flex-shrink-0 mt-1 mr-2 flex items-center justify-center text-sm text-white"
                style={{ backgroundColor: getUserColor(message.username) }}
              >
                {message.username.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className={`max-w-[75%] rounded-xl p-3 ${
              isCurrentUser(message.username)
                ? "bg-[#ebbd34] text-white"
                : "bg-white text-gray-800 border border-[#ebbd34]/20"
            }`}>
              {!isCurrentUser(message.username) && (
                <p className="text-xs font-medium mb-1 text-[#ebbd34]/80">
                  @{message.username.split('@')[0]}
                </p>
              )}
              
              {message.content.startsWith('data:image/') ? (
                <div className="relative group">
                  <img 
                    src={message.content} 
                    alt="Shared image" 
                    className="rounded-md max-w-full cursor-pointer"
                    onClick={() => window.open(message.content, '_blank')}
                  />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white"
                      onClick={() => handleDownloadMedia(message.content, 'jpg')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : message.content.startsWith('data:video/') ? (
                <div className="relative group">
                  <video 
                    src={message.content} 
                    controls 
                    className="rounded-md max-w-full"
                    playsInline
                  />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white"
                      onClick={() => handleDownloadMedia(message.content, 'mp4')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : message.content.startsWith('data:audio/') ? (
                <div className="flex items-center gap-2 p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-10 w-10 rounded-full ${
                      playingAudioId === message.id ? 
                      "bg-[#ebbd34]/20 text-[#ebbd34]" : 
                      isCurrentUser(message.username) ?
                      "text-white hover:bg-white/20" :
                      "text-[#ebbd34] hover:bg-[#ebbd34]/10"
                    }`}
                    onClick={() => togglePlayAudio(message.id, message.content)}
                  >
                    {playingAudioId === message.id ? 
                      <X className="h-5 w-5" /> : 
                      <Volume2 className="h-5 w-5" />
                    }
                  </Button>
                  
                  <div className="flex-1 h-8 flex items-center">
                    <div className="w-full flex items-center justify-between space-x-0.5">
                      {Array.from({ length: 27 }).map((_, i) => {
                        const heights = [
                          3, 5, 7, 4, 9, 5, 2, 8, 6, 3, 7, 9, 5, 3, 8, 6, 2, 5, 9, 4, 6, 3, 7, 8, 5, 2, 4
                        ];
                        const height = heights[i];
                        const isPlaying = playingAudioId === message.id;
                        
                        const barColor = isCurrentUser(message.username)
                          ? isPlaying ? "bg-white" : "bg-white/60" 
                          : isPlaying ? "bg-[#ebbd34]" : "bg-[#ebbd34]/60";
                          
                        return (
                          <div 
                            key={i}
                            className={`w-1 rounded-full transition-all duration-300 ${barColor}`}
                            style={{ 
                              height: `${height}px`,
                              animation: isPlaying ? `pulse-${i % 3} 1.2s infinite` : 'none',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p>{message.content}</p>
              )}
              
              <div className={`text-right mt-1 ${
                isCurrentUser(message.username) ? "text-white/70" : "text-gray-500"
              }`}>
                <span className="text-xs">
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
            </div>
            
            {isCurrentUser(message.username) && (
              <div 
                className="w-8 h-8 rounded-full flex-shrink-0 mt-1 ml-2 flex items-center justify-center text-sm text-white"
                style={{ backgroundColor: getUserColor(message.username) }}
              >
                {message.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMessages;
