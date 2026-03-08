import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Sonner />
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
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
