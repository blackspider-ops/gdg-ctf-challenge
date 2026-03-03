import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthModal } from "@/components/auth/AuthModal";
import { MobileNav } from "@/components/ui/mobile-nav";
import { useAuth } from "@/hooks/useAuth";
import { useEventInfo } from "@/hooks/useEventInfo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Zap, Trophy, Users, Clock, Lock, LogOut, User } from "lucide-react";
import { Logo } from "@/components/ui/logo";

console.log('🏠 INDEX PAGE MODULE LOADED');

const Index = () => {
  console.log('🏠 INDEX COMPONENT RENDERING');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { title, datetime, location, duration, formatEventDate, formatEventTime, loading: eventLoading } = useEventInfo();
  const { toast } = useToast();
  
  console.log('🏠 INDEX STATE:', { user: !!user, profile: !!profile, title, eventLoading });

  // Handle auth from URL (magic links)
  useEffect(() => {
    console.log('🏠 INDEX: useEffect running for auth handling');
    const handleAuthFromUrl = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);

      const error = hashParams.get('error') || urlParams.get('error');
      const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');
      const errorCode = hashParams.get('error_code') || urlParams.get('error_code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (error) {

        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Show appropriate error message
        if (errorCode === 'otp_expired' || error === 'access_denied') {
          toast({
            title: "Magic link expired",
            description: "The magic link has expired. Please request a new one.",
            variant: "destructive",
          });
          setAuthModalOpen(true);
        } else {
          toast({
            title: "Authentication failed",
            description: errorDescription || "Please try requesting a new magic link.",
            variant: "destructive",
          });
        }
        return;
      }

      // If we have auth tokens in the URL, try to establish session
      if (accessToken && refreshToken) {
        try {
          // Wait a moment for Supabase to process the tokens
          setTimeout(async () => {
            const { data, error: sessionError } = await supabase.auth.getSession();

            if (data.session?.user) {
              toast({
                title: "Welcome!",
                description: "You've been successfully signed in.",
              });
              // Clean the URL
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }, 1000);
        } catch (err) {
          console.error('Error processing auth tokens:', err);
        }
      }
    };

    handleAuthFromUrl();
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      {console.log('🏠 INDEX: Rendering JSX')}
      {/* Header with user info */}
      {user && (
        <header className="mobile-header">
          <MobileNav title={title} showUserActions={true} />
        </header>
      )}

      {/* Hero Section - Dark Mode with Google Colors */}
      <section className="relative overflow-hidden bg-background">
        {/* Google color accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-google" />
        
        <div className="relative responsive-container py-16 sm:py-20 md:py-28">
          <div className="text-center max-w-5xl mx-auto">
            {/* GDG Logo Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-card rounded-full mb-8 border border-primary/20">
              <img src="/logo.png" alt="GDG Logo" className="w-10 h-10 object-contain" />
              <span className="text-sm font-medium text-foreground">Google Developers Group</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-red-400 to-yellow-400 bg-clip-text text-transparent">
                CTF Challenge
              </span>
            </h1>

            <p className="text-xl sm:text-2xl md:text-3xl text-foreground mb-4 font-medium">
              Capture the Flag. Prove your skills.
            </p>

            <p className="text-base sm:text-lg text-muted-foreground mb-12 max-w-2xl mx-auto px-4">
              Join Google Developers Group's cybersecurity competition. Solve challenges, climb the leaderboard, and showcase your hacking expertise.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              {user || profile ? (
                <>
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-lg transition-all">
                    <Link to="/play">Continue Playing</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="bg-transparent border-2 border-primary/60 hover:border-primary text-primary hover:bg-primary/10 font-semibold px-8 py-3 rounded-lg transition-all">
                    <Link to="/leaderboard">View Leaderboard</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-lg transition-all"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Get Started
                  </Button>
                  <Button asChild variant="outline" size="lg" className="bg-transparent border-2 border-primary/60 hover:border-primary text-primary hover:bg-primary/10 font-semibold px-8 py-3 rounded-lg transition-all">
                    <Link to="/leaderboard">View Leaderboard</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Event Info */}
      <section className="py-12 sm:py-16 md:py-20 bg-secondary/50">
        <div className="responsive-container">
          <Card className="max-w-3xl mx-auto bg-card rounded-2xl shadow-google-lg border border-primary/20">
            <CardHeader className="px-6 sm:px-8 pt-8">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground text-center">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-6 sm:px-8 pb-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="p-3 bg-blue-500/20 rounded-full">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-muted-foreground mb-1">When</p>
                    <p className="text-base font-semibold text-foreground">
                      {eventLoading ? 'Loading...' : formatEventDate(datetime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {eventLoading ? '' : formatEventTime(datetime, duration)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Where</p>
                    <p className="text-base font-semibold text-foreground">
                      {eventLoading ? 'Loading...' : location}
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-6 mt-6">
                <p className="text-base text-muted-foreground text-center">
                  🚀 Bring your laptop and your best hacking skills!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-8 sm:py-12 md:py-16 bg-background">
        <div className="responsive-container">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="responsive-text-title font-bold mb-3 sm:mb-4 text-gradient-cyber">How It Works</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Solve CTF challenges, earn points, and climb the leaderboard. Every flag counts!
            </p>
          </div>

          <div className="responsive-grid max-w-4xl mx-auto">
            <Card className="card-cyber">
              <CardHeader className="text-center px-4 sm:px-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Register</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-sm sm:text-base text-muted-foreground text-center">
                  Sign up with your email and full name to join the CTF competition.
                </p>
              </CardContent>
            </Card>

            <Card className="card-cyber">
              <CardHeader className="text-center px-4 sm:px-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Solve Challenges</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-sm sm:text-base text-muted-foreground text-center">
                  Solve CTF challenges to capture flags. Each flag earns you points.
                </p>
              </CardContent>
            </Card>

            <Card className="card-cyber">
              <CardHeader className="text-center px-4 sm:px-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Compete</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-sm sm:text-base text-muted-foreground text-center">
                  Race against time and other competitors on the real-time leaderboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 sm:py-12 md:py-16">
        <div className="responsive-container">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="responsive-text-title font-bold mb-3 sm:mb-4 text-gradient-cyber">FAQ</h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            <Card className="card-cyber">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Who can participate?</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Anyone interested in cybersecurity can participate.
                  No prior CTF experience required!
                </p>
              </CardContent>
            </Card>

            <Card className="card-cyber">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">What should I bring?</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Just bring your laptop with a web browser and internet connection.
                  All challenges are completed through this web platform.
                </p>
              </CardContent>
            </Card>

            <Card className="card-cyber">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">How does scoring work?</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Each challenge awards 100 points. Your total time (sum of individual challenge times)
                  is used as a tiebreaker. Faster is better!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-6 sm:py-8">
        <div className="responsive-container text-center">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Logo size="md" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            © 2026 Google Developers Group. Built with ❤️ for the Penn State developer community.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
};

export default Index;