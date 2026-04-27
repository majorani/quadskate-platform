import { supabase } from '@/lib/supabase'
import EventCard from '@/components/EventCard'
import Nav from '@/components/Nav'
import type { Event } from '@/lib/supabase'

export const revalidate = 60

async function getUpcomingEvents(): Promise<Event[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('status', ['published', 'active'])
    .order('event_date', { ascending: true })
    .limit(6)
  return data ?? []
}

export default async function HomePage() {
  const events = await getUpcomingEvents()

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg,#0f0c29,#1e1b4b,#0f172a)', padding: '80px 20px 60px', textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🛼</div>
          <h1 style={{ color: '#e2e8f0', fontSize: 42, fontWeight: 900, marginBottom: 16, letterSpacing: -1 }}>
            QuadSkate Platform
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 18, maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.6 }}>
            La plataforma oficial de competencias de quad skate. Resultados en tiempo real, transparencia total.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/eventos" style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 12, padding: '14px 32px', color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none', display: 'inline-block' }}>
              Ver eventos
            </a>
            <a href="/auth" style={{ background: '#ffffff10', border: '1px solid #ffffff20', borderRadius: 12, padding: '14px 32px', color: '#e2e8f0', fontWeight: 700, fontSize: 16, textDecoration: 'none', display: 'inline-block' }}>
              Crear cuenta
            </a>
          </div>
        </div>

        {/* Próximos eventos */}
        {events.length > 0 && (
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px' }}>
            <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 20 }}>
              PRÓXIMOS EVENTOS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
              {events.map(ev => <EventCard key={ev.id} event={ev} />)}
            </div>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href="/eventos" style={{ color: '#818cf8', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Ver todos los eventos →
              </a>
            </div>
          </div>
        )}

        {/* Features */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
          {[
            ['🏆', 'Resultados en vivo', 'Puntajes actualizados en tiempo real durante la competencia.'],
            ['⚖️', '3 jueces, 1 resultado', 'Sistema promediado entre jueces para máxima imparcialidad.'],
            ['📱', 'App para jueces', 'Interfaz optimizada para puntuar desde el celular en vivo.'],
            ['🔔', 'Notificaciones', 'Te avisamos cuando te invitan como jurado o participante.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ background: '#ffffff08', border: '1px solid #ffffff10', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</div>
              <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}