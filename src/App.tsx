
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NetworkProvider } from "./context/NetworkContext";
import { AuthProvider } from "./context/AuthContext";
import { GamificationProvider } from "./context/GamificationContext";
import RequireAuth from "./components/RequireAuth";
import ErrorBoundary from "./components/errorHandling/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Feed from "./pages/Feed";
import BubbleChat from "./pages/BubbleChat";
import MyBubbles from "./pages/MyBubbles";
import NotFound from "./pages/NotFound";
import Achievements from "./pages/Achievements";
import GamificationTracker from "./components/gamification/GamificationTracker";

// Create a query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <NetworkProvider>
            <AuthProvider>
              <GamificationProvider>
                <GamificationTracker />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/bubble/:id" element={<BubbleChat />} />
                  <Route path="/bubble-chat/:id" element={<BubbleChat />} />
                  <Route path="/feed" element={<Feed />} />
                  
                  <Route 
                    path="/profile" 
                    element={
                      <RequireAuth>
                        <Profile />
                      </RequireAuth>
                    } 
                  />
                  
                  <Route 
                    path="/my-bubbles" 
                    element={
                      <RequireAuth>
                        <MyBubbles />
                      </RequireAuth>
                    } 
                  />
                  
                  <Route 
                    path="/achievements" 
                    element={
                      <RequireAuth>
                        <Achievements />
                      </RequireAuth>
                    } 
                  />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
              </GamificationProvider>
            </AuthProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
