import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

// Define UserSummary type
interface UserSummary {
  user_id: string
  full_name: string
  email: string
  role: 'player' | 'admin' | 'owner'
  current_challenge_index: number
  challenges_solved: number
  total_points: number
  total_time_seconds: number
  last_solve_at: string | null
}

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()

    // Set up real-time subscription
    const subscription = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_summary'
        },
        () => {
          fetchLeaderboard()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchLeaderboard = async () => {
    try {
      // Try to fetch with join first
      const { data: usersWithProfiles, error: joinError } = await supabase
        .from('user_summary')
        .select(`
          *,
          profiles!inner(user_id, full_name, email, role)
        `)
        .order('total_points', { ascending: false })
        .order('total_time_seconds', { ascending: true })
        .order('last_solve_at', { ascending: true })
        .limit(100)

      if (!joinError && usersWithProfiles) {
        // Transform the data to match our interface
        const transformedData = usersWithProfiles
          .map(item => ({
            user_id: item.user_id,
            full_name: item.profiles?.full_name || `User ${item.user_id.substring(0, 8)}`,
            email: item.profiles?.email || 'No email',
            role: item.profiles?.role || 'player',
            current_challenge_index: item.current_challenge_index,
            challenges_solved: item.solved_count || 0,
            total_points: item.total_points || 0,
            total_time_seconds: item.total_time_seconds || 0,
            last_solve_at: item.last_solve_at
          }))
          .filter(user => user.role !== 'admin' && user.role !== 'owner') // Exclude admin and owner accounts from leaderboard

        setLeaderboard(transformedData)
      } else {
        // Fallback to separate queries
        const { data, error } = await supabase
          .from('user_summary')
          .select('*')
          .order('total_points', { ascending: false })
          .order('total_time_seconds', { ascending: true })
          .order('last_solve_at', { ascending: true })
          .limit(100)

        if (error) throw error

        // Get all profiles
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, role')

        const profilesMap = {};
        (allProfiles || []).forEach(p => {
          profilesMap[p.user_id] = p;
        });

        // Transform the data to match our interface
        const transformedData = (data || [])
          .map(item => ({
            user_id: item.user_id,
            full_name: profilesMap[item.user_id]?.full_name || `User ${item.user_id.substring(0, 8)}`,
            email: profilesMap[item.user_id]?.email || 'No email',
            role: profilesMap[item.user_id]?.role || 'player',
            current_challenge_index: item.current_challenge_index,
            challenges_solved: item.solved_count || 0,
            total_points: item.total_points || 0,
            total_time_seconds: item.total_time_seconds || 0,
            last_solve_at: item.last_solve_at
          }))
          .filter(user => user.role !== 'admin' && user.role !== 'owner') // Exclude admin and owner accounts from leaderboard

        setLeaderboard(transformedData)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRank = (userId: string): number => {
    const index = leaderboard.findIndex(entry => entry.user_id === userId)
    return index >= 0 ? index + 1 : -1
  }

  const getUserStats = (userId: string) => {
    return leaderboard.find(entry => entry.user_id === userId)
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return {
    leaderboard,
    loading,
    getRank,
    getUserStats,
    formatTime,
    refetch: fetchLeaderboard
  }
}