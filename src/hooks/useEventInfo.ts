import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface EventInfo {
  title: string
  datetime: string
  location: string
  status: 'not_started' | 'live' | 'paused' | 'ended'
  allowPlayAccess: boolean
  allowNewEntries: boolean
  pauseTimers: boolean
  loading: boolean
}

export const useEventInfo = () => {
  const [eventInfo, setEventInfo] = useState<EventInfo>({
    title: 'Decrypt Night — Devs@PSU',
    datetime: '2025-01-15T18:00:00Z',
    location: 'Innovation Hub, PSU',
    status: 'live',
    allowPlayAccess: true,
    allowNewEntries: true,
    pauseTimers: false,
    loading: true
  })

  useEffect(() => {
    fetchEventInfo()

    // Set up real-time subscription for event info changes
    const subscription = supabase
      .channel('event_info_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_settings'
        },
        () => {
          fetchEventInfo()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchEventInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('event_settings')
        .select('key, value')

      if (error) throw error

      const settings = data?.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string>) || {}

      setEventInfo({
        title: settings.event_title || 'Decrypt Night — Devs@PSU',
        datetime: settings.event_datetime || '2025-01-15T18:00:00Z',
        location: settings.event_location || 'Innovation Hub, PSU',
        status: (settings.event_status as any) || 'live',
        allowPlayAccess: settings.allow_play_access === 'true',
        allowNewEntries: settings.allow_new_entries === 'true',
        pauseTimers: settings.pause_timers === 'true',
        loading: false
      })
    } catch (error) {
      console.error('Error fetching event info:', error)
      setEventInfo(prev => ({ ...prev, loading: false }))
    }
  }

  const formatEventDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return 'TBD'
    }
  }

  const formatEventDate = (datetime: string) => {
    try {
      // Handle timezone consistently with formatEventTime
      let date;
      if (datetime.endsWith('Z') || datetime.includes('+') || datetime.includes('-')) {
        date = new Date(datetime);
      } else {
        date = new Date(datetime + (datetime.includes('T') ? '' : 'T00:00:00'));
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'TBD'
    }
  }

  const formatEventTime = (datetime: string) => {
    try {
      // If the datetime doesn't end with Z, treat it as local time
      let date;
      if (datetime.endsWith('Z') || datetime.includes('+') || datetime.includes('-')) {
        // It's already in UTC or has timezone info
        date = new Date(datetime);
      } else {
        // Treat as local time
        date = new Date(datetime + (datetime.includes('T') ? '' : 'T00:00:00'));
      }
      
      const endTime = new Date(date.getTime() + 2 * 60 * 60 * 1000) // Add 2 hours
      return `${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })} - ${endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })}`
    } catch {
      return 'TBD'
    }
  }

  return {
    ...eventInfo,
    formatEventDateTime,
    formatEventDate,
    formatEventTime,
    refetch: fetchEventInfo
  }
}