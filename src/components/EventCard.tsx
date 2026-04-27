'use client'

import { useRouter } from 'next/navigation'
import type { Event } from '@/lib/supabase'

const STATUS_COLOR: Record<string, string> = {
  draft: '#64748b',
  published: '#4f46e5',
  active: '#22c55e',
  finished: '#94a3b8',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  published: 'Próximamente',
  active: 'En vivo 🔴',
  finished: 'Finalizado',
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function EventCard({ event: ev }: { event: Event }) {
  const router = useRouter()
  const color = STATUS_COLOR[ev.status] ?? '#64748b'
  const label = STATUS_LABEL[ev.status] ?? ev.status

  return (
    <div
      onClick={() => router.push(`/eventos/${ev.id}`)}
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px #0005'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'none'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      {/* Imagen / placeholder */}
      {ev.flyer_url ? (
        <div style={{ height: 150, background: `url(${ev.flyer_url}) center/cover no-repeat` }} />
      ) : (
        <div style={{ height: 150, background: 'linear-gradient(135deg,#1e1b4b,#312e81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>
          🛼
        </div>
      )}

      <div style={{ padding: 16 }}>
        {/* Badge estado */}
        <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
          {label}
        </span>

        {/* Nombre */}
        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, margin: '10px 0 6px', lineHeight: 1.3 }}>
          {ev.name}
        </div>

        {/* Fecha */}
        {ev.event_date && (
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 3 }}>
            📅 {formatDate(ev.event_date)}{ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : ''}
          </div>
        )}

        {/* Lugar */}
        {ev.city && (
          <div style={{ color: '#64748b', fontSize: 12 }}>
            📍 {ev.location_name ? `${ev.location_name}, ` : ''}{ev.city}
            {ev.country && ev.country !== 'AR' ? `, ${ev.country}` : ''}
          </div>
        )}
      </div>
    </div>
  )
}