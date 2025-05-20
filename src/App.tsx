
import React, { useEffect, Suspense } from 'react';
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
import ErrorBoundary from '@/components/errorHandling/ErrorBoundary';
import ComponentErrorBoundary from '@/components/errorHandling/ComponentErrorBoundary';
import './App.css';

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-16 h-16 border-4 border-t-transparent border-[#ebbd34] rounded-full animate-spin"></div>
  </div>
);

function AppContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Clear queries when user changes
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries();
    } else {
      queryClient.clear();
    }
  }, [user?.id, queryClient]);

  return (
    <>
      <Routes>
        <Route path="/" element={
          <ComponentErrorBoundary name="Index Page">
            <Index />
          </ComponentErrorBoundary>
        } />
        <Route path="/auth/*" element={
          <ComponentErrorBoundary name="Auth Page">
            <Auth />
          </ComponentErrorBoundary>
        } />
        <Route path="/feed" element={
          <RequireAuth>
            <ComponentErrorBoundary name="Feed Page">
              <Feed />
            </ComponentErrorBoundary>
          </RequireAuth>
        } />
        <Route path="/my-bubbles" element={
          <RequireAuth>
            <ComponentErrorBoundary name="My Bubbles Page">
              <MyBubbles />
            </ComponentErrorBoundary>
          </RequireAuth>
        } />
        <Route path="/bubble-chat/:id" element={
          <RequireAuth>
            <ComponentErrorBoundary name="Bubble Chat Page">
              <BubbleChat />
            </ComponentErrorBoundary>
          </RequireAuth>
        } />
        <Route path="/achievements" element={
          <RequireAuth>
            <ComponentErrorBoundary name="Achievements Page">
              <Achievements />
            </ComponentErrorBoundary>
          </RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth>
            <ComponentErrorBoundary name="Profile Page">
              <Profile />
            </ComponentErrorBoundary>
          </RequireAuth>
        } />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      
      {/* Achievement popups and trackers */}
      {user && (
        <Suspense fallback={null}>
          <AchievementPopup />
          <DailyStreakIndicator />
          <ComponentErrorBoundary name="Gamification Tracker">
            <GamificationTracker />
          </ComponentErrorBoundary>
        </Suspense>
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <AuthProvider>
            <GamificationProvider>
              <AppContent />
            </GamificationProvider>
          </AuthProvider>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
