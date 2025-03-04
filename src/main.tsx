
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './core-styles.css'
import './index.css'

// Create a more helpful error handler
const handleError = (error: Error) => {
  console.error("Critical rendering error:", error);
  
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div class="fallback-error">
        <h2>Something went wrong</h2>
        <p>${error.message}</p>
        <p>Check the console for more details.</p>
        <button onclick="window.location.reload()">Reload App</button>
      </div>
    `;
  }
};

// Render with better error handling
try {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  handleError(error as Error);
}

// Handle global errors
window.addEventListener('error', (event) => {
  console.error("Global error:", event.error);
});
