import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { playClickSound, playNavSound } from "./hooks/useClickSound";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else {
  registerSW({ immediate: true });
}

// Global click sound — fires on any button, link, or interactive click
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const interactive = target.closest('button, a, [role="button"], [role="tab"], [role="menuitem"], input[type="checkbox"], input[type="radio"]');
  if (interactive) {
    const isNav = interactive.tagName === 'A' || interactive.closest('nav');
    if (isNav) {
      playNavSound();
    } else {
      playClickSound();
    }
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
