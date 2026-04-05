import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Search, MessageSquare, Menu, X, Bookmark, Settings, Send, Lightbulb, CalendarDays, Download, Flame, Globe2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDownloadState, subscribeDownload } from '@/hooks/useDownloadManager';
import NotificationBell from '@/components/NotificationBell';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/read', icon: BookOpen, label: 'Read' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/topics', icon: Lightbulb, label: 'Topics' },
  { path: '/community', icon: MessageSquare, label: 'Community' },
];

const MENU_ITEMS = [
  { path: '/confessions', icon: Flame, label: 'Confessions & Prayers' },
  { path: '/plans', icon: CalendarDays, label: 'Reading Plans' },
  { path: '/bookmarks', icon: Bookmark, label: 'Bookmarks & Highlights' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/feedback', icon: Send, label: 'Send Feedback' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dlState, setDlState] = useState(getDownloadState);

  useEffect(() => {
    return subscribeDownload(() => setDlState(getDownloadState()));
  }, []);

  const dlPct = dlState.progress ? Math.round((dlState.progress.downloaded / dlState.progress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background theme-transition flex flex-col">
      {/* Global download progress bar */}
      {dlState.active && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-secondary">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${dlPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 h-14 max-w-4xl mx-auto">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="HolyWord" className="w-9 h-9 rounded-lg object-cover shadow-sm group-hover:shadow-md transition-shadow" />
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">HolyWord</h1>
          </Link>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            {dlState.active ? (
              <Link
                to="/install"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                title="Downloading Bible…"
              >
                <Download size={14} className="animate-bounce" />
                <span>{dlPct}%</span>
              </Link>
            ) : (
              <Link
                to="/install"
                className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground hover:text-primary transition-all active:scale-95"
                title="Install App"
              >
                <Download size={20} />
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl hover:bg-secondary/80 text-foreground transition-all active:scale-95"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-card/95 backdrop-blur-xl border-l border-border/60 shadow-2xl"
            >
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <span className="font-display text-lg font-bold text-card-foreground">Menu</span>
                <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary/80 text-card-foreground transition-colors active:scale-95">
                  <X size={18} />
                </button>
              </div>
              <nav className="p-3 space-y-1">
                {MENU_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                        location.pathname === item.path
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-card-foreground hover:bg-secondary/60'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 pb-20 max-w-4xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-lg">
        <div className="flex items-center justify-around max-w-4xl mx-auto h-16 px-2">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all active:scale-95 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-8 h-1 rounded-full bg-primary"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
