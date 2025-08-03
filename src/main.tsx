import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeData } from "./lib/dataUtils";

// Initialize mock data on app start
initializeData();

// Register service worker for PWA/offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      },
      (err) => {
        console.error('Service Worker registration failed:', err);
      }
    );
  });
}

createRoot(document.getElementById("root")!).render(<App />);
