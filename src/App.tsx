
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";

// Pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Feed from "@/pages/Feed";
import MyBubbles from "@/pages/MyBubbles";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import BubbleChat from "@/pages/BubbleChat";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth/*" element={<Auth />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/bubbles/:id" element={<BubbleChat />} />
          
          {/* Protected Routes */}
          <Route element={<RequireAuth><Outlet /></RequireAuth>}>
            <Route path="/my-bubbles" element={<MyBubbles />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          
          {/* 404 Route */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
