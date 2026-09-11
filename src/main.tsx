import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Safely suppress harmless third-party browser extension injection noise (e.g. MetaMask, wallet extensions)
if (typeof window !== 'undefined') {
  const isExtensionNoise = (text: string) =>
    /MetaMask|ethereum|inpage|chrome-extension|moz-extension|safari-extension|Extension context/i.test(text);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (isExtensionNoise(reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || event.error?.message || '';
    const src = event.filename || '';
    if (isExtensionNoise(msg) || isExtensionNoise(src)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
