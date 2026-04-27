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
      <main style={{ background: '#0a0a0a', minHeight: '100vh' }}>

        {/* HERO */}
        <div style={{ borderBottom: '1px solid #2a2a2a', padding: '80px 24px 72px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 24, textTransform: 'uppercase' }}>
              Plataforma oficial · Competencias de Quad Skate
            </div>
            <h1 style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 900, lineHeight: 1, letterSpacing: -2, textTransform: 'uppercase', marginBottom: 32 }}>
              <span style={{ color: '#e8e8e8' }}>QUAD</span>
              <br />
              <span style={{ color: '#C9A84C' }}>SKATE</span>
              <br />
              <span style={{ color: '#e8e8e8' }}>PLATFORM.</span>
            </h1>
            <p style={{ color: '#666', fontSize: 16, maxWidth: 480, lineHeight: 1.7, marginBottom: 40 }}>
              Gestiona tu evento en un solo lugar.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/eventos" style={{
                background: '#C9A84C', border: 'none', padding: '14px 32px',
                color: '#000', fontWeight: 900, fontSize: 11, textDecoration: 'none',
                letterSpacing: 3, textTransform: 'uppercase', display: 'inline-block',
              }}>
                Ver eventos
              </a>
              <a href="/auth" style={{
                background: 'transparent', border: '1px solid #2a2a2a', padding: '14px 32px',
                color: '#e8e8e8', fontWeight: 700, fontSize: 11, textDecoration: 'none',
                letterSpacing: 3, textTransform: 'uppercase', display: 'inline-block',
              }}>
                Iniciar sesion
              </a>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div style={{ borderBottom: '1px solid #2a2a2a', padding: '0 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap' }}>
            {[
              ['3', 'Jueces por evento'],
              ['100%', 'Transparencia'],
              ['Tiempo real', 'Resultados en vivo'],
              ['Argentina', 'Origen'],
            ].map(([val, label]) => (
              <div key={label} style={{ flex: '1 1 200px', padding: '28px 24px', borderRight: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#C9A84C', letterSpacing: -1 }}>{val}</div>
                <div style={{ fontSize: 11, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* EVENTOS */}
        {events.length > 0 && (
          <div style={{ padding: '64px 24px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase' }}>Próximos eventos</div>
                  <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>Competencias</div>
                </div>
                <a href="/eventos" style={{ color: '#C9A84C', fontSize: 11, fontWeight: 700, letterSpacing: 2, textDecoration: 'none', textTransform: 'uppercase' }}>
                  Ver todos →
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 1, background: '#2a2a2a' }}>
                {events.map(ev => <EventCard key={ev.id} event={ev} />)}
              </div>
            </div>
          </div>
        )}

        {/* FEATURES */}
        <div style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 40, textTransform: 'uppercase' }}>Por qué QuadSkate Platform</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 1, background: '#2a2a2a' }}>
              {[
                ['01', 'Portal de eventos', 'Es un lugar más accesible para visibilizar tu evento'],
                ['02', '3 jueces, 1 resultado', 'Sistema promediado entre jueces para máxima imparcialidad.'],
                ['03', 'App para jueces', 'Interfaz optimizada para puntuar desde el celular en vivo.'],
                ['04', 'Notificaciones', 'Te avisamos cuando te invitan como jurado o participante.'],
              ].map(([num, title, desc]) => (
                <div key={num} style={{ background: '#0a0a0a', padding: 32 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#1a1a1a', letterSpacing: -2, marginBottom: 16 }}>{num}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#e8e8e8', marginBottom: 10 }}>{title}</div>
                  <div style={{ color: '#666', fontSize: 13, lineHeight: 1.6 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #2a2a2a', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#333', letterSpacing: 2, textTransform: 'uppercase' }}>
            © 2025 QuadSkate Platform · Argentina
          </div>
          <div style={{ fontSize: 11, color: '#333', letterSpacing: 2, textTransform: 'uppercase' }}>
            Powered by Majorani
          </div>
        </div>

      </main>
    </>
  )
}