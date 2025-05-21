
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { GamificationProvider } from "@/context/GamificationContext";
import { NetworkProvider } from "@/context/NetworkContext";
import RequireAuth from "@/components/RequireAuth";
import OfflineIndicator from "@/components/network/OfflineIndicator";
import ReconnectionIndicator from "@/components/network/ReconnectionIndicator";
import Navbar from "@/components/navigation/Navbar";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import BubbleChat from "@/pages/BubbleChat";
import Feed from "@/pages/Feed";
import MyBubbles from "@/pages/MyBubbles";
import Profile from "@/pages/Profile";
import Achievements from "@/pages/Achievements";
import NotFound from "@/pages/NotFound";
import GamificationTracker from "@/components/gamification/GamificationTracker";
import AchievementPopup from "@/components/gamification/AchievementPopup";
import DailyStreakIndicator from "@/components/gamification/DailyStreakIndicator";
import { useNetwork } from "@/context/NetworkContext";

function App() {
  return (
    <Router>
      <NetworkProvider>
        <AuthProvider>
          <GamificationProvider>
            <AppContent />
          </GamificationProvider>
        </AuthProvider>
      </NetworkProvider>
    </Router>
  );
}

// Separate component to use the NetworkContext after it's been provided
function AppContent() {
  // Get the isReconnecting state from the NetworkContext
  const { isOnline, isReconnecting } = useNetwork();
  
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <OfflineIndicator />
      <ReconnectionIndicator isReconnecting={isReconnecting} />
      <GamificationTracker />
      <AchievementPopup />
      <DailyStreakIndicator />
      
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/bubble-chat/:id" element={<BubbleChat />} />
        <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
        <Route path="/my-bubbles" element={<RequireAuth><MyBubbles /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/achievements" element={<RequireAuth><Achievements /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      <Toaster />
    </div>
  );
}

export default App;
