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
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data ?? [])
    setLoading(false)

    // Marcar todas como leídas
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  }

  function typeIcon(type: string) {
    if (type === 'judge_invite') return '⚖️'
    if (type === 'participant_added') return '🛼'
    if (type === 'event_published') return '📢'
    return '🔔'
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
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Nav />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 28 }}>Notificaciones</h1>

        {loading && <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>Cargando...</div>}

        {!loading && notifs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
            <div style={{ fontSize: 16 }}>Sin notificaciones por ahora</div>
          </div>
        )}

        {notifs.map(n => (
          <div
            key={n.id}
            onClick={() => n.link && router.push(n.link)}
            style={{
              background: n.read ? '#1e293b' : '#1e1b4b',
              border: '1px solid ' + (n.read ? '#334155' : '#4338ca'),
              borderRadius: 14,
              padding: '16px 18px',
              marginBottom: 10,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              cursor: n.link ? 'pointer' : 'default',
              transition: 'transform .15s',
            }}
            onMouseEnter={e => { if (n.link) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
          >
            <div style={{ fontSize: 26, flexShrink: 0 }}>{typeIcon(n.type)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{n.title}</div>
                <div style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>{timeAgo(n.created_at)}</div>
              </div>
              {n.body && (
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{n.body}</div>
              )}
              {n.link && (
                <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
                  Ver evento →
                </div>
              )}
            </div>
            {!n.read && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', flexShrink: 0, marginTop: 6 }} />
            )}
          </div>
        ))}
      </main>
    </div>
  )
}