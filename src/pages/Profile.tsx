
import MainNav from "@/components/MainNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star } from "lucide-react";

const Profile = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary/20">
      <MainNav />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="glass p-8 rounded-3xl">
            <div className="flex items-center space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-3xl font-bold">John Doe</h1>
                <p className="text-muted-foreground mt-1">Bubble Explorer</p>
                
                <div className="flex items-center space-x-4 mt-4">
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Trophy className="w-3 h-3" />
                    <span>Level 5</span>
                  </Badge>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>42 Reflects</span>
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Recent Badges</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {["Conversation Starter", "Quick Thinker", "Helpful Soul"].map((badge) => (
                  <div key={badge} className="glass p-4 rounded-xl text-center">
                    <Trophy className="w-8 h-8 mx-auto text-primary" />
                    <p className="mt-2 text-sm font-medium">{badge}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
