import { supabase } from '@/lib/supabase'
import EventCard from '@/components/EventCard'
import Nav from '@/components/Nav'
import type { Event } from '@/lib/supabase'

export const revalidate = 60

async function getAllEvents(): Promise<Event[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('status', ['published', 'active', 'finished'])
    .order('event_date', { ascending: false })
  return data ?? []
}

export default async function EventosPage() {
  const events = await getAllEvents()

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ color: '#e8e8e8', fontSize: 28, fontWeight: 900, marginBottom: 8, textTransform: 'uppercase', letterSpacing: -0.5 }}>
          Eventos
        </h1>
        <p style={{ color: '#444', fontSize: 13, marginBottom: 32, letterSpacing: 1 }}>
          Competencias y encuentros de quad skate registrados en la plataforma.
        </p>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#334155' }}>
            <div style={{ fontSize: 16 }}>No hay eventos publicados todavía</div>
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