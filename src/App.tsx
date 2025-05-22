
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Feed from './pages/Feed'
import BubbleChat from './pages/BubbleChat'
import Index from './pages/Index'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import Achievements from './pages/Achievements'
import MyBubbles from './pages/MyBubbles'
import RequireAuth from './components/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import { GamificationProvider } from './context/GamificationContext'
import { NetworkProvider } from './context/NetworkContext'
import InstallButton from './components/InstallButton'
import ErrorBoundary from './components/errorHandling/ErrorBoundary'
import { setupNetworkMonitor, teardownNetworkMonitor } from './utils/networkMonitor'
import GamificationTracker from './components/gamification/GamificationTracker'

function App() {
  // Configura il monitor di rete globale
  useEffect(() => {
    // Inizializza il monitor di rete
    setupNetworkMonitor();
    
    // Cleanup quando l'app si chiude
    return () => {
      teardownNetworkMonitor();
    };
  }, []);
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <NetworkProvider>
          <AuthProvider>
            <GamificationProvider>
              <InstallButton />
              <GamificationTracker />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/sign-in" element={<Navigate to="/auth" />} />
                <Route path="/auth/sign-up" element={<Navigate to="/auth" />} />
                <Route path="/bubble/:id" element={<BubbleChat />} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/achievements" element={<RequireAuth><Achievements /></RequireAuth>} />
                <Route path="/my-bubbles" element={<RequireAuth><MyBubbles /></RequireAuth>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </GamificationProvider>
          </AuthProvider>
        </NetworkProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
