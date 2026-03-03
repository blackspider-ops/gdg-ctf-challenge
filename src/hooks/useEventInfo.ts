import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface EventInfo {
  title: string
  datetime: string
  location: string
  duration: number
  status: 'not_started' | 'live' | 'paused' | 'ended'
  allowPlayAccess: boolean
  allowNewEntries: boolean
  pauseTimers: boolean
  loading: boolean
}

export const useEventInfo = () => {
  console.log('🎪 useEventInfo: Hook initializing');
  const [eventInfo, setEventInfo] = useState<EventInfo>({
    title: 'GDG CTF Challenge',
    datetime: '2025-01-15T18:00:00Z',
    location: 'Google Developers Group',
    duration: 2,
    status: 'live',
    allowPlayAccess: true,
    allowNewEntries: true,
    pauseTimers: false,
    loading: true
  })

  useEffect(() => {
    console.log('🎪 useEventInfo: useEffect running, fetching event info');
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
    console.log('🎪 useEventInfo: fetchEventInfo called');
    try {
      console.log('🎪 useEventInfo: Querying Supabase...');
      const { data, error } = await supabase
        .from('event_settings')
        .select('*')
        .eq('id', 1)
        .single()

      console.log('🎪 useEventInfo: Supabase response:', { data, error });

      if (error) throw error;

      console.log('🎪 useEventInfo: Setting event info with data:', data);
      setEventInfo({
        title: data?.event_title || 'GDG CTF Challenge',
        datetime: data?.event_datetime || '2025-01-15T18:00:00Z',
        location: data?.event_location || 'Google Developers Group',
        duration: data?.event_duration_hours || 2,
        status: data?.status || 'live',
        allowPlayAccess: true,
        allowNewEntries: true,
        pauseTimers: false,
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
      // Parse datetime string as local time
      let date;
      if (datetime.includes('T')) {
        // Format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
        const parts = datetime.split('T');
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');
        date = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]), // day
          parseInt(timeParts[0]), // hours
          parseInt(timeParts[1]) // minutes
        );
      } else {
        date = new Date(datetime);
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

  const formatEventTime = (datetime: string, durationHours: number = 2) => {
    try {
      // Parse datetime string as local time
      let date;
      if (datetime.includes('T')) {
        // Format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
        const parts = datetime.split('T');
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');
        date = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]), // day
          parseInt(timeParts[0]), // hours
          parseInt(timeParts[1]) // minutes
        );
      } else {
        date = new Date(datetime);
      }
      
      const endTime = new Date(date.getTime() + durationHours * 60 * 60 * 1000) // Add duration hours
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