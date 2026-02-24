import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEmergencyAdmin } from '@/hooks/useEmergencyAdmin'
import { supabase } from '@/integrations/supabase/client'

const EmergencyAdmin = () => {
    const { profile, isAdmin, signOut, loading } = useAuth()
    const { checkEmergencySession } = useEmergencyAdmin()
    const [eventStatus, setEventStatus] = useState('live')

    // Check for emergency admin session
    const emergencyAdmin = checkEmergencySession()
    const hasAdminAccess = isAdmin || emergencyAdmin



    const updateEventStatus = async (newStatus: string) => {
        try {
            await supabase.from('event_settings').upsert([
                { key: 'event_status', value: newStatus, description: 'Current status of the competition event' },
                { key: 'pause_timers', value: (newStatus === 'paused' || newStatus === 'ended').toString(), description: 'Whether challenge timers should be paused' }
            ])
            setEventStatus(newStatus)
            alert(`Event status updated to: ${newStatus}`)
        } catch (error) {
            alert('Error updating event status')
        }
    }

    // Check for admin access
    if (!hasAdminAccess) {
        return (
            <div style={{ padding: '20px', backgroundColor: '#000', color: '#fff', minHeight: '100vh' }}>
                <h1 style={{ color: '#ff4444' }}>🚨 Access Denied</h1>
                <p>You need admin access to view this page.</p>
                <p style={{ marginTop: '20px', color: '#ffaa00' }}>
                    If you have an emergency admin code, please use the emergency login button on the main page.
                </p>
                <button
                    onClick={() => window.location.href = '/'}
                    style={{
                        backgroundColor: '#333',
                        color: '#fff',
                        border: '1px solid #666',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '20px'
                    }}
                >
                    Go to Home Page
                </button>
            </div>
        )
    }

    return (
        <div style={{
            padding: '20px',
            backgroundColor: '#000',
            color: '#fff',
            minHeight: '100vh',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{ marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
                <h1 style={{ color: '#00ff00', fontSize: '28px', marginBottom: '10px' }}>
                    🚨 Emergency Admin Panel
                </h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p>Welcome, <strong style={{ color: '#00ff00' }}>{(profile || emergencyAdmin)?.full_name}</strong></p>
                        {emergencyAdmin && (
                            <p style={{ color: '#ffaa00', fontSize: '12px', marginTop: '5px' }}>
                                🚨 Emergency Admin Session Active
                            </p>
                        )}
                    </div>
                    <button
                        onClick={signOut}
                        style={{
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#00ff00', marginBottom: '15px' }}>Event Controls</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => updateEventStatus('live')}
                        style={{
                            backgroundColor: eventStatus === 'live' ? '#00ff00' : '#333',
                            color: eventStatus === 'live' ? '#000' : '#fff',
                            border: '1px solid #00ff00',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Start Event
                    </button>
                    <button
                        onClick={() => updateEventStatus('paused')}
                        style={{
                            backgroundColor: eventStatus === 'paused' ? '#ffaa00' : '#333',
                            color: eventStatus === 'paused' ? '#000' : '#fff',
                            border: '1px solid #ffaa00',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Pause Event
                    </button>
                    <button
                        onClick={() => updateEventStatus('ended')}
                        style={{
                            backgroundColor: eventStatus === 'ended' ? '#ff4444' : '#333',
                            color: eventStatus === 'ended' ? '#000' : '#fff',
                            border: '1px solid #ff4444',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        End Event
                    </button>
                </div>
            </div>

            <div>
                <h2 style={{ color: '#00ff00', marginBottom: '15px' }}>Quick Actions</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            backgroundColor: '#333',
                            color: '#fff',
                            border: '1px solid #666',
                            padding: '15px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🏠 Go to Home
                    </button>
                    <button
                        onClick={() => window.location.href = '/leaderboard'}
                        style={{
                            backgroundColor: '#333',
                            color: '#fff',
                            border: '1px solid #666',
                            padding: '15px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🏆 View Leaderboard
                    </button>
                    <button
                        onClick={() => window.location.href = '/play'}
                        style={{
                            backgroundColor: '#333',
                            color: '#fff',
                            border: '1px solid #666',
                            padding: '15px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🎮 View Play Page
                    </button>
                    <button
                        onClick={() => window.location.href = '/admin'}
                        style={{
                            backgroundColor: '#0066cc',
                            color: '#fff',
                            border: '1px solid #0088ff',
                            padding: '15px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        ⚙️ Full Admin Panel
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#333', borderRadius: '4px' }}>
                <h3 style={{ color: '#ffaa00', marginBottom: '10px' }}>Emergency Admin Info</h3>
                <p style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    This is a simplified admin panel for emergency use. You have full admin privileges and can control the event status.
                    The main admin panel may not load due to CSS/component issues, but this emergency panel provides essential controls.
                </p>
            </div>
        </div>
    )
}

export default EmergencyAdmin