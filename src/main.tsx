
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/errorHandling/ErrorBoundary'

console.log("Starting application initialization");

// Create a client with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      onError: (error) => {
        console.error("Query error:", error);
      }
    },
  },
})

// Create root first, then render
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error("Root element not found!")
} else {
  const root = createRoot(rootElement)
  
  console.log("Root created, rendering app");
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
  
  console.log("App rendered");
}

// Check React version
console.log("React version:", React.version);
