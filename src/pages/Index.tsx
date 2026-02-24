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

const Index = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { title, datetime, location, formatEventDate, formatEventTime, loading: eventLoading } = useEventInfo();
  const { toast } = useToast();

  // Handle auth from URL (magic links)
  useEffect(() => {
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
      {/* Header with user info */}
      {user && (
        <header className="mobile-header">
          <MobileNav title={title} showUserActions={true} />
        </header>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative responsive-container py-12 sm:py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 bg-primary/10 border border-primary/20 rounded-full mb-4 sm:mb-6">
              <Logo size="sm" />
              <span className="text-xs sm:text-sm text-primary font-medium">Presents</span>
            </div>

            <h1 className="responsive-text-hero font-bold mb-4 sm:mb-6 text-gradient-cyber glow-text">
              {title.split(' — ')[0] || title}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-3 sm:mb-4">
              Crack the code. Win the night.
            </p>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
              Challenge yourself in the ultimate cybersecurity competition. Solve progressive cipher challenges,
              compete on the real-time leaderboard, and prove your cryptographic skills.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              {user || profile ? (
                <>
                  <Button asChild size="lg" className="btn-neon text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                    <Link to="/play">Continue Playing</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="btn-cyber text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                    <Link to="/leaderboard">View Leaderboard</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="btn-neon text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Open Account
                  </Button>
                  <Button asChild variant="outline" size="lg" className="btn-cyber text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                    <Link to="/leaderboard">View Leaderboard</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Event Info */}
      <section className="py-8 sm:py-12 md:py-16">
        <div className="responsive-container">
          <Card className="card-cyber max-w-2xl mx-auto text-center">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl text-gradient-cyber">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <span className="text-base sm:text-lg font-medium text-center">
                    {eventLoading ? 'Loading...' : `${formatEventDate(datetime)} • ${formatEventTime(datetime)}`}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <span className="text-base sm:text-lg font-medium text-center">
                    {eventLoading ? 'Loading...' : location}
                  </span>
                </div>
              </div>
              <div className="border-t border-primary/20 pt-3 sm:pt-4">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Bring your laptop and your best cryptographic instincts!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-8 sm:py-12 md:py-16">
        <div className="responsive-container">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="responsive-text-title font-bold mb-3 sm:mb-4 text-gradient-cyber">How It Works</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Progressive challenges that unlock as you solve them. Every second counts!
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
                  Sign up with your PSU email and full name to join the competition.
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
                  Crack ciphers in sequence. Each solved challenge unlocks the next one.
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
                  Any Penn State student with a valid @psu.edu email address can participate.
                  No prior cryptography experience required!
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
            © 2025 Devs@PSU. Built with ❤️ for the developers community.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
};

export default Index;