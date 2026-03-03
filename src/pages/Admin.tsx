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
import { CertificatesSection } from "@/components/admin/CertificatesSection";

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

interface EventSettings {
  id: number
  status: 'not_started' | 'live' | 'paused' | 'ended'
  event_title: string
  event_datetime: string | null
  event_duration_hours: number
  event_location: string
  about_md: string
  prizes_md: string
  faq_md: string
  coc_md: string
  updated_at: string
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
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [editingSettings, setEditingSettings] = useState<Partial<EventSettings>>({});
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
  const [devModeBypass] = useState(import.meta.env.DEV);

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
          .select('id, full_name, email, role');

        const profilesMap = {};
        (allProfiles || []).forEach(p => {
          profilesMap[p.id] = p;
        });

        const transformedUsers = usersData.map(user => ({
          user_id: user.user_id,
          full_name: profilesMap[user.user_id]?.full_name || `User ${user.user_id.substring(0, 8)}`,
          email: profilesMap[user.user_id]?.email || 'No email',
          role: profilesMap[user.user_id]?.role || 'player',
          challenges_solved: user.solved_count || 0,
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
          .select('id, full_name, email, role');

        if (allProfiles && allProfiles.length > 0) {
          const usersWithProgress = await Promise.all(
            allProfiles.map(async (profile) => {
              const { data: progressData } = await supabase
                .from('challenge_progress')
                .select('status, duration_seconds')
                .eq('user_id', profile.id);

              const solvedCount = progressData?.filter(p => p.status === 'solved').length || 0;
              const totalTime = progressData?.reduce((sum, p) => sum + (p.duration_seconds || 0), 0) || 0;

              return {
                user_id: profile.id,
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
        .select('*')
        .eq('id', 1)
        .single();

      if (settingsError) {
        console.error('Error fetching event settings:', settingsError);
        setEventSettings(null);
      } else {
        setEventSettings(settingsData);
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
              const { data: userProfile, error: userError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', cert.user_id)
                .maybeSingle();

              if (userError) {
                console.error('Error fetching user for certificate:', cert.id, userError);
              }

              return {
                ...cert,
                title: (cert as any).title || 'Certificate',
                type: cert.type as 'champion' | 'participation' | 'special',
                status: cert.status as 'pending' | 'approved' | 'rejected',
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
      if (settingsData && settingsData.status !== eventStatus) {
        setEventStatus(settingsData.status);
      }

      // Initialize editing settings with the current event settings
      if (settingsData) {
        setEditingSettings(settingsData);
      }

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
        .update({ status: newStatus })
        .eq('id', 1);

      if (statusError) throw statusError;

      // Update local state
      setEventStatus(newStatus);

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
      console.log('Saving challenge:', challenge);
      
      if (challenge.id) {
        // Update existing challenge - only include defined values
        const updateData: any = {};
        
        if (challenge.title !== undefined) updateData.title = challenge.title;
        if (challenge.prompt_md !== undefined) updateData.prompt_md = challenge.prompt_md;
        if (challenge.hint_md !== undefined) updateData.hint_md = challenge.hint_md || null;
        if (challenge.answer_pattern !== undefined) updateData.answer_pattern = challenge.answer_pattern;
        if (challenge.is_regex !== undefined) updateData.is_regex = challenge.is_regex;
        if (challenge.points !== undefined) updateData.points = challenge.points;
        if (challenge.is_active !== undefined) updateData.is_active = challenge.is_active;
        if (challenge.order_index !== undefined) updateData.order_index = challenge.order_index;
        
        console.log('Update data:', updateData);
        
        const { data, error } = await supabase
          .from('challenges')
          .update(updateData)
          .eq('id', challenge.id)
          .select();

        console.log('Update response:', { data, error });
        
        if (error) {
          console.error('Supabase error details:', error);
          alert(`Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
          throw error;
        }
      } else {
        // Create new challenge
        const insertData = {
          title: challenge.title || '',
          prompt_md: challenge.prompt_md || '',
          hint_md: challenge.hint_md || null,
          answer_pattern: challenge.answer_pattern || '',
          is_regex: challenge.is_regex || false,
          points: challenge.points || 100,
          is_active: challenge.is_active !== false,
          order_index: challenge.order_index || (challenges.length + 1)
        };
        
        console.log('Insert data:', insertData);
        
        const { data, error } = await supabase
          .from('challenges')
          .insert([insertData])
          .select();

        console.log('Insert response:', { data, error });
        
        if (error) {
          console.error('Supabase error details:', error);
          alert(`Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
          throw error;
        }
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
      // Delete the challenge
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);

      if (error) throw error;

      // Get all remaining challenges
      const { data: remainingChallenges, error: fetchError } = await supabase
        .from('challenges')
        .select('*')
        .order('order_index');

      if (fetchError) throw fetchError;

      // Renumber all challenges starting from 1
      if (remainingChallenges && remainingChallenges.length > 0) {
        for (let i = 0; i < remainingChallenges.length; i++) {
          const challenge = remainingChallenges[i];
          const newOrderIndex = i + 1;
          
          // Only update if the order_index has changed
          if (challenge.order_index !== newOrderIndex) {
            const { error: updateError } = await supabase
              .from('challenges')
              .update({ order_index: newOrderIndex })
              .eq('id', challenge.id);

            if (updateError) {
              console.error('Error reordering challenge:', updateError);
            }
          }
        }
      }

      await fetchData();

      toast({
        title: "Success",
        description: "Challenge deleted and remaining challenges reordered",
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
      if (!eventSettings) return;

      const { error } = await supabase
        .from('event_settings')
        .update(editingSettings)
        .eq('id', 1);

      if (error) throw error;

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
                <img src="/logo.png" alt="GDG Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-2xl font-bold text-gradient-cyber">Admin Panel</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {profile && (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    Welcome, <span className="text-primary">{profile.full_name}</span>
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
                </>
              )}
              {!profile && devModeBypass && (
                <Badge variant="outline" className="text-accent border-accent/30">
                  Dev Mode
                </Badge>
              )}
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
              <img src="/logo.png" alt="GDG Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-2xl font-bold text-gradient-cyber">Admin Panel</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${getStatusColor(eventStatus)}`}>
              {getStatusIcon(eventStatus)}
              <span className="font-medium capitalize">{eventStatus.replace('_', ' ')}</span>
            </div>
            
            {profile && (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Welcome, <span className="text-primary">{profile.full_name}</span>
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
              </>
            )}
            
            {!profile && devModeBypass && (
              <Badge variant="outline" className="text-accent border-accent/30">
                Dev Mode
              </Badge>
            )}
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
            <CertificatesSection users={users} eventTitle={title} />
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
                {!eventSettings ? (
                  <p className="text-muted-foreground">Loading event settings...</p>
                ) : (
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="event_title" className="text-sm font-medium">Event Title</Label>
                      <Input
                        id="event_title"
                        value={editingSettings.event_title ?? eventSettings.event_title}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, event_title: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event_datetime" className="text-sm font-medium">Event Date & Time</Label>
                      <Input
                        id="event_datetime"
                        type="datetime-local"
                        value={(() => {
                          try {
                            const dateValue = editingSettings.event_datetime ?? eventSettings.event_datetime;
                            if (!dateValue) return '';
                            // If it's a UTC timestamp, convert to local time for display
                            if (dateValue.endsWith('Z')) {
                              const date = new Date(dateValue);
                              // Format as YYYY-MM-DDTHH:mm for datetime-local input
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const hours = String(date.getHours()).padStart(2, '0');
                              const minutes = String(date.getMinutes()).padStart(2, '0');
                              return `${year}-${month}-${day}T${hours}:${minutes}`;
                            }
                            // Otherwise assume it's already in the correct format
                            return dateValue.slice(0, 16);
                          } catch {
                            return '';
                          }
                        })()}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Store as local datetime string (not UTC)
                            setEditingSettings(prev => ({ ...prev, event_datetime: e.target.value }));
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          try {
                            const dateValue = editingSettings.event_datetime ?? eventSettings.event_datetime;
                            if (!dateValue) return 'No date set';
                            let date;
                            if (dateValue.includes('T')) {
                              const parts = dateValue.split('T');
                              const dateParts = parts[0].split('-');
                              const timeParts = parts[1].split(':');
                              date = new Date(
                                parseInt(dateParts[0]),
                                parseInt(dateParts[1]) - 1,
                                parseInt(dateParts[2]),
                                parseInt(timeParts[0]),
                                parseInt(timeParts[1])
                              );
                            } else {
                              date = new Date(dateValue);
                            }
                            return date.toLocaleString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                          } catch {
                            return 'Invalid date';
                          }
                        })()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event_duration" className="text-sm font-medium">Event Duration (hours)</Label>
                      <Input
                        id="event_duration"
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={editingSettings.event_duration_hours ?? eventSettings.event_duration_hours ?? 2}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, event_duration_hours: parseFloat(e.target.value) || 2 }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        How long the event will last (e.g., 1.5 for 1 hour 30 minutes)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event_location" className="text-sm font-medium">Event Location</Label>
                      <Input
                        id="event_location"
                        value={editingSettings.event_location ?? eventSettings.event_location}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, event_location: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="about_md" className="text-sm font-medium">About (Markdown)</Label>
                      <Textarea
                        id="about_md"
                        value={editingSettings.about_md ?? eventSettings.about_md}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, about_md: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prizes_md" className="text-sm font-medium">Prizes (Markdown)</Label>
                      <Textarea
                        id="prizes_md"
                        value={editingSettings.prizes_md ?? eventSettings.prizes_md}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, prizes_md: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="faq_md" className="text-sm font-medium">FAQ (Markdown)</Label>
                      <Textarea
                        id="faq_md"
                        value={editingSettings.faq_md ?? eventSettings.faq_md}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, faq_md: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coc_md" className="text-sm font-medium">Code of Conduct (Markdown)</Label>
                      <Textarea
                        id="coc_md"
                        value={editingSettings.coc_md ?? eventSettings.coc_md}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, coc_md: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <Button onClick={saveEventSettings} className="btn-neon">
                      Save Settings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;