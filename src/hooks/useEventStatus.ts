import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface EventStatus {
  status: 'not_started' | 'live' | 'paused' | 'ended'
  allowPlayAccess: boolean
  allowNewEntries: boolean
  pauseTimers: boolean
  loading: boolean
}

export const useEventStatus = () => {
  const [eventStatus, setEventStatus] = useState<EventStatus>({
    status: 'live',
    allowPlayAccess: true,
    allowNewEntries: true,
    pauseTimers: false,
    loading: true
  })

  useEffect(() => {
    fetchEventStatus()

    // Set up real-time subscription for event status changes
    const subscription = supabase
      .channel('event_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_settings'
        },
        (payload) => {
          console.log('Event settings changed:', payload)
          fetchEventStatus()
        }
      )
      .subscribe()

    // Also set up a polling fallback every 5 seconds
    const pollInterval = setInterval(() => {
      fetchEventStatus()
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [])

  const fetchEventStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('event_settings')
        .select('key, value')
        .in('key', ['event_status', 'allow_play_access', 'allow_new_entries', 'pause_timers'])

      if (error) throw error

      const settings = data?.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string>) || {}

      setEventStatus({
        status: (settings.event_status as any) || 'live',
        allowPlayAccess: settings.allow_play_access === 'true',
        allowNewEntries: settings.allow_new_entries === 'true',
        pauseTimers: settings.pause_timers === 'true',
        loading: false
      })
    } catch (error) {
      console.error('Error fetching event status:', error)
      setEventStatus(prev => ({ ...prev, loading: false }))
    }
  }

  return {
    ...eventStatus,
    refetch: fetchEventStatus,
    forceRefresh: () => {
      console.log('Force refreshing event status...')
      fetchEventStatus()
    }
  }
}