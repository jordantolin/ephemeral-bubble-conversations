
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface BubbleCardProps {
  bubble: {
    id: string;
    name: string;
    topic: string;
    description: string | null;
    reflect_count: number;
    expires_at: string;
    created_at: string;
  };
  formatDate: (dateString: string) => string;
  isBubbleExpired: (bubble: any) => boolean;
}

const BubbleCard: React.FC<BubbleCardProps> = ({ bubble, formatDate, isBubbleExpired }) => {
  const isExpired = isBubbleExpired(bubble);
  
  return (
    <Link key={bubble.id} to={`/bubble/${bubble.id}`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full bg-white/80 backdrop-blur-sm border-[#ebbd34]/10 ${
        isExpired ? 'opacity-70' : ''
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#ebbd34]">{bubble.name}</CardTitle>
          <CardDescription>{bubble.topic}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 line-clamp-2">
            {bubble.description || "No description"}
          </p>
        </CardContent>
        <CardFooter className="pt-0">
          <div className="w-full flex justify-between items-center">
            <Badge className="text-xs bg-[#ebbd34]/10 text-[#ebbd34]">
              {bubble.reflect_count} reflects
            </Badge>
            <div className="flex items-center">
              {isExpired && (
                <Badge className="mr-2 text-xs bg-red-100 text-red-600">
                  Expired
                </Badge>
              )}
              <span className="text-xs text-gray-400">
                {isExpired ? "Expired on " : "Expires "} 
                {formatDate(bubble.expires_at)}
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default BubbleCard;
