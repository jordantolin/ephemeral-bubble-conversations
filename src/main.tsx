
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './core-styles.css'
import './index.css'

// Render with error boundary
try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  console.error("Error rendering app:", error);
  document.getElementById('root')!.innerHTML = '<div class="fallback-error">An error occurred while loading the application. Please check the console for details.</div>';
}
