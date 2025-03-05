
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './App.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/toaster.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { NetworkProvider } from './context/NetworkContext.tsx'
import { GamificationProvider } from './context/GamificationContext.tsx'

// Create a client
const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <NetworkProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GamificationProvider>
              <App />
              <Toaster />
            </GamificationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </NetworkProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
