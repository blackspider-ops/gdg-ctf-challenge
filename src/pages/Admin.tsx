import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Settings, Users, Trophy, Play, Pause, RotateCcw, Edit, Trash2, Plus, Award, StopCircle, Upload, UserX, Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEventInfo } from "@/hooks/useEventInfo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useFallbackAuth } from "@/hooks/useFallbackAuth";
import { useEmergencyAdmin } from "@/hooks/useEmergencyAdmin";

interface Challenge {
  id: number
  title: string
  prompt_md: string
  hint_md?: string
  answer_pattern: string
  is_regex: boolean
  points: number
  is_active: boolean
  order_index: number
}

interface UserSummary {
  user_id: string
  full_name: string
  email: string
  role: 'player' | 'admin' | 'owner'
  challenges_solved: number
  total_points: number
  total_time_seconds: number
  current_challenge_index: number
}

interface EventSetting {
  key: string
  value: string
  description?: string
}

interface Certificate {
  id: number
  user_id: string
  type: 'champion' | 'participation' | 'special'
  title: string
  description?: string
  certificate_url?: string
  status: 'pending' | 'approved' | 'rejected'
  challenges_solved: number
  total_challenges: number
  total_points: number
  total_time_seconds: number
  requested_at: string
  approved_at?: string
  user?: {
    full_name: string
    email: string
  }
}

