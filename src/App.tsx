import { useState, useEffect, useCallback } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
import { invalidateStaleCacheIfNeeded } from "@/hooks/useBibleCache";
import { PlanAheadWatch } from "@/hooks/usePlanAhead";
import BibleIntro from "@/components/BibleIntro";
import Index from "./pages/Index";
import Reader from "./pages/Reader";
import ReadingPlans from "./pages/ReadingPlans";
import Topics from "./pages/Topics";
import Community from "./pages/Community";
import BookmarksPage from "./pages/Bookmarks";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/Settings";
import FeedbackPage from "./pages/Feedback";
import InstallPage from "./pages/Install";
import SignInPage from "./pages/SignIn";
import ConfessionsPage from "./pages/Confessions";
import BibleMaps from "./pages/BibleMaps";
import NotFound from "./pages/NotFound";
import AnnouncementModal from "./components/AnnouncementModal";
import { DailyReminderWatcher } from "@/hooks/useDailyReminder";
import { VerseLibrarySync } from "@/hooks/useVerseLibrarySync";

const queryClient = new QueryClient();

const INTRO_KEY = 'hw-intro-seen';

const App = () => {
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !localStorage.getItem(INTRO_KEY);
    } catch {
      return false;
    }
  });

  // Invalidate stale offline cache on app start
  useEffect(() => {
    invalidateStaleCacheIfNeeded();
  }, []);

  const handleIntroComplete = useCallback(() => {
    try { localStorage.setItem(INTRO_KEY, '1'); } catch {}
    setShowIntro(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Sonner />
          <DailyReminderWatcher />
          <VerseLibrarySync />
          <PlanAheadWatch />
          <AnnouncementModal />
          {showIntro && <BibleIntro onComplete={handleIntroComplete} />}
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/read" element={<Reader />} />
                <Route path="/plans" element={<ReadingPlans />} />
                <Route path="/topics" element={<Topics />} />
                <Route path="/community" element={<Community />} />
                <Route path="/bookmarks" element={<BookmarksPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/confessions" element={<ConfessionsPage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/install" element={<InstallPage />} />
                <Route path="/maps" element={<BibleMaps />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
