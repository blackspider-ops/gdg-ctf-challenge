import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// Define types locally since they're not exported from client
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
  attachment_url?: string
  attachment_filename?: string
  attachment_description?: string
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
  skip_used: boolean
  status: 'in_progress' | 'solved' | 'given_up'
  created_at: string
  updated_at: string
  challenge?: Challenge
}
import { useChallenges } from '@/hooks/useChallenges'
import { supabase } from '@/integrations/supabase/client'
import { Lightbulb, CheckCircle2, Lock, Timer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useEventStatus } from '@/hooks/useEventStatus'
import { useAuth } from '@/hooks/useAuth'

interface ChallengeCardProps {
  challenge: Challenge
  progress?: ChallengeProgress
  isUnlocked: boolean
  isActive: boolean
  totalHintsUsed: number
}

export const ChallengeCard = ({ challenge, progress, isUnlocked, isActive, totalHintsUsed }: ChallengeCardProps) => {
  const [answer, setAnswer] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [challengeTimer, setChallengeTimer] = useState(0)
  const [hintUnlocked, setHintUnlocked] = useState(false)
  const [localHintsUsed, setLocalHintsUsed] = useState(0)
  const [effectiveStartTime, setEffectiveStartTime] = useState<Date | null>(null)
  const [wasPaused, setWasPaused] = useState(false)
  const { submitAnswer, startChallenge, useHint, calculatePoints, skipChallenge, progress: allProgress } = useChallenges()
  const { toast } = useToast()
  const { pauseTimers, status: eventStatus } = useEventStatus()
  const { profile } = useAuth()

  // Check if user has already used their skip power-up
  const hasUsedSkip = allProgress.some(p => p.skip_used === true)
  
  // Check if user is admin or owner
  const isAdminOrOwner = profile?.role === 'admin' || profile?.role === 'owner'



  // Auto-start challenges except for the first one (order_index 1)
  useEffect(() => {
    if (isActive && isUnlocked && !progress?.started_at && progress?.status && progress.status !== 'solved') {
      // Only auto-start if it's NOT the first challenge
      if (challenge.order_index > 1) {
        startChallenge(challenge.id)
      }
    }
  }, [isActive, isUnlocked, progress?.started_at, progress?.status, challenge.id, challenge.order_index, startChallenge])

  // Check if hint has been unlocked based on hints_used
  useEffect(() => {
    const hintsUsed = progress?.hints_used || localHintsUsed
    if (hintsUsed > 0) {
      setHintUnlocked(true)
    }
  }, [progress?.hints_used, localHintsUsed])

  // Individual challenge timer - starts when challenge is actually started
  // Skip timer for admin/owner users
  useEffect(() => {
    // Skip timer for admin/owner users
    if (isAdminOrOwner) {
      setChallengeTimer(0)
      return
    }

    // Check if challenge has been started and is not solved
    if (progress?.started_at && progress.status && progress.status !== 'solved') {
      const originalStartTime = new Date(progress.started_at)

      // Initialize effective start time if not set
      if (!effectiveStartTime) {
        setEffectiveStartTime(originalStartTime)
      }

      const updateTimer = () => {
        const shouldPause = pauseTimers || eventStatus === 'paused' || eventStatus === 'ended'
        const now = new Date()

        if (!shouldPause) {
          // Timer is running
          if (wasPaused) {
            // We just resumed - adjust the effective start time
            const currentDisplayTime = challengeTimer
            const newEffectiveStart = new Date(now.getTime() - (currentDisplayTime * 1000))
            setEffectiveStartTime(newEffectiveStart)
            setWasPaused(false)
            console.log(`Resumed: adjusted start time to continue from ${currentDisplayTime}s`)
          }

          if (effectiveStartTime) {
            const elapsed = Math.floor((now.getTime() - effectiveStartTime.getTime()) / 1000)
            setChallengeTimer(elapsed)
            console.log(`Timer running: ${elapsed}s`)
          }
        } else {
          // Timer is paused - don't update the display, just mark as paused
          if (!wasPaused) {
            setWasPaused(true)
            console.log(`Timer paused at ${challengeTimer}s`)
          }
        }
      }

      // Initial update
      updateTimer()

      // Set up interval
      const interval = setInterval(updateTimer, 1000)

      return () => {
        clearInterval(interval)
      }
    } else {
      // For challenges that haven't been started yet or are solved, show 0:00
      setChallengeTimer(0)
      setEffectiveStartTime(null)
      setWasPaused(false)
    }
  }, [progress, challenge.id, pauseTimers, eventStatus, effectiveStartTime, wasPaused, challengeTimer, isAdminOrOwner])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return

    setSubmitting(true)

    // Start challenge on first interaction (submit) - only for first challenge
    if (!progress?.started_at && challenge.order_index === 1) {
      await startChallenge(challenge.id)
    }

    // submitAnswer now handles starting the challenge automatically
    const success = await submitAnswer(challenge.id, answer)
    if (success) {
      setAnswer('')
    }

    setSubmitting(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnswer(e.target.value)
  }

  const calculateLocalHintPenalty = (challengeHintsUsed: number) => {
    // Progressive penalty: 1st=5, 2nd=10, 3rd=15, etc.
    // Total = 5 + 10 + 15 + ... = hintsUsed * (hintsUsed + 1) * 2.5
    return challengeHintsUsed * (challengeHintsUsed + 1) * 2.5
  }

  const calculateLocalTimePenalty = (durationSeconds: number) => {
    // Time penalty: 1 point per 45 seconds after the first 2 minutes
    const gracePeriod = 120 // 2 minutes grace period
    if (durationSeconds <= gracePeriod) return 0

    const excessTime = durationSeconds - gracePeriod
    const timePenalty = Math.floor(excessTime / 45) // 1 point per 45 seconds
    return Math.min(timePenalty, 100) // Cap time penalty at 100 points
  }

  const calculateLocalPoints = (challenge: Challenge, progress?: ChallengeProgress) => {
    if (!progress) return challenge.points

    const basePoints = challenge.points
    const incorrectPenalty = Math.floor((progress.incorrect_attempts || 0) / 2)
    const challengeHints = (progress.hints_used || 0) + localHintsUsed
    const hintPenalty = calculateLocalHintPenalty(challengeHints)

    // For active challenges, use current timer; for completed ones, use stored duration
    const currentDuration = progress.status === 'solved'
      ? (progress.duration_seconds || 0)
      : challengeTimer
    
    // No time penalty for admin/owner users
    const timePenalty = isAdminOrOwner ? 0 : calculateLocalTimePenalty(currentDuration)

    return Math.max(1, basePoints - incorrectPenalty - hintPenalty - timePenalty)
  }

  const getNextHintCost = () => {
    // Calculate the cost of the NEXT hint (not cumulative)
    const totalHintsUsedSoFar = (progress?.hints_used || 0) + localHintsUsed
    const nextHintNumber = totalHintsUsedSoFar + 1
    return nextHintNumber * 5 // 1st hint = 5, 2nd hint = 10, 3rd hint = 15, etc.
  }

  const getCurrentHintCost = () => {
    // Calculate the cost of the hint that was just used
    const totalHintsUsed = (progress?.hints_used || 0) + localHintsUsed
    return totalHintsUsed * 5 // Current hint number * 5
  }

  const handleSkip = async () => {
    if (hasUsedSkip) {
      toast({
        title: 'Skip Already Used',
        description: 'You can only skip one challenge per event',
        variant: 'destructive'
      })
      return
    }

    setSkipping(true)
    await skipChallenge(challenge.id)
    setSkipping(false)
  }

  if (!isUnlocked) {
    return (
      <Card className="card-cyber opacity-60 max-w-full" data-challenge-id={challenge.id}>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-muted-foreground text-base sm:text-lg">
                  Challenge {challenge.order_index}: {challenge.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  Complete previous challenges to unlock
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-muted-foreground border-muted self-start sm:self-center">
              {challenge.points} points
            </Badge>
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (progress?.status === 'given_up' && progress?.skip_used) {
    return (
      <Card className="card-cyber border-orange-500/50 bg-orange-500/5 max-w-full" data-challenge-id={challenge.id}>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏭️</span>
              <div>
                <CardTitle className="text-orange-400 text-base sm:text-lg">
                  Challenge {challenge.order_index}: {challenge.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  Skipped using power-up
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 self-start sm:self-center">
              Skipped
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="prose prose-invert prose-sm max-w-none mb-4 prose-pre:bg-primary/10 prose-pre:border prose-pre:border-primary/30 prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {challenge.prompt_md}
            </ReactMarkdown>
          </div>
          <div className="text-sm text-orange-400">
            ⏭️ You skipped this challenge and moved to the next one.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (progress?.status === 'solved') {
    return (
      <Card className="card-cyber border-primary/50 bg-primary/5 max-w-full" data-challenge-id={challenge.id}>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <div>
                <CardTitle className="text-primary text-base sm:text-lg">
                  Challenge {challenge.order_index}: {challenge.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  Completed in {Math.floor((progress.duration_seconds || 0) / 60)}:
                  {((progress.duration_seconds || 0) % 60).toString().padStart(2, '0')}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-primary text-primary-foreground self-start sm:self-center">
              {calculatePoints(challenge, progress)} points
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="prose prose-invert prose-sm max-w-none mb-4 prose-pre:bg-primary/10 prose-pre:border prose-pre:border-primary/30 prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {challenge.prompt_md}
            </ReactMarkdown>
          </div>
          <div className="text-sm text-primary">
            ✓ Challenge completed successfully!
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`card-cyber ${isActive ? 'ring-2 ring-primary/50' : ''} max-w-full`} data-challenge-id={challenge.id}>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl text-gradient-cyber">
              Challenge {challenge.order_index}: {challenge.title}
            </CardTitle>
            <CardDescription className="mt-1 sm:mt-2 text-sm">
              {isActive ? 'Current challenge - solve to unlock the next one' : 'Available challenge'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {!isAdminOrOwner && isUnlocked && (progress?.status as ChallengeProgress['status']) !== 'solved' && (
              <Badge
                variant="outline"
                className={`border-primary/50 text-xs ${challengeTimer > 120
                    ? 'text-orange-400 border-orange-400/50'
                    : challengeTimer > 90
                      ? 'text-yellow-400 border-yellow-400/50'
                      : 'text-primary'
                  }`}
              >
                <Timer className="w-3 h-3 mr-1" />
                {formatTime(challengeTimer)}
                {progress?.started_at && challengeTimer > 120 && <span className="ml-1 text-xs">(-{calculateLocalTimePenalty(challengeTimer)})</span>}
              </Badge>
            )}
            <Badge variant="outline" className="text-primary border-primary/50 text-xs">
              {calculateLocalPoints(challenge, progress)} / {challenge.points} points
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        <div className="prose prose-invert max-w-none prose-pre:bg-primary/10 prose-pre:border prose-pre:border-primary/30 prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {challenge.prompt_md}
          </ReactMarkdown>
        </div>

        {challenge.attachment_url && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-primary">📎 File Attachment</span>
            </div>
            {challenge.attachment_description && (
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{challenge.attachment_description}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="btn-cyber"
              onClick={async () => {
                try {
                  const response = await fetch(
                    `${supabase.supabaseUrl}/functions/v1/download-challenge-file?challenge=${challenge.id}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${supabase.supabaseKey}`,
                      }
                    }
                  );
                  
                  if (!response.ok) throw new Error('Download failed');
                  
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = challenge.attachment_filename || 'challenge-file';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error('Download error:', error);
                }
              }}
            >
              Download {challenge.attachment_filename || 'File'}
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor={`answer-${challenge.id}`} className="block text-sm font-medium mb-2">
              Your Answer
            </Label>
            <Input
              id={`answer-${challenge.id}`}
              value={answer}
              onChange={handleInputChange}
              placeholder="Enter your answer here..."
              className="bg-background/50 border-primary/30 focus:border-primary text-sm sm:text-base"
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button type="submit" className="btn-neon text-sm sm:text-base" disabled={submitting || !answer.trim()}>
              {submitting ? 'Submitting...' : 'Submit Answer'}
            </Button>
            {challenge.hint_md && (
              <Button
                type="button"
                variant="outline"
                className="btn-cyber text-sm sm:text-base"
                onClick={async () => {
                  if (!hintUnlocked) {
                    // Start challenge on first interaction (hint request) - only for first challenge
                    if (!progress?.started_at && challenge.order_index === 1) {
                      await startChallenge(challenge.id)
                    }

                    // First time clicking - unlock the hint
                    try {
                      await useHint(challenge.id)
                    } catch (error) {
                      console.warn('Database hint tracking failed, using local tracking')
                      setLocalHintsUsed(prev => prev + 1)
                    }
                    setHintUnlocked(true)
                    setShowHint(true)
                  } else {
                    // Hint already unlocked - just toggle show/hide
                    setShowHint(!showHint)
                  }
                }}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                {!hintUnlocked
                  ? `Unlock Hint (-${getNextHintCost()} pts)`
                  : showHint
                    ? 'Hide Hint'
                    : 'Show Hint'
                }
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="btn-cyber text-sm sm:text-base border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
              onClick={handleSkip}
              disabled={skipping || hasUsedSkip || !isActive}
              title={hasUsedSkip ? 'You have already used your skip power-up' : !isActive ? 'Only available for active challenges' : 'Skip this challenge (one-time use for all challenges)'}
            >
              {skipping ? 'Skipping...' : hasUsedSkip ? '⏭️ Skip Used' : '⏭️ Skip (1x)'}
            </Button>
          </div>
          {!hasUsedSkip && isActive && (
            <p className="text-xs text-muted-foreground">
              💡 You have one skip power-up for the entire event. Use it wisely!
            </p>
          )}
        </form>

        {showHint && hintUnlocked && challenge.hint_md && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-accent" />
              <span className="text-xs sm:text-sm font-medium text-accent">
                Hint (-{getCurrentHintCost()} points deducted)
              </span>
            </div>
            <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-accent/10 prose-pre:border prose-pre:border-accent/30 prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {challenge.hint_md}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {progress && progress.attempts > 0 && (
          <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Attempts:</strong> {progress.attempts}
              {progress.incorrect_attempts > 0 && ` (${progress.incorrect_attempts} incorrect)`}
            </p>
            {((progress?.hints_used || 0) + localHintsUsed) > 0 && (
              <p>
                <strong>Hints used:</strong> {(progress?.hints_used || 0) + localHintsUsed} (-{calculateLocalHintPenalty((progress?.hints_used || 0) + localHintsUsed)} points)
              </p>
            )}
            {!isAdminOrOwner && (() => {
              const currentDuration = progress && (progress.status as ChallengeProgress['status']) === 'solved'
                ? (progress.duration_seconds || 0)
                : challengeTimer
              const timePenalty = calculateLocalTimePenalty(currentDuration)
              return timePenalty > 0 && (
                <p>
                  <strong>Time penalty:</strong> -{timePenalty} points (over 2 min grace period)
                </p>
              )
            })()}
            <p>
              <strong>Current score:</strong> {calculateLocalPoints(challenge, progress)} / {challenge.points} points
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}