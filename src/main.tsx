import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => console.log('[SW] Registration successful:', registration.scope),
      (error) => console.error('[SW] Registration failed:', error)
    );
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SubscriptionProvider>
      <App />
    </SubscriptionProvider>
  </StrictMode>
);
