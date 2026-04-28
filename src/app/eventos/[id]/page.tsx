import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import type { Category, Participant } from '@/lib/supabase'

export const revalidate = 30

async function getEvent(id: string) {
  const { data } = await supabase.from('events').select('*').eq('id', id).single()
  return data
}
async function getCategories(eventId: string): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').eq('event_id', eventId)
  return data ?? []
}
async function getParticipants(eventId: string): Promise<Participant[]> {
  const { data } = await supabase.from('participants').select('*').eq('event_id', eventId)
  return data ?? []
}
async function getJudges(eventId: string) {
  const { data } = await supabase
    .from('judges')
    .select('*, profiles(full_name, avatar_url)')
    .eq('event_id', eventId)
  return data ?? []
}
async function getScorecards(eventId: string) {
  const { data } = await supabase.from('scorecards').select('*').eq('event_id', eventId)
  return data ?? []
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function calcScore(participantId: string, scores: any[], cat: Category): number | null {
  const judgeIds = [...new Set(scores.map((s: any) => s.judge_id))] as string[]
  const jScores = judgeIds.map(jId => {
    const runs = scores.filter((s: any) => s.judge_id === jId && s.participant_id === participantId)
    if (!runs.length) return null
    if (cat.format === 'jam') {
      return runs.reduce((sum: number, r: any) =>
        sum + (r.tricks || []).reduce((s: number, t: any) => s + (t.nivel || 0), 0), 0)
    }
    const totals = runs.map((r: any) =>
      (r.tricks || []).reduce((s: number, t: any) => s + (t._score || 0), 0))
    if (cat.consolidation === 'best_run') return Math.max(...totals)
    return totals.reduce((a: number, b: number) => a + b, 0)
  }).filter((x): x is number => x !== null)
  if (!jScores.length) return null
  return jScores.reduce((a, b) => a + b, 0) / jScores.length
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#64748b', published: '#4f46e5', active: '#22c55e', finished: '#94a3b8'
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', published: 'Próximamente', active: 'En vivo 🔴', finished: 'Finalizado'
}
const FORMAT_LABEL: Record<string, string> = {
  formal: 'Torneo Formal', jam: 'Jam', mixto: 'Mixto'
}

export default async function EventoDetailPage({ params }: { params: { id: string } }) {
  const [ev, cats, parts, judges, scores] = await Promise.all([
    getEvent(params.id),
    getCategories(params.id),
    getParticipants(params.id),
    getJudges(params.id),
    getScorecards(params.id),
  ])

  if (!ev) {
    return (
      <div>
        <Nav />
        <div style={{ textAlign: 'center', padding: 80, color: '#ef4444' }}>Evento no encontrado</div>
      </div>
    )
  }

  const color = STATUS_COLOR[ev.status] ?? '#64748b'
  const label = STATUS_LABEL[ev.status] ?? ev.status
  const isActive = ev.status === 'active' || ev.status === 'finished'
  const juecesUrl = '/jueces/' + params.id

  return (
    <div>
      <Nav />
      <main>
        <div style={{
          background: 'linear-gradient(135deg,#1e1b4b,#0f172a)',
          padding: '48px 20px 40px'
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <a href="/eventos" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
              ← Volver a eventos
            </a>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span style={{ background: color + '22', color, border: '1px solid ' + color + '44', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                  {label}
                </span>
                <h1 style={{ color: '#e2e8f0', fontSize: 34, fontWeight: 900, margin: '14px 0 10px', letterSpacing: -0.5 }}>
                  {ev.name}
                </h1>
                {ev.event_date && (
                  <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 6 }}>
                    📅 {formatDate(ev.event_date)}{ev.event_time ? ' a las ' + ev.event_time.slice(0, 5) : ''}
                  </div>
                )}
                {ev.city && (
                  <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 6 }}>
                    📍 {ev.location_name ? ev.location_name + ' — ' : ''}{ev.city}
                  </div>
                )}
                {ev.description && (
                  <p style={{ color: '#64748b', fontSize: 14, marginTop: 14, maxWidth: 520, lineHeight: 1.6 }}>
                    {ev.description}
                  </p>
                )}
              </div>
              {isActive && (
                <a
                  href={juecesUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', borderRadius: 12, padding: '12px 22px', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}
                >
                  🛼 App de jueces
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 20px 60px' }}>

          {judges.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>
                JURADO
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {judges.map((j: any) => (
                  <div key={j.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: j.profiles?.avatar_url ? 'url(' + j.profiles.avatar_url + ') center/cover' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0
                    }}>
                      {!j.profiles?.avatar_url && (j.profiles?.full_name?.[0] ?? '?')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>
                        {j.profiles?.full_name ?? 'Juez'}
                      </div>
                      <div style={{ fontSize: 11, color: j.status === 'accepted' ? '#22c55e' : '#f59e0b' }}>
                        {j.status === 'accepted' ? 'Confirmado' : 'Invitado'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cats.length === 0 && (
            <div style={{ color: '#334155', textAlign: 'center', padding: 40 }}>
              Sin categorías configuradas todavía
            </div>
          )}

          {cats.map(cat => {
            const catParts = parts
              .filter(p => p.category_id === cat.id)
              .map(p => ({ ...p, score: calcScore(p.id, scores, cat) }))
              .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))

            return (
              <div key={cat.id} style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
                    {cat.name.toUpperCase()}
                  </div>
                  <span style={{ background: '#0891b222', color: '#0891b2', border: '1px solid #0891b244', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {FORMAT_LABEL[cat.format]}
                  </span>
                </div>

                {catParts.length === 0 ? (
                  <div style={{ color: '#334155', fontSize: 14 }}>Sin participantes cargados</div>
                ) : (
                  catParts.map((p, i) => (
                    <div key={p.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '14px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, width: 30, color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#475569' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, fontWeight: 600, color: '#e2e8f0' }}>
                        {p.display_name}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: p.score !== null ? '#22c55e' : '#334155' }}>
                        {p.score !== null ? p.score.toFixed(2) : '—'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}