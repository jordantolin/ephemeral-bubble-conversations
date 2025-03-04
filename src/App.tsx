
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import BubbleChat from "./pages/BubbleChat";
import MyBubbles from "./pages/MyBubbles";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NetworkProvider } from "./context/NetworkContext";
import ErrorBoundary from "./components/errorHandling/ErrorBoundary";
import OfflineIndicator from "./components/network/OfflineIndicator";
import "./App.css";

function App() {
  // Create a query client with better configuration for reliability
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1, // Reduced retries for better user experience
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
        staleTime: 5000,
      },
      mutations: {
        // Add error handling for mutations
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
        <NetworkProvider>
          <AuthProvider>
            <Router>
              <div className="bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] min-h-[100dvh]">
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
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </div>
              <OfflineIndicator />
              <Toaster />
            </Router>
          </AuthProvider>
        </NetworkProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
