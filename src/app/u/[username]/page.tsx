'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

const GOLD = '#C9A84C'

const statusLabel: Record<string, string> = {
  draft: 'Borrador', published: 'Publicado', active: 'En vivo', finished: 'Finalizado'
}
const statusColor: Record<string, string> = {
  draft: '#333', published: '#C9A84C', active: '#4CAF50', finished: '#555'
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params?.username as string

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    if (!username) return
    load()
  }, [username])

  async function load() {
    setLoading(true)

    // 1. Buscar perfil por username
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!prof) { setLoading(false); return }
    setProfile(prof)

    // 2. Buscar participaciones con evento y categoría
    const { data: parts } = await supabase
      .from('participants')
      .select(`
        id, status, category_id,
        events ( id, name, event_date, city, country, status, flyer_url ),
        categories ( name, format )
      `)
      .eq('profile_id', prof.id)
      .order('created_at', { ascending: false })

    setEvents(parts ?? [])
    setLoading(false)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const finishedEvents = events.filter(e => e.events?.status === 'finished').length
  const totalEvents    = events.filter(e => e.events).length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ padding: 80, textAlign: 'center', color: '#444', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>
        Cargando...
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: GOLD, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>
          Perfil no encontrado
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', marginBottom: 24 }}>
          @{username} no existe
        </div>
        <button
          onClick={() => router.push('/eventos')}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '10px 24px', color: '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}
        >
          Ver eventos
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <Nav />

      {/* ── HERO ── */}
      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{
              width: 88, height: 88, background: GOLD, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 32, fontWeight: 900, color: '#000' }}>{initials}</span>
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, textTransform: 'uppercase', marginBottom: 6 }}>
                Perfil
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5, lineHeight: 1, marginBottom: 6 }}>
                {profile.full_name || 'Sin nombre'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {profile.username && (
                  <span style={{ fontSize: 12, color: '#555', fontWeight: 700, letterSpacing: 1 }}>
                    @{profile.username}
                  </span>
                )}
                {profile.country && (
                  <span style={{ fontSize: 12, color: '#444', letterSpacing: 1 }}>
                    {profile.country}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          {totalEvents > 0 && (
            <div style={{ display: 'flex', gap: 1, background: '#1a1a1a', marginTop: 32 }}>
              <div style={{ flex: 1, padding: '16px 20px', background: '#0f0f0f', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{totalEvents}</div>
                <div style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>
                  Eventos
                </div>
              </div>
              <div style={{ flex: 1, padding: '16px 20px', background: '#0f0f0f', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#e8e8e8', lineHeight: 1 }}>{finishedEvents}</div>
                <div style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>
                  Completados
                </div>
              </div>
              <div style={{ flex: 1, padding: '16px 20px', background: '#0f0f0f', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#e8e8e8', lineHeight: 1 }}>
                  {[...new Set(events.map(e => e.categories?.name).filter(Boolean))].length}
                </div>
                <div style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>
                  Categorías
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── HISTORIAL ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>
          Historial de eventos
        </div>

        {events.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', borderTop: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: 11, color: '#2a2a2a', letterSpacing: 3, textTransform: 'uppercase' }}>
              Sin eventos registrados
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#1a1a1a' }}>
            {events.map((part: any) => {
              const ev  = part.events
              const cat = part.categories
              if (!ev) return null
              const dateStr = ev.event_date
                ? new Date(ev.event_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
                : null

              return (
                <div
                  key={part.id}
                  onClick={() => router.push('/eventos/' + ev.id)}
                  style={{
                    background: '#0a0a0a', padding: '18px 20px',
                    display: 'flex', alignItems: 'center', gap: 16,
                    cursor: 'pointer',
                    borderLeft: ev.status === 'active' ? `3px solid ${GOLD}` : '3px solid transparent',
                  }}
                >
                  {/* Fecha vertical */}
                  {dateStr && (
                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 40 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#e8e8e8', lineHeight: 1 }}>
                        {new Date(ev.event_date).getDate()}
                      </div>
                      <div style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {new Date(ev.event_date).toLocaleDateString('es-AR', { month: 'short' })}
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {cat && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' }}>
                          {cat.name}
                        </span>
                      )}
                      {ev.city && (
                        <span style={{ fontSize: 10, color: '#444', letterSpacing: 1 }}>
                          {ev.city}{ev.country ? ', ' + ev.country : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: statusColor[ev.status] ?? '#444', textTransform: 'uppercase' }}>
                      {statusLabel[ev.status] ?? ev.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}