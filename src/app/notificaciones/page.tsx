'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import type { Notification } from '@/lib/supabase'

export default function NotificacionesPage() {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/auth'); return }
      loadNotifs(data.session.user.id)
    })
  }, [])

  async function loadNotifs(userId: string) {
    const { data } = await supabase
      .from('notifications').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data ?? [])
    setLoading(false)
    await supabase.from('notifications').update({ read: true })
      .eq('user_id', userId).eq('read', false)
  }

  function typeIcon(type: string) {
    if (type === 'judge_invite') return '⚖'
    if (type === 'participant_added') return '🛼'
    if (type === 'event_published') return '📢'
    return '·'
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Ahora'
    if (mins < 60) return mins + ' min'
    if (hours < 24) return hours + ' h'
    return days + ' d'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <Nav />

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '40px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase' }}>Centro de</div>
          <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>Notificaciones</div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {loading && <div style={{ color: '#444', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Cargando...</div>}

        {!loading && notifs.length === 0 && (
          <div style={{ borderTop: '1px solid #2a2a2a', padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#333', letterSpacing: 3, textTransform: 'uppercase' }}>Sin notificaciones por ahora</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
          {notifs.map(n => (
            <div
              key={n.id}
              onClick={() => n.link && router.push(n.link)}
              style={{
                background: n.read ? '#0a0a0a' : '#111',
                padding: '20px 24px',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                cursor: n.link ? 'pointer' : 'default',
                borderLeft: n.read ? '2px solid transparent' : '2px solid #C9A84C',
              }}
            >
              <div style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{typeIcon(n.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>{n.title}</div>
                  <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>{timeAgo(n.created_at)}</div>
                </div>
                {n.body && <div style={{ color: '#666', fontSize: 13, lineHeight: 1.6 }}>{n.body}</div>}
                {n.link && <div style={{ color: '#C9A84C', fontSize: 11, fontWeight: 700, marginTop: 8, letterSpacing: 2, textTransform: 'uppercase' }}>Ver evento →</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}