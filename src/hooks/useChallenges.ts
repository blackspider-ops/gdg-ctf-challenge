import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

// Define types
interface Challenge {
  id: number
  title: string
  prompt_md: string
  hint_md?: string
  answer_pattern: string
  is_regex: boolean
  points: number
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ChallengeProgress {
  id: number
  user_id: string
  challenge_id: number
  started_at: string
  solved_at?: string
  duration_seconds?: number
  attempts: number
  incorrect_attempts: number
  hints_used: number
  status: 'in_progress' | 'solved' | 'given_up'
  created_at: string
  updated_at: string
  challenge?: Challenge
}

export const useChallenges = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [progress, setProgress] = useState<ChallengeProgress[]>([])
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)


  const isChallengeUnlocked = (challenge: Challenge) => {
    if (challenge.order_index === 1) return true
    
    const prevChallengeIndex = challenge.order_index - 1
    const prevChallenge = challenges.find(c => c.order_index === prevChallengeIndex)
    
    if (!prevChallenge) {
      return false
    }
    
    const prevProgress = progress.find(p => p.challenge_id === prevChallenge.id)
    const isUnlocked = prevProgress?.status === 'solved'
    

    
    return isUnlocked
  }

  useEffect(() => {
    if (user) {
      fetchChallengesAndProgress()
    }
  }, [user])



  const fetchChallengesAndProgress = async () => {
    if (!user) return

    try {
      // Fetch all active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('order_index')

      if (challengesError) throw challengesError

      setChallenges(challengesData || [])

      // Fetch user's progress
      const { data: progressData, error: progressError } = await supabase
        .from('challenge_progress')
        .select('*, challenge:challenges(*)')
        .eq('user_id', user.id)

      if (progressError) throw progressError

      setProgress((progressData || []) as ChallengeProgress[])

      // Determine current challenge (first unsolved challenge)
      if (challengesData && challengesData.length > 0) {
        const solvedChallengeIds = (progressData || [])
          .filter(p => p.status === 'solved')
          .map(p => p.challenge_id)

        const nextChallenge = challengesData.find(c => !solvedChallengeIds.includes(c.id))
        setCurrentChallenge(nextChallenge || null)

        // Auto-start challenge 1 if it's the current challenge and hasn't been started yet
        if (nextChallenge && nextChallenge.order_index === 1) {
          const challenge1Progress = (progressData || []).find(p => p.challenge_id === nextChallenge.id)
          if (!challenge1Progress?.started_at) {
            // Start challenge 1 automatically when user first visits play page
            setTimeout(() => {
              startChallenge(nextChallenge.id)
            }, 500) // Small delay to ensure everything is loaded
          }
        }
      }
    } catch (error) {
      console.error('Error fetching challenges:', error)
      toast({
        title: 'Error',
        description: 'Failed to load challenges',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const startChallenge = async (challengeId: number) => {
    if (!user) return

    try {
      // Check if progress already exists for this challenge
      const existingProgress = progress.find(p => p.challenge_id === challengeId)
      
      if (existingProgress) {
        // Challenge already started, just return
        return
      }

      const { error } = await supabase
        .from('challenge_progress')
        .insert([
          {
            user_id: user.id,
            challenge_id: challengeId,
            started_at: new Date().toISOString(),
            status: 'in_progress'
          }
        ])

      if (error) throw error

      // Refresh progress
      await fetchChallengesAndProgress()
    } catch (error) {
      console.error('Error starting challenge:', error)
    }
  }

  const submitAnswer = async (challengeId: number, answer: string): Promise<boolean> => {
    if (!user) return false

    try {
      // Check if submissions are allowed
      const { data: settingsData, error: settingsError } = await supabase
        .from('event_settings')
        .select('key, value')
        .in('key', ['event_status', 'allow_new_entries']);

      if (settingsError) throw settingsError;

      const statusSetting = settingsData?.find(s => s.key === 'event_status');
      const entriesSetting = settingsData?.find(s => s.key === 'allow_new_entries');

      if (statusSetting?.value !== 'live' || entriesSetting?.value !== 'true') {
        toast({
          title: 'Submissions Disabled',
          description: 'New submissions are currently not allowed',
          variant: 'destructive'
        });
        return false;
      }

      const challenge = challenges.find(c => c.id === challengeId)
      if (!challenge) return false

      // Check if challenge is unlocked based on solved challenges
      const solvedChallengeIds = progress
        .filter(p => p.status === 'solved')
        .map(p => p.challenge_id)
      
      // For first challenge, always unlocked
      if (challenge.order_index === 1) {
        // Allow first challenge
      } else {
        // Check if previous challenge is solved
        const prevChallenge = challenges.find(c => c.order_index === challenge.order_index - 1)
        const isPrevSolved = prevChallenge && solvedChallengeIds.includes(prevChallenge.id)
        
        if (!isPrevSolved) {
          toast({
            title: 'Access Denied',
            description: 'You must complete previous challenges first',
            variant: 'destructive'
          })
          return false
        }
      }

      // Get current progress or start challenge NOW (when user submits answer)
      let currentProgress = progress.find(p => p.challenge_id === challengeId)
      let startTime: Date
      
      if (!currentProgress?.started_at) {
        // Start the challenge NOW - this is when the timer should begin
        startTime = new Date()
        const { data, error } = await (supabase as any).rpc('upsert_challenge_progress', {
          p_user_id: user.id,
          p_challenge_id: challengeId,
          p_status: 'in_progress',
          p_started_at: startTime.toISOString(),
          p_attempts: 0,
          p_incorrect_attempts: 0,
          p_hints_used: 0
        })
        
        if (error) throw error
        
        // Update local progress immediately
        const newProgress = {
          id: 0,
          user_id: user.id,
          challenge_id: challengeId,
          started_at: startTime.toISOString(),
          attempts: 0,
          incorrect_attempts: 0,
          hints_used: 0,
          status: 'in_progress' as const,
          created_at: startTime.toISOString(),
          updated_at: startTime.toISOString()
        }
        
        setProgress(prevProgress => [...prevProgress, newProgress])
        currentProgress = newProgress
      } else {
        startTime = new Date(currentProgress.started_at)
      }
      
      // Normalize answer
      const normalizedAnswer = answer.trim().toLowerCase()
      const normalizedPattern = challenge.answer_pattern.toLowerCase()

      // Check answer
      let isCorrect = false
      if (challenge.is_regex) {
        const regex = new RegExp(normalizedPattern, 'i')
        isCorrect = regex.test(normalizedAnswer)
      } else {
        isCorrect = normalizedAnswer === normalizedPattern
      }

      // Calculate duration
      const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)

      if (isCorrect) {
        // Update progress as solved
        const { error } = await supabase
          .from('challenge_progress')
          .upsert([
            {
              user_id: user.id,
              challenge_id: challengeId,
              started_at: startTime.toISOString(),
              solved_at: new Date().toISOString(),
              duration_seconds: duration,
              attempts: (currentProgress?.attempts || 0) + 1,
              incorrect_attempts: currentProgress?.incorrect_attempts || 0,
              hints_used: currentProgress?.hints_used || 0,
              status: 'solved' as const
            }
          ], {
            onConflict: 'user_id,challenge_id'
          })

        if (error) throw error

        // Update local progress state immediately
        const updatedProgress = {
          id: currentProgress?.id || 0,
          user_id: user.id,
          challenge_id: challengeId,
          started_at: startTime.toISOString(),
          solved_at: new Date().toISOString(),
          duration_seconds: duration,
          attempts: (currentProgress?.attempts || 0) + 1,
          incorrect_attempts: currentProgress?.incorrect_attempts || 0,
          hints_used: currentProgress?.hints_used || 0,
          status: 'solved' as const,
          created_at: currentProgress?.created_at || startTime.toISOString(),
          updated_at: new Date().toISOString()
        }

        // Update progress state immediately and force re-render
        setProgress(prevProgress => {
          const existingIndex = prevProgress.findIndex(p => p.challenge_id === challengeId)
          let newProgress
          if (existingIndex >= 0) {
            newProgress = [...prevProgress]
            newProgress[existingIndex] = updatedProgress
          } else {
            newProgress = [...prevProgress, updatedProgress]
          }
          

          
          return newProgress
        })

        toast({
          title: '🎉 Correct!',
          description: `Challenge completed in ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
          duration: 3000,
        })

        // Update current challenge to next unsolved challenge
        const nextChallenge = challenges.find(c => c.order_index === challenge.order_index + 1)
        setCurrentChallenge(nextChallenge || null)

        // Auto-start the next challenge immediately
        if (nextChallenge) {
          const nextStartTime = new Date()
          const { data: nextData, error: nextError } = await (supabase as any).rpc('upsert_challenge_progress', {
            p_user_id: user.id,
            p_challenge_id: nextChallenge.id,
            p_status: 'in_progress',
            p_started_at: nextStartTime.toISOString(),
            p_attempts: 0,
            p_incorrect_attempts: 0,
            p_hints_used: 0
          })

          if (!nextError) {
            // Update local progress with the new challenge
            const nextProgress = {
              id: 0,
              user_id: user.id,
              challenge_id: nextChallenge.id,
              started_at: nextStartTime.toISOString(),
              attempts: 0,
              incorrect_attempts: 0,
              hints_used: 0,
              status: 'in_progress' as const,
              created_at: nextStartTime.toISOString(),
              updated_at: nextStartTime.toISOString()
            }
            
            setProgress(prevProgress => [...prevProgress, nextProgress])
          }

          toast({
            title: '🚀 Next Challenge Started!',
            description: `Challenge ${nextChallenge.order_index}: ${nextChallenge.title}`,
            duration: 2000,
          })
        }

        // Force re-render
        setRefreshTrigger(prev => prev + 1)
        
        // Refresh challenges and progress data immediately
        await fetchChallengesAndProgress()
        
        // Force page refresh after a delay to show next challenge
        setTimeout(() => {
          window.location.href = window.location.href
        }, 1500)
        
        return true
      } else {
        // Update incorrect attempts
        const upsertData = {
          user_id: user.id,
          challenge_id: challengeId,
          started_at: startTime.toISOString(),
          attempts: (currentProgress?.attempts || 0) + 1,
          incorrect_attempts: (currentProgress?.incorrect_attempts || 0) + 1,
          hints_used: currentProgress?.hints_used || 0,
          status: currentProgress?.status || 'in_progress'
        }
        
        const { error } = await supabase
          .from('challenge_progress')
          .upsert([upsertData], {
            onConflict: 'user_id,challenge_id'
          })

        if (error) {
          console.error('Error upserting incorrect attempt:', error)
          throw error
        }

        toast({
          title: 'Incorrect',
          description: 'Keep trying! Check the hint if you need help.',
          variant: 'destructive'
        })

        // Refresh data
        await fetchChallengesAndProgress()
        return false
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: 'Error',
        description: `Failed to submit answer: ${errorMessage}`,
        variant: 'destructive'
      })
      return false
    }
  }

  const getChallengeProgress = (challengeId: number) => {
    return progress.find(p => p.challenge_id === challengeId)
  }

  const useHint = async (challengeId: number) => {
    if (!user) return

    try {
      // Get current progress or create if doesn't exist
      let currentProgress = progress.find(p => p.challenge_id === challengeId)
      
      if (!currentProgress?.started_at) {
        // Start the challenge NOW when hint is used - this is when the timer should begin
        const startTime = new Date()
        const { data: insertData, error: insertError } = await (supabase as any).rpc('upsert_challenge_progress', {
          p_user_id: user.id,
          p_challenge_id: challengeId,
          p_status: 'in_progress',
          p_started_at: startTime.toISOString(),
          p_attempts: 0,
          p_incorrect_attempts: 0,
          p_hints_used: 1
        })
        
        if (insertError) throw insertError
        
        // Update local progress immediately
        const newProgress = {
          id: 0,
          user_id: user.id,
          challenge_id: challengeId,
          started_at: startTime.toISOString(),
          attempts: 0,
          incorrect_attempts: 0,
          hints_used: 1,
          status: 'in_progress' as const,
          created_at: startTime.toISOString(),
          updated_at: startTime.toISOString()
        }
        
        setProgress(prevProgress => {
          const updated = [...prevProgress, newProgress]
          return updated
        })
        setRefreshTrigger(prev => prev + 1)
        return
      }

      if (currentProgress) {
        const newHintsUsed = (currentProgress.hints_used || 0) + 1
        
        // Update hint count in database
        const { error } = await supabase
          .from('challenge_progress')
          .upsert([
            {
              user_id: user.id,
              challenge_id: challengeId,
              started_at: currentProgress.started_at,
              attempts: currentProgress.attempts,
              incorrect_attempts: currentProgress.incorrect_attempts,
              hints_used: newHintsUsed,
              status: currentProgress.status
            }
          ], {
            onConflict: 'user_id,challenge_id'
          })

        if (error) {
          console.error('Error updating hint usage:', error)
          // If hints_used column doesn't exist, we'll handle it gracefully
          if (error.message?.includes('hints_used') || error.message?.includes('column')) {
            console.warn('hints_used column may not exist in database, using local tracking')
            // Don't throw error, just use local tracking
            return
          }
          throw error
        }

        // Update local state
        setProgress(prevProgress => {
          const existingIndex = prevProgress.findIndex(p => p.challenge_id === challengeId)
          if (existingIndex >= 0) {
            const newProgress = [...prevProgress]
            newProgress[existingIndex] = { ...newProgress[existingIndex], hints_used: newHintsUsed }
            return newProgress
          }
          return prevProgress
        })

        setRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error updating hint usage:', error)
    }
  }

  const calculateHintPenalty = (hintsUsed: number) => {
    // Progressive penalty: 1st=5, 2nd=10, 3rd=15, etc.
    // Total = 5 + 10 + 15 + ... = hintsUsed * (hintsUsed + 1) * 2.5
    return Math.min(hintsUsed * (hintsUsed + 1) * 2.5, 100) // Cap total hint penalty at 100 points
  }

  const calculateTimePenalty = (durationSeconds: number) => {
    // Time penalty: 1 point per 45 seconds after the first 2 minutes
    const gracePeriod = 120 // 2 minutes grace period
    if (durationSeconds <= gracePeriod) return 0
    
    const excessTime = durationSeconds - gracePeriod
    const timePenalty = Math.floor(excessTime / 45) // 1 point per 45 seconds
    return Math.min(timePenalty, 100) // Cap time penalty at 100 points
  }

  const calculatePoints = (challenge: Challenge, progress?: ChallengeProgress) => {
    if (!progress) return challenge.points

    const basePoints = challenge.points
    const incorrectPenalty = Math.floor((progress.incorrect_attempts || 0) / 2) // 1 point per 2 incorrect attempts
    
    // Progressive hint penalty to match database calculation
    const hintsUsed = progress.hints_used || 0
    const hintPenalty = hintsUsed > 0 ? 
      Math.min(200, (hintsUsed * (hintsUsed + 1) * 5 / 2)) : 0
    
    // Time penalty to match database calculation  
    const timePenalty = progress.duration_seconds && progress.duration_seconds > 120 ? 
      Math.min(100, Math.floor((progress.duration_seconds - 120) / 45)) : 0
    
    const finalPoints = Math.max(1, basePoints - incorrectPenalty - hintPenalty - timePenalty)
    
    return finalPoints
  }

  return {
    challenges,
    progress,
    currentChallenge,
    loading,
    startChallenge,
    submitAnswer,
    getChallengeProgress,
    isChallengeUnlocked,
    useHint,
    calculatePoints,
    refetch: fetchChallengesAndProgress,
    refreshTrigger
  }
}