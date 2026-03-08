import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { playClickSound, playNavSound } from "./hooks/useClickSound";

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
