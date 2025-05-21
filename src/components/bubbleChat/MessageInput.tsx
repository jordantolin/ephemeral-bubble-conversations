
import React from "react";
import { Send, Image, Video, SmilePlus, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  isExpired: boolean;
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleFileUpload: (type: 'image' | 'video' | 'gif') => void;
  isRecording: boolean;
  recordingSeconds: number;
  formatRecordingTime: (seconds: number) => string;
  handleVoiceRecord: () => void;
  stopRecording: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  isExpired,
  newMessage,
  setNewMessage,
  handleSendMessage,
  handleFileUpload,
  isRecording,
  recordingSeconds,
  formatRecordingTime,
  handleVoiceRecord,
  stopRecording
}) => {
  if (isExpired) {
    return (
      <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-center">
        <p className="text-gray-500 text-sm">This bubble has exploded</p>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-[#ebbd34]/10 p-3">
      <div className="container max-w-3xl mx-auto">
        {/* Recording UI */}
        {isRecording ? (
          <div className="flex items-center justify-between bg-[#FEF7E4] rounded-full px-4 py-2 mb-2 shadow-md">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm text-gray-600">
                {formatRecordingTime(recordingSeconds)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full"
                onClick={() => stopRecording()}
              >
                <X className="h-5 w-5" />
                <span className="ml-1">Cancel</span>
              </Button>
              <Button
                size="sm"
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white rounded-full"
                onClick={() => stopRecording()}
              >
                <Send className="h-4 w-4 mr-1" />
                <span>Send</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Media buttons */}
            <div className="flex gap-2 shrink-0">
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/10"
                onClick={() => handleFileUpload('image')}
              >
                <Image className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/10"
                onClick={() => handleFileUpload('video')}
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/10"
                onClick={() => handleFileUpload('gif')}
              >
                <SmilePlus className="h-5 w-5" />
              </Button>
            </div>
            
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 rounded-full bg-[#ebbd34]/5 border-[#ebbd34]/20 text-gray-800 placeholder-gray-500 focus-visible:ring-[#ebbd34]/20"
            />
            
            {newMessage.trim() ? (
              <Button 
                onClick={handleSendMessage}
                size="icon" 
                className="rounded-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button 
                onClick={handleVoiceRecord}
                size="icon" 
                className={`rounded-full ${
                  isRecording 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
                }`}
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
