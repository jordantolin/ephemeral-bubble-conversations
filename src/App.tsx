
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import Feed from "@/pages/Feed";
import MyBubbles from "@/pages/MyBubbles";
import BubbleChat from "@/pages/BubbleChat";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import RequireAuth from "@/components/RequireAuth";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/bubbles/:id" element={<BubbleChat />} />
            <Route path="/bubble-chat/:id" element={<BubbleChat />} />
            <Route path="/my-bubbles" element={<RequireAuth><MyBubbles /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/auth/*" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
