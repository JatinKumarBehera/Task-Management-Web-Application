import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Capture and silence benign browser-specific websocket / HMR connection errors in the sandbox/iframe environment
if (typeof window !== 'undefined') {
  const isWebsocketOrHMR = (message: string) => {
    const lowerMessage = String(message).toLowerCase();
    return (
      lowerMessage.includes('websocket') ||
      lowerMessage.includes('vite') ||
      lowerMessage.includes('hmr') ||
      lowerMessage.includes('connection')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const reasonStr = String(reason);
      const reasonMsg = reason instanceof Error ? reason.message : '';
      if (isWebsocketOrHMR(reasonStr) || isWebsocketOrHMR(reasonMsg)) {
        // Prevent default browser log / overlay popup for benign sandbox/iframe environment HMR warnings
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (isWebsocketOrHMR(message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
