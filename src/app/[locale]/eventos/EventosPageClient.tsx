'use client'

import { useTranslations } from 'next-intl'
import Nav from '@/components/Nav'
import EventCard from '@/components/EventCard'
import type { Event } from '@/lib/supabase'

export default function EventosPageClient({ events }: { events: Event[] }) {
  const t = useTranslations('EventosPage')

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ color: '#e8e8e8', fontSize: 28, fontWeight: 900, marginBottom: 8, textTransform: 'uppercase', letterSpacing: -0.5 }}>
          {t('title')}
        </h1>
        <p style={{ color: '#444', fontSize: 13, marginBottom: 32, letterSpacing: 1 }}>
          {t('subtitle')}
        </p>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#334155' }}>
            <div style={{ fontSize: 16 }}>{t('empty')}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {events.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        )}
      </main>
    </>
  )
}