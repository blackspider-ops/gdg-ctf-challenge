import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface ChallengeProgress {
  id: number
  challenge_id: number
  started_at: string
  solved_at: string | null
  duration_seconds: number | null
  attempts: number
  incorrect_attempts: number
  status: string // Using string instead of strict union to match DB
  challenge: {
    title: string
    points: number
    order_index: number
  }
}

interface ProfileData {
  totalPoints: number
  challengesSolved: number
  totalTime: number
  averageTime: number
  successRate: number
  perfectScores: number
  currentRank: number
  challengeProgress: ChallengeProgress[]
}

export const useProfile = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchProfileData()
    }
  }, [user])

  const fetchProfileData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch user summary for basic stats
      const { data: userSummary, error: summaryError } = await supabase
        .from('user_summary')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (summaryError && summaryError.code !== 'PGRST116') {
        throw summaryError
      }

      // Fetch detailed challenge progress
      const { data: progressData, error: progressError } = await supabase
        .from('challenge_progress')
        .select(`
          *,
          challenge:challenges(title, points, order_index)
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: true })

      if (progressError) throw progressError

      // Calculate stats
      const solvedChallenges = progressData?.filter(p => p.status === 'solved') || []
      const totalAttempts = progressData?.reduce((sum, p) => sum + p.attempts, 0) || 0
      const totalChallenges = progressData?.length || 0
      
      const profileStats: ProfileData = {
        totalPoints: userSummary?.total_points || 0,
        challengesSolved: userSummary?.challenges_solved || 0,
        totalTime: userSummary?.total_time_seconds || 0,
        averageTime: solvedChallenges.length > 0 
          ? Math.round((userSummary?.total_time_seconds || 0) / solvedChallenges.length)
          : 0,
        successRate: totalChallenges > 0 
          ? Math.round((solvedChallenges.length / totalChallenges) * 100)
          : 0,
        perfectScores: solvedChallenges.filter(p => p.incorrect_attempts === 0).length,
        currentRank: 0, // Will be calculated from leaderboard position
        challengeProgress: progressData || []
      }

      // Get current rank from leaderboard
      const { data: leaderboard } = await supabase
        .from('user_summary')
        .select('user_id, challenges_solved, total_points, total_time_seconds')
        .order('challenges_solved', { ascending: false })
        .order('total_points', { ascending: false })
        .order('total_time_seconds', { ascending: true })

      if (leaderboard) {
        const userIndex = leaderboard.findIndex(entry => entry.user_id === user.id)
        profileStats.currentRank = userIndex >= 0 ? userIndex + 1 : 0
      }

      setProfileData(profileStats)
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
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
    profileData,
    loading,
    formatTime,
    refetch: fetchProfileData
  }
}