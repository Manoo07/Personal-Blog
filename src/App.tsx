import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Projects from "./pages/Projects";
import Admin from "./pages/Admin";
import AdminSections from "./pages/AdminSections";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { UserAuthProvider } from "@/contexts/UserAuthContext";
import { UserAuthModal } from "@/components/UserAuthModal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <UserAuthProvider>
          <Toaster />
          <Sonner />
          <UserAuthModal />
          <BrowserRouter
            basename="/Personal-Blog"
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mano-admin" element={<Admin />} />
              <Route path="/manohar" element={<Admin />} />
              <Route path="/manohar/sections" element={<AdminSections />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UserAuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
