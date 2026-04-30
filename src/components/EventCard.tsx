'use client'

import { useRouter } from 'next/navigation'
import type { Event } from '@/lib/supabase'

const STATUS_COLOR: Record<string, string> = {
  draft: '#333',
  published: '#C9A84C',
  active: '#4CAF50',
  finished: '#444',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  published: 'Próximamente',
  active: 'En vivo',
  finished: 'Finalizado',
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function EventCard({ event: ev }: { event: Event }) {
  const router = useRouter()
  const color = STATUS_COLOR[ev.status] ?? '#333'
  const label = STATUS_LABEL[ev.status] ?? ev.status
  const isActive = ev.status === 'active'
  const isEncuentro = (ev as any).event_type === 'encuentro'

  return (
    <div
      onClick={() => router.push(`/eventos/${ev.id}`)}
      style={{
        background: '#0a0a0a',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background .15s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#111'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#0a0a0a'}
    >
      {/* Flyer o placeholder */}
      {ev.flyer_url ? (
        <div style={{ height: 180, background: `url(${ev.flyer_url}) center/cover no-repeat`, borderBottom: '1px solid #2a2a2a', position: 'relative' }}>
          {/* Badge tipo sobre el flyer */}
          <span style={{
            position: 'absolute', top: 10, left: 10,
            fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
            padding: '3px 8px', background: '#0a0a0a',
            color: isEncuentro ? '#888' : '#C9A84C',
            border: `1px solid ${isEncuentro ? '#333' : '#C9A84C55'}`,
          }}>
            {isEncuentro ? '🛼 Encuentro' : '🏆 Competencia'}
          </span>
        </div>
      ) : (
        <div style={{ height: 180, background: '#111', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#2a2a2a', textTransform: 'uppercase' }}>Sin flyer</span>
          {/* Badge tipo sobre el placeholder */}
          <span style={{
            position: 'absolute', top: 10, left: 10,
            fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
            padding: '3px 8px', background: '#0a0a0a',
            color: isEncuentro ? '#888' : '#C9A84C',
            border: `1px solid ${isEncuentro ? '#333' : '#C9A84C55'}`,
          }}>
            {isEncuentro ? '🛼 Encuentro' : '🏆 Competencia'}
          </span>
        </div>
      )}

      <div style={{ padding: 24 }}>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} />}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color, textTransform: 'uppercase' }}>
            {label}
          </span>
        </div>

        {/* Nombre */}
        <div style={{ color: '#e8e8e8', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 14 }}>
          {ev.name}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ev.event_date && (
            <div style={{ color: '#666', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
              {formatDate(ev.event_date)}{ev.event_time ? ' · ' + ev.event_time.slice(0, 5) : ''}
            </div>
          )}
          {ev.city && (
            <div style={{ color: '#666', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
              {ev.location_name ? ev.location_name + ' · ' : ''}{ev.city}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div style={{ position: 'absolute', bottom: 24, right: 24, color: '#C9A84C', fontSize: 18, fontWeight: 900 }}>→</div>
      </div>
    </div>
  )
}