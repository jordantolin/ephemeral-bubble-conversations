
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
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] min-h-[100dvh]">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
