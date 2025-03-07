
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Auth from '@/pages/Auth';
import Index from '@/pages/Index';
import Feed from '@/pages/Feed';
import BubbleChat from '@/pages/BubbleChat';
import Achievements from '@/pages/Achievements';
import Profile from '@/pages/Profile';
import RequireAuth from '@/components/RequireAuth';
import NotFound from '@/pages/NotFound';
import MyBubbles from '@/pages/MyBubbles';
import { GamificationProvider } from '@/context/GamificationContext';
import AchievementPopup from '@/components/gamification/AchievementPopup';
import GamificationTracker from '@/components/gamification/GamificationTracker';
import DailyStreakIndicator from '@/components/gamification/DailyStreakIndicator';
import './App.css';

function AppContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Clear queries when user changes
  useEffect(() => {
    queryClient.clear();
  }, [user?.id, queryClient]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
        <Route path="/my-bubbles" element={<RequireAuth><MyBubbles /></RequireAuth>} />
        <Route path="/bubble-chat/:id" element={<RequireAuth><BubbleChat /></RequireAuth>} />
        <Route path="/achievements" element={<RequireAuth><Achievements /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      
      {/* Achievement popups and trackers */}
      {user && (
        <>
          <AchievementPopup />
          <DailyStreakIndicator />
          <GamificationTracker />
        </>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GamificationProvider>
          <AppContent />
        </GamificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
