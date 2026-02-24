import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard";
import Index from "./pages/Index";
import Play from "./pages/Play";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import EmergencyAdmin from "./pages/EmergencyAdmin";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/play" element={
            <AuthGuard>
              <Play />
            </AuthGuard>
          } />
          <Route path="/me" element={
            <AuthGuard>
              <Profile />
            </AuthGuard>
          } />
          <Route path="/admin" element={
            <AuthGuard requireAdmin>
              <Admin />
            </AuthGuard>
          } />
          <Route path="/emergency-admin" element={<EmergencyAdmin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;