
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import Loading from './components/Loading';

// Lazy loaded components
const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const Feed = lazy(() => import('./pages/Feed'));
const MyBubbles = lazy(() => import('./pages/MyBubbles'));
const BubbleChat = lazy(() => import('./pages/BubbleChat'));
const NotFound = lazy(() => import('./pages/NotFound'));

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/*" element={<Auth />} />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route path="/feed" element={<Feed />} />
            <Route
              path="/my-bubbles"
              element={
                <RequireAuth>
                  <MyBubbles />
                </RequireAuth>
              }
            />
            <Route
              path="/bubbles/:id"
              element={
                <RequireAuth>
                  <BubbleChat />
                </RequireAuth>
              }
            />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
        </Suspense>
      </Router>
      <Toaster />
    </AuthProvider>
  );
};

export default App;
