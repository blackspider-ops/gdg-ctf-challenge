import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useChallenges } from "@/hooks/useChallenges";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  User, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  Award, 
  Download, 
  Star, 
  Target, 
  Zap, 
  TrendingUp, 
  Shield,
  Medal,
  Crown,
  Flame,
  Edit3
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

interface Certificate {
  id: number
  type: 'champion' | 'participation'
  status: 'pending' | 'approved' | 'rejected'
  challenges_solved: number
  total_challenges: number
  total_points: number
  total_time_seconds: number
  requested_at: string
  approved_at?: string
  certificate_url?: string
}

const Profile = () => {
  const { user, profile } = useAuth();
  const { progress, challenges, calculatePoints } = useChallenges();
  const { getUserStats, formatTime, getRank } = useLeaderboard();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);

  const userStats = getUserStats(user?.id || '');
  const userRank = getRank(user?.id || '');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.full_name);
    }
  }, [profile]);

  useEffect(() => {
    fetchCertificates();
  }, [user]);

  const fetchCertificates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCertificates((data || []) as Certificate[]);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoadingCerts(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !user) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: displayName.trim() })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const solvedChallenges = progress.filter(p => p.status === 'solved');
  const totalTime = solvedChallenges.reduce((sum, p) => sum + (p.duration_seconds || 0), 0);
  const completionPercentage = challenges.length > 0 ? (solvedChallenges.length / challenges.length) * 100 : 0;
  const averageTime = solvedChallenges.length > 0 ? totalTime / solvedChallenges.length : 0;
  
  // Quirky quotes for pending certificates
  const pendingQuotes = [
    "Something amazing is brewing... 🔮",
    "The magic is in the making! ✨", 
    "Good things come to those who wait... 🎭",
    "Your masterpiece is being crafted! 🎨",
    "The plot thickens... 📚",
    "Patience, young padawan... ⭐",
    "The secret sauce is simmering! 🍯",
    "Your legend is being written... 📜"
  ];
  
  const getRandomQuote = () => pendingQuotes[Math.floor(Math.random() * pendingQuotes.length)];
  
  // Only show approved certificates (hide names for pending ones)  
  const approvedCertificates = certificates.filter(cert => cert.status === 'approved');
  const pendingCertificates = certificates.filter(cert => cert.status === 'pending');
  



  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-primary/20">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent)] bg-[length:20px_20px] animate-pulse"></div>
          <div className="container mx-auto px-4 py-12 relative">
            <div className="flex items-center gap-4 mb-8">
              <Button asChild variant="ghost" size="sm" className="btn-cyber">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <Logo size="sm" />
              </div>
            </div>
            
            {/* Profile Hero */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              <div className="relative">
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-gradient-cyber flex items-center justify-center shadow-neon">
                  <User className="w-12 h-12 lg:w-16 lg:h-16 text-background" />
                </div>
                {userRank <= 3 && userRank > 0 && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Crown className="w-4 h-4 text-background" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-gradient-cyber mb-2 animate-slide-up">
                    {profile?.full_name || 'User'}
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    {profile?.email}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2 text-base">
                    <Shield className="w-4 h-4 mr-2" />
                    {profile?.role === 'owner' ? 'Owner' : profile?.role === 'admin' ? 'Administrator' : 'Member'}
                  </Badge>
                  
                  {userRank > 0 && (
                    <Badge className="bg-gradient-to-r from-accent/20 to-primary/20 text-accent border-accent/30 px-4 py-2 text-base">
                      <Trophy className="w-4 h-4 mr-2" />
                      Rank #{userRank}
                    </Badge>
                  )}
                  
                  {completionPercentage >= 50 && (
                    <Badge className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-400 border-yellow-400/30 px-4 py-2 text-base">
                      <Flame className="w-4 h-4 mr-2" />
                      Top Performer
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:w-48">
                <div className="text-center p-4 rounded-xl bg-card/50 border border-primary/20">
                  <div className="text-2xl font-bold text-primary">{userStats?.challenges_solved || 0}</div>
                  <div className="text-sm text-muted-foreground">Solved</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/50 border border-primary/20">
                  <div className="text-2xl font-bold text-accent">{userStats?.total_points || 0}</div>
                  <div className="text-sm text-muted-foreground">Points</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Progress Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="card-cyber lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-6 h-6 text-primary" />
                    Activity Progress
                  </CardTitle>
                  <CardDescription>Your journey and accomplishments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Overall Completion</span>
                      <span className="text-sm text-primary font-bold">{Math.round(completionPercentage)}%</span>
                    </div>
                    <Progress value={completionPercentage} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <Zap className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-xl font-bold text-primary">{userStats?.challenges_solved || 0}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <Star className="w-6 h-6 text-accent mx-auto mb-2" />
                      <div className="text-xl font-bold text-accent">{userStats?.total_points || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Points</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-muted/50 border border-muted">
                      <Clock className="w-6 h-6 text-foreground mx-auto mb-2" />
                      <div className="text-xl font-bold">{formatTime(Math.round(averageTime))}</div>
                      <div className="text-xs text-muted-foreground">Avg. Time</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                      <TrendingUp className="w-6 h-6 text-gradient-cyber mx-auto mb-2" />
                      <div className="text-xl font-bold text-gradient-cyber">
                        {userRank > 0 ? `#${userRank}` : '--'}
                      </div>
                      <div className="text-xs text-muted-foreground">Current Rank</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-cyber">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="w-6 h-6 text-primary" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      solvedChallenges.length >= 1 
                        ? 'bg-primary/10 border-primary/30 shadow-neon' 
                        : 'bg-muted/20 border-muted'
                    }`}>
                      <CheckCircle2 className={`w-5 h-5 ${
                        solvedChallenges.length >= 1 ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">Getting Started</div>
                        <div className="text-xs text-muted-foreground">Complete your first activity</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      completionPercentage >= 25 
                        ? 'bg-primary/10 border-primary/30 shadow-neon' 
                        : 'bg-muted/20 border-muted'
                    }`}>
                      <Shield className={`w-5 h-5 ${
                        completionPercentage >= 25 ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">Rising Star</div>
                        <div className="text-xs text-muted-foreground">Complete 25% of activities</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      completionPercentage >= 50 
                        ? 'bg-accent/10 border-accent/30 shadow-cyber' 
                        : 'bg-muted/20 border-muted'
                    }`}>
                      <Flame className={`w-5 h-5 ${
                        completionPercentage >= 50 ? 'text-accent' : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">Top Performer</div>
                        <div className="text-xs text-muted-foreground">Complete 50% of activities</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      completionPercentage >= 100 
                        ? 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border-yellow-400/30' 
                        : 'bg-muted/20 border-muted'
                    }`}>
                      <Crown className={`w-5 h-5 ${
                        completionPercentage >= 100 ? 'text-yellow-400' : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">Champion</div>
                        <div className="text-xs text-muted-foreground">Complete all activities</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Activity Progress */}
            <Card className="card-cyber">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-primary" />
                  Activity Details
                </CardTitle>
                <CardDescription>Your performance breakdown on each activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {challenges.map((challenge) => {
                    const challengeProgress = progress.find(p => p.challenge_id === challenge.id);
                    const isSolved = challengeProgress?.status === 'solved';
                    const earnedPoints = isSolved ? calculatePoints(challenge, challengeProgress) : 0;
                    
                    return (
                      <div key={challenge.id} 
                           className={`group relative p-6 rounded-xl border transition-all duration-300 ${
                             isSolved 
                               ? 'bg-primary/5 border-primary/30 hover:shadow-neon' 
                               : 'bg-card/30 border-border hover:border-primary/20'
                           }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`relative flex items-center justify-center w-12 h-12 rounded-lg ${
                              isSolved ? 'bg-primary/20' : 'bg-muted/50'
                            }`}>
                              {isSolved ? (
                                <CheckCircle2 className="w-6 h-6 text-primary" />
                              ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/50 flex items-center justify-center">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {challenge.order_index}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                                {challenge.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                                <span>Activity #{challenge.order_index}</span>
                                <span>•</span>
                                <span>{challenge.points} points max</span>
                                {isSolved && (
                                  <>
                                    <span>•</span>
                                    <span className="text-primary font-medium">{earnedPoints} earned</span>
                                  </>
                                )}
                              </div>
                              
                              {isSolved && (
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatTime(challengeProgress?.duration_seconds || 0)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
                                    <span>{challengeProgress?.attempts || 0} attempts</span>
                                  </div>
                                  {(challengeProgress?.incorrect_attempts || 0) > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 rounded-md text-destructive">
                                      <span>-{challengeProgress?.incorrect_attempts} penalty</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {isSolved ? (
                              <Badge className="bg-primary/20 text-primary border-primary/30">
                                Solved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recognition & Achievements */}
            <Card className="card-cyber">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-primary" />
                  Recognition & Achievements
                </CardTitle>
                <CardDescription>
                  Your earned recognition and accomplishments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCerts ? (
                  <div className="text-center py-8">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    <p className="mt-4 text-muted-foreground">Loading achievements...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Approved Certificates */}
                    {approvedCertificates.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          Approved Recognition
                        </h3>
                        {approvedCertificates.map((cert) => (
                          <div key={cert.id} className="group relative p-6 rounded-xl border border-primary/30 bg-primary/5 hover:shadow-neon transition-all duration-300">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4 flex-1">
                                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30">
                                  {cert.type === 'champion' ? (
                                    <Crown className="w-8 h-8 text-primary" />
                                  ) : (
                                    <Medal className="w-8 h-8 text-accent" />
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <h3 className="font-bold text-xl mb-2 text-gradient-cyber capitalize">
                                    {cert.type} Recognition
                                  </h3>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Activities:</span>
                                      <div className="font-semibold text-primary">{cert.challenges_solved}/{cert.total_challenges}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Points:</span>
                                      <div className="font-semibold text-accent">{cert.total_points}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Time:</span>
                                      <div className="font-semibold">{formatTime(cert.total_time_seconds)}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Approved:</span>
                                      <div className="font-semibold text-primary">
                                        {new Date(cert.approved_at!).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <Button
                                size="sm"
                                className="btn-neon"
                                onClick={() => window.open(cert.certificate_url, '_blank')}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Pending Certificates - Show quirky quotes only */}
                    {pendingCertificates.length > 0 && (
                      <div className="space-y-4">
                        {pendingCertificates.map((cert) => (
                          <div key={cert.id} className="p-6 rounded-xl border border-accent/30 bg-accent/5 hover:shadow-cyber transition-all duration-300">
                            <div className="text-center py-8">
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mx-auto mb-4 border border-accent/30">
                                <Clock className="w-8 h-8 text-accent animate-pulse" />
                              </div>
                              <p className="text-lg font-medium text-accent mb-2">{getRandomQuote()}</p>
                              <p className="text-sm text-muted-foreground">Something special is being prepared for you</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* No certificates state */}
                    {certificates.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted/20 to-accent/10 flex items-center justify-center mx-auto mb-4 border border-muted">
                          <Award className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-medium mb-2">No recognition yet</p>
                        <p className="text-muted-foreground">Complete activities to earn recognition!</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settings Section */}
            <Card className="card-cyber">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-6 h-6 text-primary" />
                  Profile Settings
                </CardTitle>
                <CardDescription>Customize your profile and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="bg-card/50 border-primary/20 focus:border-primary"
                      />
                      <p className="text-xs text-muted-foreground">This is how others will see your name on the leaderboard</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email Address</Label>
                      <Input
                        value={profile?.email || ''}
                        disabled
                        className="bg-muted/20 text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4">
                    <Button 
                      type="submit" 
                      disabled={updating || !displayName.trim() || displayName === profile?.full_name}
                      className="btn-neon"
                    >
                      {updating ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
                          Updating...
                        </div>
                      ) : (
                        'Update Profile'
                      )}
                    </Button>
                    
                    {displayName !== profile?.full_name && displayName.trim() && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setDisplayName(profile?.full_name || '')}
                        className="border-primary/30"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Profile;