const Admin = () => {
  const { profile, isOwner, signOut } = useAuth();
  const [eventStatus, setEventStatus] = useState<"not_started" | "live" | "paused" | "ended">("live");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const { fallbackSettings, toggleFallbackAuth } = useFallbackAuth();
  const { EMERGENCY_ADMIN_CODE } = useEmergencyAdmin();
  const [eventSettings, setEventSettings] = useState<EventSetting[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const [certificateForm, setCertificateForm] = useState({
    userId: '',
    type: '',
    title: '',
    description: '',
    file: null as File | null
  });
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [approvingCertificate, setApprovingCertificate] = useState<number | null>(null);
  const [approvalFile, setApprovalFile] = useState<File | null>(null);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeChallenges: 0,
    completedParticipants: 0,
    bestTime: "—"
  });

  const { toast } = useToast();
  const { title } = useEventInfo();

  const calculateStats = (userData: UserSummary[], challengeData: Challenge[]) => {
    const totalParticipants = userData.length;
    const activeChallenges = challengeData?.filter(c => c.is_active).length || 0;
    const totalChallenges = challengeData?.filter(c => c.is_active).length || 1;
    const completedParticipants = userData.filter(u => u.challenges_solved === totalChallenges).length;
    const bestTimeUser = userData.find(u => u.challenges_solved === Math.max(...userData.map(u => u.challenges_solved)));
    const bestTime = bestTimeUser ? formatTime(bestTimeUser.total_time_seconds) : "—";

    setStats({
      totalParticipants,
      activeChallenges,
      completedParticipants,
      bestTime
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .order('order_index');

      if (challengesError) throw challengesError;
      setChallenges(challengesData || []);

      // Fetch user summaries and profiles separately

      const { data: usersData, error: usersError } = await supabase
        .from('user_summary')
        .select('*')
        .order('total_points', { ascending: false });

      if (usersError) {
        console.error('Error fetching user summary:', usersError);
        setUsers([]);
        calculateStats([], challengesData || []);
      } else if (usersData && usersData.length > 0) {
        // Get all profiles
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, role');

        const profilesMap = {};
        (allProfiles || []).forEach(p => {
          profilesMap[p.user_id] = p;
        });

        const transformedUsers = usersData.map(user => ({
          user_id: user.user_id,
          full_name: profilesMap[user.user_id]?.full_name || `User ${user.user_id.substring(0, 8)}`,
          email: profilesMap[user.user_id]?.email || 'No email',
          role: profilesMap[user.user_id]?.role || 'player',
          challenges_solved: user.challenges_solved || 0,
          total_points: user.total_points || 0,
          total_time_seconds: user.total_time_seconds || 0,
          current_challenge_index: user.current_challenge_index || 1
        }));

        setUsers(transformedUsers);
        calculateStats(transformedUsers, challengesData || []);
      } else {
        // No user_summary data, create from profiles with challenge progress
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, role');

        if (allProfiles && allProfiles.length > 0) {
          const usersWithProgress = await Promise.all(
            allProfiles.map(async (profile) => {
              const { data: progressData } = await supabase
                .from('challenge_progress')
                .select('status, duration_seconds')
                .eq('user_id', profile.user_id);

              const solvedCount = progressData?.filter(p => p.status === 'solved').length || 0;
              const totalTime = progressData?.reduce((sum, p) => sum + (p.duration_seconds || 0), 0) || 0;

              return {
                user_id: profile.user_id,
                full_name: profile.full_name,
                email: profile.email,
                role: profile.role || 'player',
                challenges_solved: solvedCount,
                total_points: solvedCount * 100, // Rough estimate
                total_time_seconds: totalTime,
                current_challenge_index: solvedCount + 1
              };
            })
          );

          setUsers(usersWithProgress);
          calculateStats(usersWithProgress, challengesData || []);
        } else {
          setUsers([]);
          calculateStats([], challengesData || []);
        }
      }

      // Fetch event settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('event_settings')
        .select('*');

      if (settingsError) {
        console.error('Error fetching event settings:', settingsError);
        setEventSettings([]);
      } else {
        setEventSettings(settingsData || []);
      }

      // Fetch certificates
      const { data: certificatesData, error: certsError } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (certsError) {
        console.error('Error fetching certificates:', certsError);
        setCertificates([]);
      } else {
        if (certificatesData && certificatesData.length > 0) {
          // Get user details for each certificate
          const certificatesWithUsers = await Promise.all(
            certificatesData.map(async (cert) => {
              // Try both id and user_id columns to find the user
              let userProfile = null;
              let userError = null;

              // First try by id
              const { data: profileById, error: errorById } = await supabase
                .from('profiles')
                .select('id, user_id, full_name, email')
                .eq('id', cert.user_id)
                .maybeSingle();

              if (profileById) {
                userProfile = profileById;
              } else {
                // Try by user_id if id lookup failed
                const { data: profileByUserId, error: errorByUserId } = await supabase
                  .from('profiles')
                  .select('id, user_id, full_name, email')
                  .eq('user_id', cert.user_id)
                  .maybeSingle();

                userProfile = profileByUserId;
                userError = errorByUserId;
              }



              if (userError) {
                console.error('Error fetching user for certificate:', cert.id, userError);
              }

              return {
                ...cert,
                title: (cert as any).title || 'Certificate', // Provide default title if missing
                type: cert.type as 'champion' | 'participation' | 'special', // Cast type to proper union
                status: cert.status as 'pending' | 'approved' | 'rejected', // Cast status to proper union
                user: userProfile || { full_name: 'Unknown User', email: 'unknown@email.com' }
              };
            })
          );
          setCertificates(certificatesWithUsers);
        } else {
          setCertificates([]);
        }
      }

      // Get current event status from settings (only if not already set)
      const statusSetting = settingsData?.find(s => s.key === 'event_status');
      if (statusSetting && statusSetting.value !== eventStatus) {
        setEventStatus(statusSetting.value as any);
      }

      // Initialize editing settings
      const settingsObj = {};
      settingsData?.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      setEditingSettings(settingsObj);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: `Failed to load admin data: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (newStatus: typeof eventStatus) => {
    try {
      // Update the event status
      const { error: statusError } = await supabase
        .from('event_settings')
        .upsert({
          key: 'event_status',
          value: newStatus,
          description: 'Current status of the competition event'
        });

      if (statusError) throw statusError;

      // Also update pause_timers based on the event status
      const shouldPauseTimers = newStatus === 'paused' || newStatus === 'ended';
      const { error: pauseError } = await supabase
        .from('event_settings')
        .upsert({
          key: 'pause_timers',
          value: shouldPauseTimers.toString(),
          description: 'Whether challenge timers should be paused'
        });

      if (pauseError) throw pauseError;

      // Update local state
      setEventStatus(newStatus);

      // Update editing settings to reflect only the status change
      setEditingSettings(prev => ({
        ...prev,
        event_status: newStatus
      }));

      // Refresh data
      await fetchData();

      toast({
        title: "Success",
        description: `Event status updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: "Error",
        description: `Failed to update event status: ${error.message || error}`,
        variant: "destructive"
      });
    }
  };

  const resetUserProgress = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reset all progress for ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Use the database function we created
      const { data, error } = await (supabase.rpc as any)('reset_user_progress', {
        target_user_id: userId
      });

      if (error) {
        console.error('Database function error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Progress reset for ${userName}. ${(data as any)?.message || 'Reset completed'} (${(data as any)?.deleted_records || 0} records deleted)`,
      });

      // Refresh the data to show updated state
      await fetchData();
    } catch (error) {
      console.error('Error resetting user progress:', error);
      toast({
        title: "Error",
        description: `Failed to reset progress for ${userName}: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string, userName: string, userEmail: string, userRole: 'player' | 'admin' | 'owner') => {
    // Prevent non-owners from deleting the owner
    if (userRole === 'owner' && !isOwner) {
      toast({
        title: "Permission Denied",
        description: "Only the owner can delete the owner account.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`⚠️ DANGER: Are you sure you want to PERMANENTLY DELETE ${userName} (${userEmail})?\n\nThis will delete:\n- User account\n- All challenge progress\n- All certificates\n- All associated data\n\nThis action CANNOT be undone!`)) {
      return;
    }

    if (!confirm(`This is your final warning. Type "${userName}" to confirm deletion:`)) {
      return;
    }

    try {
      // First delete user data from our tables
      const { data, error } = await (supabase as any).rpc('delete_user_completely', {
        target_user_id: userId
      });

      if (error) {
        console.error('Database function error:', error);
        throw error;
      }

      // Handle the new response format
      if (data && !data.success) {
        throw new Error(data.message || data.error || 'Unknown error');
      }

      // Then delete from auth system using admin API
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) {
          console.warn('Could not delete from auth system:', authError.message);
          // Don't throw here - the user data is already deleted
        }
      } catch (authError) {
        console.warn('Auth deletion failed:', authError);
        // Continue anyway - user data is deleted
      }

      toast({
        title: "User Deleted",
        description: `${userName} and all associated data have been permanently deleted.`,
      });

      // Refresh the data to show updated state
      await fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: `Failed to delete user ${userName}: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const resetAllProgress = async () => {
    if (!confirm('Are you sure you want to reset ALL user progress? This will delete all challenge progress for ALL participants. This action cannot be undone.')) {
      return;
    }

    if (!confirm('This is your final warning. Are you absolutely sure you want to reset EVERYONE\'s progress?')) {
      return;
    }

    try {
      // Use database function to reset all progress
      const { data, error } = await (supabase.rpc as any)('reset_all_progress');

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `All user progress has been reset. Deleted ${(data as any)?.deleted_records || 0} records.`,
      });

      // Refresh the data to show updated state
      await fetchData();
    } catch (error) {
      console.error('Error resetting all progress:', error);
      toast({
        title: "Error",
        description: `Failed to reset all progress: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const saveChallenge = async (challenge: Partial<Challenge>) => {
    try {
      if (challenge.id) {
        // Update existing challenge
        const { error } = await supabase
          .from('challenges')
          .update({
            title: challenge.title,
            prompt_md: challenge.prompt_md,
            hint_md: challenge.hint_md,
            answer_pattern: challenge.answer_pattern,
            is_regex: challenge.is_regex,
            points: challenge.points,
            is_active: challenge.is_active,
            order_index: challenge.order_index
          })
          .eq('id', challenge.id);

        if (error) throw error;
      } else {
        // Create new challenge
        const { error } = await supabase
          .from('challenges')
          .insert([{
            title: challenge.title,
            prompt_md: challenge.prompt_md,
            hint_md: challenge.hint_md,
            answer_pattern: challenge.answer_pattern,
            is_regex: challenge.is_regex || false,
            points: challenge.points || 100,
            is_active: challenge.is_active !== false,
            order_index: challenge.order_index || (challenges.length + 1)
          }]);

        if (error) throw error;
      }

      setEditingChallenge(null);
      await fetchData();

      toast({
        title: "Success",
        description: challenge.id ? "Challenge updated successfully" : "Challenge created successfully",
      });
    } catch (error) {
      console.error('Error saving challenge:', error);
      toast({
        title: "Error",
        description: "Failed to save challenge",
        variant: "destructive"
      });
    }
  };

  const deleteChallenge = async (challengeId: number) => {
    if (!confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);

      if (error) throw error;

      await fetchData();

      toast({
        title: "Success",
        description: "Challenge deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast({
        title: "Error",
        description: "Failed to delete challenge",
        variant: "destructive"
      });
    }
  };

  const uploadCertificatePDF = async (file: File, certificateId: number): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `certificate_${certificateId}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('certificates')
        .upload(fileName, file);

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast({
        title: "Upload Error",
        description: `Failed to upload PDF: ${error.message}`,
        variant: "destructive"
      });
      return null;
    }
  };

  const issueCertificate = async () => {
    if (!certificateForm.userId || !certificateForm.type || !certificateForm.title) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingCertificate(true);
      const user = users.find(u => u.user_id === certificateForm.userId);
      if (!user) throw new Error('User not found');

      // Check if user already has this type of certificate
      const { data: existingCerts } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', certificateForm.userId)
        .eq('type', certificateForm.type);

      if (existingCerts && existingCerts.length > 0) {
        toast({
          title: "Error",
          description: `User already has a ${certificateForm.type} certificate`,
          variant: "destructive"
        });
        return;
      }

      // Insert certificate record first
      const { data: certificateData, error: insertError } = await supabase
        .from('certificates')
        .insert([{
          user_id: certificateForm.userId,
          type: certificateForm.type as 'champion' | 'participation' | 'special',
          title: certificateForm.title,
          description: certificateForm.description || null,
          status: 'approved',
          challenges_solved: user.challenges_solved || 0,
          total_challenges: challenges.filter(c => c.is_active).length,
          total_points: user.total_points || 0,
          total_time_seconds: user.total_time_seconds || 0,
          approved_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      let certificateUrl = null;

      // Upload PDF if provided
      if (certificateForm.file) {
        certificateUrl = await uploadCertificatePDF(certificateForm.file, certificateData.id);

        if (certificateUrl) {
          // Update certificate with file URL
          const { error: updateError } = await supabase
            .from('certificates')
            .update({ certificate_url: certificateUrl } as any)
            .eq('id', certificateData.id);

          if (updateError) throw updateError;
        }
      }

      // Reset form
      setCertificateForm({
        userId: '',
        type: '',
        title: '',
        description: '',
        file: null
      });

      await fetchData();

      toast({
        title: "Success",
        description: `Certificate issued to ${user.full_name}${certificateUrl ? ' with PDF' : ''}`,
      });
    } catch (error) {
      console.error('Error issuing certificate:', error);
      toast({
        title: "Error",
        description: "Failed to issue certificate",
        variant: "destructive"
      });
    } finally {
      setUploadingCertificate(false);
    }
  };

  const deleteCertificate = async (certificateId: number) => {
    try {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certificateId);

      if (error) throw error;

      await fetchData();

      toast({
        title: "Success",
        description: "Certificate deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting certificate:', error);
      toast({
        title: "Error",
        description: "Failed to delete certificate",
        variant: "destructive"
      });
    }
  };

  const updateCertificateStatus = async (certificateId: number, status: 'approved' | 'rejected', certificateUrl?: string) => {
    try {
      const updateData: any = {
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null
      };

      if (certificateUrl) {
        updateData.certificate_url = certificateUrl;
      }

      const { error } = await supabase
        .from('certificates')
        .update(updateData as any)
        .eq('id', certificateId);

      if (error) throw error;

      await fetchData();

      toast({
        title: "Success",
        description: `Certificate ${status}`,
      });
    } catch (error) {
      console.error('Error updating certificate:', error);
      toast({
        title: "Error",
        description: "Failed to update certificate",
        variant: "destructive"
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: 'player' | 'admin' | 'owner', userName: string) => {
    try {
      // Additional check for owner role changes
      if (newRole === 'owner' && !isOwner) {
        toast({
          title: "Error",
          description: "Only the current owner can transfer ownership",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await (supabase as any).rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) throw error;

      // Check if the function returned an error
      if (data && !(data as any).success) {
        throw new Error((data as any).error || 'Unknown error');
      }

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.user_id === userId ? { ...user, role: newRole } : user
        )
      );

      toast({
        title: "Success",
        description: `${userName}'s role updated to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const setInitialOwner = async (email: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('set_owner_by_email', {
        owner_email: email
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data || "Owner set successfully",
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error setting owner:', error);
      toast({
        title: "Error",
        description: "Failed to set owner",
        variant: "destructive"
      });
    }
  };

  const saveEventSettings = async () => {
    try {
      const updates = Object.entries(editingSettings).map(([key, value]) => ({
        key,
        value,
        description: eventSettings.find(s => s.key === key)?.description || ''
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('event_settings')
          .upsert(update);
        if (error) throw error;
      }

      await fetchData();

      toast({
        title: "Success",
        description: "Event settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live": return "text-primary";
      case "paused": return "text-accent";
      case "ended": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "live": return <Play className="w-4 h-4" />;
      case "paused": return <Pause className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
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
                <h1 className="text-2xl font-bold text-gradient-cyber">Admin Panel</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Welcome, <span className="text-primary">{profile?.full_name}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="btn-cyber"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="card-cyber">
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <h1 className="text-2xl font-bold text-gradient-cyber">Admin Panel</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${getStatusColor(eventStatus)}`}>
              {getStatusIcon(eventStatus)}
              <span className="font-medium capitalize">{eventStatus.replace('_', ' ')}</span>
            </div>
            
            <span className="text-sm text-muted-foreground hidden sm:block">
              Welcome, <span className="text-primary">{profile?.full_name}</span>
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="btn-cyber"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card/50 border border-primary/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Event Status Card */}
            <Card className="card-cyber">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Event Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 ${getStatusColor(eventStatus)}`}>
                    {getStatusIcon(eventStatus)}
                    <span className="text-lg font-medium capitalize">
                      {eventStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className={eventStatus === "live" ? "btn-neon" : "btn-cyber"}
                      variant={eventStatus === "live" ? "default" : "outline"}
                      onClick={() => updateEventStatus("live")}
                    >
                      Start Event
                    </Button>
                    <Button
                      size="sm"
                      className={eventStatus === "paused" ? "btn-neon" : "btn-cyber"}
                      variant={eventStatus === "paused" ? "default" : "outline"}
                      onClick={() => updateEventStatus("paused")}
                    >
                      Pause Event
                    </Button>
                    <Button
                      size="sm"
                      className={eventStatus === "ended" ? "btn-neon" : "btn-cyber"}
                      variant={eventStatus === "ended" ? "default" : "outline"}
                      onClick={() => updateEventStatus("ended")}
                    >
                      End Event
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="card-cyber">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-primary">{stats.totalParticipants}</div>
                  <div className="text-sm text-muted-foreground">Total Participants</div>
                </CardContent>
              </Card>
              <Card className="card-cyber">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-accent">{stats.activeChallenges}</div>
                  <div className="text-sm text-muted-foreground">Active Challenges</div>
                </CardContent>
              </Card>
              <Card className="card-cyber">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-primary">{stats.completedParticipants}</div>
                  <div className="text-sm text-muted-foreground">Completed Participants</div>
                </CardContent>
              </Card>
              <Card className="card-cyber">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-accent font-mono">{stats.bestTime}</div>
                  <div className="text-sm text-muted-foreground">Best Time</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gradient-cyber">Challenge Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="btn-neon" onClick={() => setEditingChallenge({} as Challenge)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Challenge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingChallenge?.id ? 'Edit Challenge' : 'Create New Challenge'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure the challenge details, prompt, and answer pattern.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={editingChallenge?.title || ''}
                          onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, title: e.target.value } : null)}
                          placeholder="Challenge title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="points">Points</Label>
                        <Input
                          id="points"
                          type="number"
                          value={editingChallenge?.points || 100}
                          onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, points: parseInt(e.target.value) } : null)}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="order">Order Index</Label>
                        <Input
                          id="order"
                          type="number"
                          value={editingChallenge?.order_index || (challenges.length + 1)}
                          onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, order_index: parseInt(e.target.value) } : null)}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="active">Status</Label>
                        <Select
                          value={editingChallenge?.is_active ? 'active' : 'inactive'}
                          onValueChange={(value) => setEditingChallenge(prev => prev ? { ...prev, is_active: value === 'active' } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prompt">Prompt (Markdown)</Label>
                      <Textarea
                        id="prompt"
                        value={editingChallenge?.prompt_md || ''}
                        onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, prompt_md: e.target.value } : null)}
                        placeholder="Challenge description in markdown..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hint">Hint (Markdown, Optional)</Label>
                      <Textarea
                        id="hint"
                        value={editingChallenge?.hint_md || ''}
                        onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, hint_md: e.target.value } : null)}
                        placeholder="Hint text in markdown..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="answer">Answer Pattern</Label>
                      <Input
                        id="answer"
                        value={editingChallenge?.answer_pattern || ''}
                        onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, answer_pattern: e.target.value } : null)}
                        placeholder="Expected answer or regex pattern"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="regex"
                        checked={editingChallenge?.is_regex || false}
                        onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, is_regex: e.target.checked } : null)}
                        className="rounded border-primary/30"
                      />
                      <Label htmlFor="regex">Use regex pattern matching</Label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingChallenge(null)}>
                      Cancel
                    </Button>
                    <Button
                      className="btn-neon"
                      onClick={() => editingChallenge && saveChallenge(editingChallenge)}
                      disabled={!editingChallenge?.title || !editingChallenge?.prompt_md || !editingChallenge?.answer_pattern}
                    >
                      {editingChallenge?.id ? 'Update' : 'Create'} Challenge
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="card-cyber">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-primary/20">
                      <TableHead>Order</TableHead>
                      <TableHead>Challenge</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challenges.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No challenges configured yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      challenges.map((challenge) => (
                        <TableRow key={challenge.id} className="border-primary/10">
                          <TableCell>
                            <Badge variant="outline" className="text-accent border-accent/30">
                              #{challenge.order_index}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{challenge.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {challenge.prompt_md?.substring(0, 100)}...
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-primary border-primary/30">
                              {challenge.points}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={challenge.is_active ? "default" : "secondary"}
                              className={challenge.is_active ? "bg-primary/20 text-primary" : ""}
                            >
                              {challenge.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="btn-cyber"
                                    onClick={() => setEditingChallenge(challenge)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Edit Challenge</DialogTitle>
                                    <DialogDescription>
                                      Update the challenge details, prompt, and answer pattern.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="space-y-4 max-h-96 overflow-y-auto">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-title">Title</Label>
                                        <Input
                                          id="edit-title"
                                          value={editingChallenge?.title || ''}
                                          onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, title: e.target.value } : null)}
                                          placeholder="Challenge title"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-points">Points</Label>
                                        <Input
                                          id="edit-points"
                                          type="number"
                                          value={editingChallenge?.points || 100}
                                          onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, points: parseInt(e.target.value) } : null)}
                                          placeholder="100"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-order">Order Index</Label>
                                        <Input
                                          id="edit-order"
                                          type="number"
                                          value={editingChallenge?.order_index || 1}
                                          onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, order_index: parseInt(e.target.value) } : null)}
                                          placeholder="1"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-active">Status</Label>
                                        <Select
                                          value={editingChallenge?.is_active ? 'active' : 'inactive'}
                                          onValueChange={(value) => setEditingChallenge(prev => prev ? { ...prev, is_active: value === 'active' } : null)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="edit-prompt">Prompt (Markdown)</Label>
                                      <Textarea
                                        id="edit-prompt"
                                        value={editingChallenge?.prompt_md || ''}
                                        onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, prompt_md: e.target.value } : null)}
                                        placeholder="Challenge description in markdown..."
                                        rows={4}
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="edit-hint">Hint (Markdown, Optional)</Label>
                                      <Textarea
                                        id="edit-hint"
                                        value={editingChallenge?.hint_md || ''}
                                        onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, hint_md: e.target.value } : null)}
                                        placeholder="Hint text in markdown..."
                                        rows={3}
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="edit-answer">Answer Pattern</Label>
                                      <Input
                                        id="edit-answer"
                                        value={editingChallenge?.answer_pattern || ''}
                                        onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, answer_pattern: e.target.value } : null)}
                                        placeholder="Expected answer or regex pattern"
                                      />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="edit-regex"
                                        checked={editingChallenge?.is_regex || false}
                                        onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, is_regex: e.target.checked } : null)}
                                        className="rounded border-primary/30"
                                      />
                                      <Label htmlFor="edit-regex">Use regex pattern matching</Label>
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditingChallenge(null)}>
                                      Cancel
                                    </Button>
                                    <Button
                                      className="btn-neon"
                                      onClick={() => editingChallenge && saveChallenge(editingChallenge)}
                                      disabled={!editingChallenge?.title || !editingChallenge?.prompt_md || !editingChallenge?.answer_pattern}
                                    >
                                      Update Challenge
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Button
                                size="sm"
                                variant="outline"
                                className="btn-cyber text-red-400 border-red-400/30 hover:bg-red-400/10"
                                onClick={() => deleteChallenge(challenge.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gradient-cyber">User Management</h2>
              <div className="flex gap-2">
                {!users.some(user => user.role === 'owner') && (
                  <Button
                    variant="outline"
                    className="btn-cyber text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
                    onClick={() => setInitialOwner('tms7397@psu.edu')}
                  >
                    Set tms7397 as Owner
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="btn-cyber text-red-400 border-red-400/30 hover:bg-red-400/10"
                  onClick={resetAllProgress}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All Progress
                </Button>
              </div>
            </div>

            <Card className="card-cyber">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-primary/20">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Current Challenge</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Total Time</TableHead>
                      <TableHead>Solved</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No participants yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.user_id} className="border-primary/10">
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(newRole: 'player' | 'admin' | 'owner') => updateUserRole(user.user_id, newRole, user.full_name)}
                              disabled={user.role === 'owner' && !isOwner}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="player">Player</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                {isOwner && (
                                  <SelectItem value="owner">Owner</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-accent border-accent/30">
                              {user.current_challenge_index === -1 ? 'Completed' : `Challenge ${user.current_challenge_index}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{user.total_points}</TableCell>
                          <TableCell className="font-mono">{formatTime(user.total_time_seconds)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-primary border-primary/30">
                              {user.challenges_solved}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="btn-cyber text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
                                onClick={() => resetUserProgress(user.user_id, user.full_name)}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="btn-cyber text-red-500 border-red-500/30 hover:bg-red-500/10"
                                onClick={() => deleteUser(user.user_id, user.full_name, user.email, user.role)}
                                disabled={user.role === 'owner' && !isOwner}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gradient-cyber">Certificate Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="btn-neon">
                    <Award className="w-4 h-4 mr-2" />
                    Issue Certificate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Issue New Certificate</DialogTitle>
                    <DialogDescription>
                      Issue a certificate to a user for their achievements.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cert-user">Select User</Label>
                      <Select
                        value={certificateForm.userId}
                        onValueChange={(value) => setCertificateForm(prev => ({ ...prev, userId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.full_name} ({user.challenges_solved} solved)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cert-type">Certificate Type</Label>
                      <Select
                        value={certificateForm.type}
                        onValueChange={(value) => setCertificateForm(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="champion">Champion</SelectItem>
                          <SelectItem value="participation">Participation</SelectItem>
                          <SelectItem value="special">Special Recognition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cert-title">Certificate Title</Label>
                      <Input
                        id="cert-title"
                        value={certificateForm.title}
                        onChange={(e) => setCertificateForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={`e.g., Champion of ${title.split(' — ')[0] || title} 2025`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cert-desc">Description (Optional)</Label>
                      <Textarea
                        id="cert-desc"
                        value={certificateForm.description}
                        onChange={(e) => setCertificateForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Additional description or achievements..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cert-file">Upload Certificate PDF (Optional)</Label>
                      <Input
                        id="cert-file"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setCertificateForm(prev => ({ ...prev, file }));
                        }}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload a PDF certificate that users can download from their profile
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCertificateForm({ userId: '', type: '', title: '', description: '', file: null })}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="btn-neon"
                      onClick={issueCertificate}
                      disabled={uploadingCertificate || !certificateForm.userId || !certificateForm.type || !certificateForm.title}
                    >
                      {uploadingCertificate ? 'Uploading...' : 'Issue Certificate'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="card-cyber">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-primary/20">
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No certificates issued yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      certificates.map((certificate) => (
                        <TableRow key={certificate.id} className="border-primary/10">
                          <TableCell>
                            <div className="font-medium">{certificate.user?.full_name}</div>
                            <div className="text-sm text-muted-foreground">{certificate.user?.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                certificate.type === 'champion' ? 'text-yellow-400 border-yellow-400/30' :
                                  certificate.type === 'participation' ? 'text-blue-400 border-blue-400/30' :
                                    'text-purple-400 border-purple-400/30'
                              }
                            >
                              {certificate.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{certificate.title}</div>
                            {certificate.description && (
                              <div className="text-sm text-muted-foreground">{certificate.description}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={certificate.status === 'approved' ? "default" : certificate.status === 'pending' ? "secondary" : "destructive"}
                              className={
                                certificate.status === 'approved' ? "bg-primary/20 text-primary" :
                                  certificate.status === 'pending' ? "bg-yellow-400/20 text-yellow-400" :
                                    "bg-red-400/20 text-red-400"
                              }
                            >
                              {certificate.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{certificate.challenges_solved}/{certificate.total_challenges} solved</div>
                              <div className="text-muted-foreground">{certificate.total_points} pts • {formatTime(certificate.total_time_seconds)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {certificate.status === 'pending' && (
                                <>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="btn-neon"
                                        onClick={() => setApprovingCertificate(certificate.id)}
                                      >
                                        Approve
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Approve Certificate</DialogTitle>
                                        <DialogDescription>
                                          Optionally upload a PDF certificate for the user to download.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="approval-pdf">Upload Certificate PDF (Optional)</Label>
                                          <Input
                                            id="approval-pdf"
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setApprovalFile(e.target.files?.[0] || null)}
                                            className="mt-2"
                                          />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => {
                                          setApprovingCertificate(null);
                                          setApprovalFile(null);
                                        }}>
                                          Cancel
                                        </Button>
                                        <Button
                                          className="btn-neon"
                                          onClick={async () => {
                                            let certificateUrl = null;
                                            if (approvalFile) {
                                              certificateUrl = await uploadCertificatePDF(approvalFile, certificate.id);
                                            }
                                            await updateCertificateStatus(certificate.id, 'approved', certificateUrl);
                                            setApprovingCertificate(null);
                                            setApprovalFile(null);
                                          }}
                                        >
                                          Approve Certificate
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="btn-cyber text-red-400 border-red-400/30"
                                    onClick={() => updateCertificateStatus(certificate.id, 'rejected')}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {certificate.status === 'approved' && (
                                <div className="flex gap-2">
                                  {certificate.certificate_url ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="btn-cyber"
                                      onClick={() => window.open(certificate.certificate_url, '_blank')}
                                    >
                                      <Upload className="w-4 h-4 mr-1" />
                                      View PDF
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="btn-cyber opacity-50"
                                      disabled
                                    >
                                      No PDF
                                    </Button>
                                  )}
                                </div>
                              )}
                              {certificate.status === 'rejected' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="btn-cyber text-red-400 border-red-400/30"
                                    disabled
                                  >
                                    Rejected
                                  </Button>
                                </div>
                              )}
                              {/* Delete button for all certificates */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="btn-cyber text-red-400 border-red-400/30 ml-2"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this certificate?')) {
                                    deleteCertificate(certificate.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gradient-cyber">Event Settings</h2>
              <Button className="btn-neon" onClick={saveEventSettings}>
                Save Changes
              </Button>
            </div>

            <Card className="card-cyber">
              <CardHeader>
                <CardTitle>Event Configuration</CardTitle>
                <CardDescription>Configure event settings and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {eventSettings.length === 0 ? (
                  <p className="text-muted-foreground">No event settings configured.</p>
                ) : (
                  <div className="grid gap-6">
                    {eventSettings.map((setting) => (
                      <div key={setting.key} className="space-y-2">
                        <Label htmlFor={setting.key} className="text-sm font-medium">
                          {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        )}

                        {setting.key === 'event_status' ? (
                          <Select
                            value={editingSettings[setting.key] || setting.value}
                            onValueChange={(value) => setEditingSettings(prev => ({ ...prev, [setting.key]: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="live">Live</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                              <SelectItem value="ended">Ended</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : setting.key.includes('allow_') || setting.key.includes('pause_') ? (
                          <Select
                            value={editingSettings[setting.key] || setting.value}
                            onValueChange={(value) => setEditingSettings(prev => ({ ...prev, [setting.key]: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : setting.key.includes('datetime') ? (
                          <div className="space-y-2">
                            <Input
                              id={setting.key}
                              type="datetime-local"
                              value={(() => {
                                try {
                                  const dateValue = editingSettings[setting.key] || setting.value;
                                  // Handle both UTC and local datetime formats
                                  if (dateValue.endsWith('Z')) {
                                    // Convert UTC to local for display
                                    const utcDate = new Date(dateValue);
                                    const localDate = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
                                    return localDate.toISOString().slice(0, 16);
                                  } else {
                                    // Already local time
                                    return dateValue.slice(0, 16);
                                  }
                                } catch (error) {
                                  console.error('Date parsing error:', error);
                                  return '';
                                }
                              })()}
                              onChange={(e) => {
                                // Save as local time, not UTC
                                const localDateTime = e.target.value;
                                if (localDateTime) {
                                  // Don't add Z suffix - keep it as local time
                                  setEditingSettings(prev => ({ ...prev, [setting.key]: localDateTime + ':00' }));
                                }
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Current: {editingSettings[setting.key] || setting.value}
                            </p>
                          </div>
                        ) : (
                          <Input
                            id={setting.key}
                            value={editingSettings[setting.key] || setting.value}
                            onChange={(e) => setEditingSettings(prev => ({ ...prev, [setting.key]: e.target.value }))}
                            placeholder={setting.value}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Fallback Authentication Card */}
            <Card className="card-cyber">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Fallback Authentication
                </CardTitle>
                <CardDescription>
                  Emergency authentication system for when Supabase is unavailable
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Fallback Login</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow users to login with a 5-digit code when email auth fails
                    </p>
                  </div>
                  <Button
                    variant={fallbackSettings.enabled ? "destructive" : "default"}
                    onClick={async () => {
                      const result = await toggleFallbackAuth(!fallbackSettings.enabled)
                      if (result.success) {
                        toast({
                          title: fallbackSettings.enabled ? "Fallback Disabled" : "Fallback Enabled",
                          description: result.code ? `Access code: ${result.code}` : "Fallback authentication disabled"
                        })
                      }
                    }}
                  >
                    {fallbackSettings.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>

                {fallbackSettings.enabled && (
                  <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                    <h4 className="font-medium text-orange-400 mb-2">Current Access Code</h4>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-2 bg-background border border-primary/30 rounded font-mono text-lg text-primary">
                        {fallbackSettings.accessCode}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(fallbackSettings.accessCode)}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-orange-300 mt-2">
                      Share this code with users when email authentication is not working
                    </p>
                  </div>
                )}

                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <h4 className="font-medium text-red-400 mb-2">Emergency Admin Code</h4>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-background border border-primary/30 rounded font-mono text-lg text-primary">
                      {EMERGENCY_ADMIN_CODE}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(EMERGENCY_ADMIN_CODE)}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-red-300 mt-2">
                    <strong>Keep this secret!</strong> Users can enter this code during signup to get instant admin access.
                    Use only in emergencies when Supabase is completely down.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;