import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { SessionContextProvider } from './components/SessionContextProvider.tsx';
import ToastProvider from './components/ToastProvider.tsx'; // Import ToastProvider

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionContextProvider>
        <ToastProvider /> {/* Add ToastProvider here */}
        <App />
      </SessionContextProvider>
    </BrowserRouter>
  </StrictMode>
);