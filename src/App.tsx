
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import BubbleChat from "./pages/BubbleChat";
import MyBubbles from "./pages/MyBubbles";
import Profile from "./pages/Profile";
import Achievements from "./pages/Achievements";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NetworkProvider } from "./context/NetworkContext";
import { GamificationProvider } from "./context/GamificationContext";
import ErrorBoundary from "./components/errorHandling/ErrorBoundary";
import OfflineIndicator from "./components/network/OfflineIndicator";
import AchievementPopup from "./components/gamification/AchievementPopup";
import "./App.css";

function App() {
  // Create a query client with better configuration for reliability
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
        staleTime: 5000,
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          console.error('Mutation error:', error);
        }
      },
    },
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <NetworkProvider>
            <AuthProvider>
              <GamificationProvider>
                <div className="bg-[#FEF7E4] min-h-screen w-full">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/logout" element={<Auth />} />
                    <Route path="/feed" element={
                      <RequireAuth>
                        <Feed />
                      </RequireAuth>
                    } />
                    <Route path="/bubble/:id" element={
                      <RequireAuth>
                        <BubbleChat />
                      </RequireAuth>
                    } />
                    <Route path="/my-bubbles" element={
                      <RequireAuth>
                        <MyBubbles />
                      </RequireAuth>
                    } />
                    <Route path="/profile" element={
                      <RequireAuth>
                        <Profile />
                      </RequireAuth>
                    } />
                    <Route path="/achievements" element={
                      <RequireAuth>
                        <Achievements />
                      </RequireAuth>
                    } />
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Routes>
                  <OfflineIndicator />
                  <Toaster />
                  <AchievementPopup />
                </div>
              </GamificationProvider>
            </AuthProvider>
          </NetworkProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
