import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { ArrowLeft, Trophy, Clock, Users, Zap, Pause, StopCircle } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useEventStatus } from "@/hooks/useEventStatus";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthModal } from "@/components/auth/AuthModal";
import { Logo } from "@/components/ui/logo";

const Leaderboard = () => {
  const { leaderboard, loading, formatTime } = useLeaderboard();
  const { status: eventStatus, allowPlayAccess } = useEventStatus();
  const { user, profile } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { icon: "🥇", color: "text-primary" };
    if (rank === 2) return { icon: "🥈", color: "text-accent" };
    if (rank === 3) return { icon: "🥉", color: "text-muted-foreground" };
    return { icon: rank.toString(), color: "text-muted-foreground" };
  };

  const totalParticipants = leaderboard.length;
  const maxChallengesSolved = Math.max(0, ...leaderboard.map(p => p.challenges_solved));
  const bestTime = leaderboard.find(p => p.challenges_solved === maxChallengesSolved)?.total_time_seconds;

  return (
    <div className="min-h-screen bg-background">
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
            <div className="flex items-center gap-2 sm:gap-3">
              <Logo size="md" showText={false} />
              <h1 className="text-lg sm:text-2xl font-bold text-gradient-cyber">Live Leaderboard</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {user || profile ? (
              <Button asChild className="btn-neon text-sm sm:text-base px-3 sm:px-4">
                <Link to="/play">
                  <span className="hidden sm:inline">Join Competition</span>
                  <span className="sm:hidden">Join</span>
                </Link>
              </Button>
            ) : (
              <Button 
                onClick={() => setAuthModalOpen(true)}
                className="btn-neon text-sm sm:text-base px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Join Competition</span>
                <span className="sm:hidden">Join</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="responsive-container py-4 sm:py-6 md:py-8">
        {/* Stats Cards */}
        <div className="responsive-grid mb-6 sm:mb-8">
          <Card className="card-cyber">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-6 sm:h-8 w-12 sm:w-16 mb-1" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-primary">{totalParticipants}</p>
                  )}
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Participants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-cyber">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-6 sm:h-8 w-6 sm:w-8 mb-1" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-accent">{maxChallengesSolved}</p>
                  )}
                  <p className="text-xs sm:text-sm text-muted-foreground">Max Challenges Solved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-cyber">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-6 sm:h-8 w-12 sm:w-16 mb-1" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-primary font-mono">
                      {bestTime ? formatTime(bestTime) : "—"}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-muted-foreground">Best Time ({maxChallengesSolved} solved)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Table */}
        <Card className="card-cyber">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-gradient-cyber text-lg sm:text-xl">Live Rankings</span>
              </div>
              <Badge variant="outline" className="self-start sm:ml-auto text-primary border-primary/50 animate-pulse-cyber text-xs">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <ResponsiveTable
              headers={["Rank", "Participant", "Solved", "Points", "Total Time", "Last Solve"]}
              data={leaderboard.map((participant, index) => {
                const rank = index + 1;
                const rankDisplay = getRankDisplay(rank);
                const lastSolveTime = participant.last_solve_at 
                  ? new Date(participant.last_solve_at).toLocaleString()
                  : "Never";
                
                return {
                  id: participant.user_id,
                  cells: [
                    <div className={`flex items-center justify-center font-bold ${rankDisplay.color}`}>
                      {rank <= 3 ? (
                        <span className="text-xl sm:text-2xl">{rankDisplay.icon}</span>
                      ) : (
                        <span className="text-base sm:text-lg">{rank}</span>
                      )}
                    </div>,
                    <div>
                      <div className="font-medium text-sm sm:text-base">{participant.full_name}</div>
                      <div className="text-xs text-muted-foreground">{participant.email}</div>
                    </div>,
                    <div className="text-center">
                      <Badge 
                        variant="outline" 
                        className="bg-primary/10 text-primary border-primary/30 text-xs"
                      >
                        {participant.challenges_solved}
                      </Badge>
                    </div>,
                    <span className="font-mono font-medium text-sm sm:text-base">
                      {participant.total_points}
                    </span>,
                    <span className="font-mono text-sm sm:text-base">
                      {formatTime(participant.total_time_seconds)}
                    </span>,
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      {lastSolveTime}
                    </span>
                  ],
                  mobileCard: (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`font-bold ${rankDisplay.color}`}>
                            {rank <= 3 ? (
                              <span className="text-2xl">{rankDisplay.icon}</span>
                            ) : (
                              <span className="text-lg">#{rank}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{participant.full_name}</div>
                            <div className="text-xs text-muted-foreground">{participant.email}</div>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="bg-primary/10 text-primary border-primary/30"
                        >
                          {participant.challenges_solved} solved
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Points:</span>
                          <div className="font-mono font-medium">{participant.total_points}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time:</span>
                          <div className="font-mono">{formatTime(participant.total_time_seconds)}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last solve: {lastSolveTime}
                      </div>
                    </div>
                  )
                };
              })}
              loading={loading}
              emptyMessage="No participants yet. Be the first to join the competition!"
            />
          </CardContent>
        </Card>

        {/* Event Status */}
        <Card className="card-cyber mt-6 sm:mt-8">
          <CardContent className="p-4 sm:p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
              {eventStatus === 'live' && (
                <>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded-full animate-pulse-cyber"></div>
                  <span className="text-base sm:text-lg font-medium text-primary">Event Live</span>
                </>
              )}
              {eventStatus === 'paused' && (
                <>
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  <span className="text-base sm:text-lg font-medium text-accent">Event Paused</span>
                </>
              )}
              {eventStatus === 'ended' && (
                <>
                  <StopCircle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <span className="text-base sm:text-lg font-medium text-muted-foreground">Event Ended</span>
                </>
              )}
              {eventStatus === 'not_started' && (
                <>
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  <span className="text-base sm:text-lg font-medium text-accent">Event Not Started</span>
                </>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 px-2">
              {eventStatus === 'live' && 'Competition is currently active. Rankings update in real-time as participants solve challenges.'}
              {eventStatus === 'paused' && 'Competition is temporarily paused. Rankings show current standings.'}
              {eventStatus === 'ended' && 'Competition has ended. These are the final rankings.'}
              {eventStatus === 'not_started' && 'Competition hasn\'t started yet. Check back later!'}
            </p>
            {allowPlayAccess && (
              user || profile ? (
                <Button asChild className="btn-neon text-sm sm:text-base">
                  <Link to="/play">
                    {eventStatus === 'live' ? 'Join the Competition' : 'View Challenges'}
                  </Link>
                </Button>
              ) : (
                <Button 
                  onClick={() => setAuthModalOpen(true)}
                  className="btn-neon text-sm sm:text-base"
                >
                  {eventStatus === 'live' ? 'Join the Competition' : 'View Challenges'}
                </Button>
              )
            )}
          </CardContent>
        </Card>
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
};

export default Leaderboard;