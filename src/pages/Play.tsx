import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { useChallenges } from "@/hooks/useChallenges";
import { useAuth } from "@/hooks/useAuth";
import { useEventStatus } from "@/hooks/useEventStatus";
import { useEventInfo } from "@/hooks/useEventInfo";
import { ArrowLeft, CheckCircle2, Lock, LogOut, Pause, StopCircle, Clock } from "lucide-react";

const Play = () => {
  const { challenges, progress, loading, isChallengeUnlocked, getChallengeProgress, currentChallenge, refreshTrigger, calculatePoints } = useChallenges();
  const { profile, signOut } = useAuth();
  const { status: eventStatus, loading: statusLoading } = useEventStatus();
  const { title } = useEventInfo();

  const solvedCount = progress.filter(p => p.status === 'solved').length;
  const progressPercentage = challenges.length > 0 ? (solvedCount / challenges.length) * 100 : 0;

  if (loading || statusLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }



  // STAGE 3: Event is ENDED - Show ended message
  if (eventStatus === 'ended') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <header className="border-b border-primary/20 p-4">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm" className="btn-cyber">
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Devs@PSU Logo" className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-gradient-cyber">{title.split(' — ')[0] || title}</h1>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <Card className="card-cyber">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mx-auto mb-4 border border-accent/30">
                    <StopCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Event Ended</CardTitle>
                  <CardDescription className="text-lg">
                    The competition has ended. Thank you for participating!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center gap-4">
                    <Button asChild className="btn-neon">
                      <Link to="/leaderboard">View Final Results</Link>
                    </Button>
                    <Button asChild variant="outline" className="btn-cyber">
                      <Link to="/">Return Home</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // STAGE 0: Event not started - Show waiting message
  if (eventStatus === 'not_started') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <header className="border-b border-primary/20 p-4">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm" className="btn-cyber">
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Devs@PSU Logo" className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-gradient-cyber">{title.split(' — ')[0] || title}</h1>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <Card className="card-cyber">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mx-auto mb-4 border border-accent/30">
                    <Clock className="w-8 h-8 text-accent" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Event Not Started</CardTitle>
                  <CardDescription className="text-lg">
                    The competition hasn't started yet. Please check back later!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center gap-4">
                    <Button asChild className="btn-neon">
                      <Link to="/">Return Home</Link>
                    </Button>
                    <Button asChild variant="outline" className="btn-cyber">
                      <Link to="/leaderboard">View Leaderboard</Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="btn-cyber"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // STAGE 1: Event is LIVE - Show the normal quiz interface
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">


      {/* Paused Banner */}
      {eventStatus === 'paused' && (
        <div className="bg-accent/20 border-b border-accent/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Pause className="w-5 h-5 text-accent" />
            <span className="text-accent font-medium">Event Paused - All timers are frozen</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-nav">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button asChild variant="ghost" size="sm" className="btn-cyber p-2 sm:px-3">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
              </Link>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold text-gradient-cyber truncate">
              {title.split(' — ')[0] || title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden md:block text-sm text-muted-foreground">
              Welcome, <span className="text-primary">{profile?.full_name}</span>
            </span>
            <div className="hidden sm:flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/me'}
                className="text-xs sm:text-sm"
              >
                My Profile
              </Button>
              <Button asChild variant="outline" size="sm" className="btn-cyber text-xs sm:text-sm">
                <Link to="/leaderboard">Leaderboard</Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="btn-cyber text-xs sm:text-sm"
                onClick={signOut}
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Sign Out
              </Button>
            </div>
            {/* Mobile menu button would go here if needed */}
          </div>
        </div>
      </header>

      <div className="responsive-container py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress and Timer */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2">
              <h2 className="text-base sm:text-lg font-medium">Progress</h2>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm text-muted-foreground">Challenges Progress</div>
                  <div className="font-medium text-sm sm:text-base">
                    {solvedCount} of {challenges.length} completed
                  </div>
                </div>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2 sm:h-3" />
          </div>

          {/* Challenge Steps */}
          <div className="flex justify-center mb-6 sm:mb-8 overflow-x-auto pb-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-max px-4">
              {challenges.map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 ${
                    index < (currentChallenge?.order_index || 1) - 1 
                      ? 'bg-primary border-primary text-background' 
                      : index === (currentChallenge?.order_index || 1) - 1 
                        ? 'border-primary text-primary bg-primary/10' 
                        : 'border-muted text-muted-foreground'
                  }`}>
                    {index < (currentChallenge?.order_index || 1) - 1 ? (
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : index === (currentChallenge?.order_index || 1) - 1 ? (
                      <span className="text-xs sm:text-sm font-bold">{index + 1}</span>
                    ) : (
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                  </div>
                  {index < challenges.length - 1 && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 ${
                      index < (currentChallenge?.order_index || 1) - 1 ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Challenges */}
          <div className="space-y-4 sm:space-y-6">
            {challenges.map((challenge, index) => {
              const challengeProgress = getChallengeProgress(challenge.id);
              const isUnlocked = isChallengeUnlocked(challenge);
              const isActive = isUnlocked && challengeProgress?.status !== 'solved';
              const totalHintsUsed = progress.reduce((total, p) => total + (p.hints_used || 0), 0);
              
              return (
                <ChallengeCard
                  key={`${challenge.id}-${refreshTrigger}`}
                  challenge={challenge}
                  progress={challengeProgress}
                  isUnlocked={isUnlocked}
                  isActive={isActive}
                  totalHintsUsed={totalHintsUsed}
                />
              );
            })}
          </div>

          {/* Completed State */}
          {solvedCount === challenges.length && challenges.length > 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">🎉</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient-cyber mb-3 sm:mb-4">
                Congratulations!
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 px-4">
                You've completed all {challenges.length} challenges!
              </p>
              <Button asChild className="btn-neon">
                <Link to="/leaderboard">View Final Leaderboard</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </AuthGuard>
  );
};

export default Play;