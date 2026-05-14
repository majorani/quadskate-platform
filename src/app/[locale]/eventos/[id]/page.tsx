'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import JudgeButton from '@/components/JudgeButton'
import InscripcionButton from '@/components/InscripcionButton'

const GOLD = '#C9A84C'

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

async function tryAutoActivate(ev: any): Promise<boolean> {
  if (ev.status !== 'published' || !ev.event_date) return false
  const timeStr = ev.event_time ? ev.event_time.slice(0, 5) : '00:00'
  if (new Date(`${ev.event_date}T${timeStr}:00`) > new Date()) return false
  try {
    const res = await fetch('/api/events/auto-activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: ev.id }) })
    const data = await res.json()
    return (data.activated ?? 0) > 0
  } catch { return false }
}

function calcScore(participantId: string, scores: any[], cat: any): number | null {
  const judgeIds = [...new Set(scores.map((s: any) => s.judge_id))] as string[]
  const jScores = judgeIds.map(jId => {
    const runs = scores.filter((s: any) => s.judge_id === jId && s.participant_id === participantId)
    if (!runs.length) return null
    if (cat.format === 'jam') {
      return runs.reduce((sum: number, r: any) => {
        const tricks = Array.isArray(r.tricks) ? r.tricks : (r.tricks?.tricks ?? [])
        const fluidez = r.tricks?.fluidez ?? 5
        const creatividad = r.tricks?.creatividad ?? 5
        return sum + tricks.reduce((s: number, t: any) => s + (t.nivel || 0), 0) + (fluidez - 5) + (creatividad - 5)
      }, 0)
    }
    if (cat.format === 'best_trick') {
      const allTricks = runs.flatMap((r: any) => r.tricks || [])
      return allTricks.length ? Math.max(...allTricks.map((t: any) => t._score || 0)) : null
    }
    const totals = runs.map((r: any) => (r.tricks || []).reduce((s: number, t: any) => s + (t._score || 0), 0))
    if (cat.consolidation === 'best_run') return Math.max(...totals)
    return totals.reduce((a: number, b: number) => a + b, 0)
  }).filter((x): x is number => x !== null)
  if (!jScores.length) return null
  return jScores.reduce((a, b) => a + b, 0) / jScores.length
}

function getBestTricks(participantId: string, scores: any[]) {
  return scores
    .filter((s: any) => s.participant_id === participantId)
    .flatMap((s: any) => s.tricks || [])
    .filter((t: any) => t.nombre)
    .sort((a: any, b: any) => (b._score || 0) - (a._score || 0))
    .slice(0, 5)
}

const STATUS_COLOR: Record<string, string> = { draft: '#333', published: GOLD, active: '#4CAF50', finished: '#666' }
const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', published: 'Próximamente', active: 'En vivo', finished: 'Finalizado' }
const FORMAT_LABEL: Record<string, string> = { formal: 'Torneo Formal', jam: 'Jam', mixto: 'Mixto', best_trick: 'Best Trick' }

export default function EventoDetailPage() {
  const params = useParams<{ id: string }>()
  const [ev, setEv]           = useState<any>(null)
  const [cats, setCats]       = useState<any[]>([])
  const [parts, setParts]     = useState<any[]>([])
  const [judges, setJudges]   = useState<any[]>([])
  const [scores, setScores]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function loadParts() {
    const { data } = await supabase.from('participants').select('*, profiles(full_name)').eq('event_id', params.id)
    if (data) setParts(data)
  }

  useEffect(() => {
    if (!params?.id) return

    async function load() {
      const [evRes, catsRes, partsRes, judgesRes, scRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', params.id).single(),
        supabase.from('categories').select('*').eq('event_id', params.id),
        supabase.from('participants').select('*, profiles(full_name)').eq('event_id', params.id),
        supabase.from('judges').select('*, profiles(full_name, avatar_url)').eq('event_id', params.id),
        supabase.from('scorecards').select('*').eq('event_id', params.id),
      ])
      let eventData = evRes.data
      if (eventData?.status === 'published') {
        const activated = await tryAutoActivate(eventData)
        if (activated) eventData = { ...eventData, status: 'active' }
      }
      setEv(eventData); setCats(catsRes.data ?? []); setParts(partsRes.data ?? [])
      setJudges(judgesRes.data ?? []); setScores(scRes.data ?? []); setLoading(false)
    }
    load()

    const channel = supabase.channel(`event-scores-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecards', filter: `event_id=eq.${params.id}` },
        async () => { const { data } = await supabase.from('scorecards').select('*').eq('event_id', params.id); if (data) setScores(data) })
      .subscribe()

    const evChannel = supabase.channel(`event-status-${params.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${params.id}` },
        (payload) => { if (payload.new) setEv((prev: any) => ({ ...prev, ...payload.new })) })
      .subscribe()

    return () => { supabase.removeChannel(channel); supabase.removeChannel(evChannel) }
  }, [params?.id])

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0a' }}><Nav /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}><div style={{ fontSize: 11, color: '#333', letterSpacing: 4, textTransform: 'uppercase' }}>Cargando...</div></div></div>
  if (!ev) return <div style={{ minHeight: '100vh', background: '#0a0a0a' }}><Nav /><div style={{ textAlign: 'center', padding: 80, color: '#ef4444' }}>Evento no encontrado</div></div>

  const color = STATUS_COLOR[ev.status] ?? '#333'
  const label = STATUS_LABEL[ev.status] ?? ev.status
  const isLive = ev.status === 'active'
  const hasResults = ev.status === 'active' || ev.status === 'finished'
  const isEncuentro = ev.event_type === 'encuentro'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <Nav />

      {/* HEADER */}
      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <a href="/eventos" style={{ color: '#444', fontSize: 11, textDecoration: 'none', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'inline-block', marginBottom: 24 }}>← Volver</a>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {isLive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} />}
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '2px 7px', border: `1px solid ${isEncuentro ? '#333' : '#C9A84C44'}`, color: isEncuentro ? '#666' : GOLD }}>
                  {isEncuentro ? '🛼 Encuentro' : '🏆 Competencia'}
                </span>
              </div>
              <h1 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1, lineHeight: 1, marginBottom: 20 }}>{ev.name}</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ev.event_date && <div style={{ color: '#666', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>📅 {formatDate(ev.event_date)}{ev.event_time ? ' · ' + ev.event_time.slice(0, 5) : ''}</div>}
                {ev.city && <div style={{ color: '#666', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>📍 {ev.location_name ? ev.location_name + ' — ' : ''}{ev.city}</div>}
              </div>
              {ev.description && <p style={{ color: '#444', fontSize: 14, marginTop: 20, maxWidth: 520, lineHeight: 1.7 }}>{ev.description}</p>}
            </div>
            {ev.flyer_url && <div style={{ width: 180, height: 240, flexShrink: 0, background: `url(${ev.flyer_url}) center/cover`, border: '1px solid #2a2a2a' }} />}
          </div>

          {/* Acciones */}
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <JudgeButton eventId={params.id} ownerId={ev.owner_id} />
            {!isEncuentro && (
              <InscripcionButton
                eventId={params.id}
                cats={cats}
                eventStatus={ev.status}
                onRegistered={loadParts}
              />
            )}
          </div>
        </div>
      </div>

      {/* JURADO / ORGANIZADORES */}
      {judges.length > 0 && (
        <div style={{ borderBottom: '1px solid #2a2a2a', padding: '40px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>
              {isEncuentro ? 'Organizadores' : 'Jurado'}
            </div>
            <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', flexWrap: 'wrap' }}>
              {judges.map((j: any) => (
                <div key={j.id} style={{ background: '#0a0a0a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 13, fontWeight: 900 }}>
                    {j.profiles?.full_name?.[0] ?? '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>{j.profiles?.full_name ?? (isEncuentro ? 'Organizador' : 'Juez')}</div>
                    <div style={{ fontSize: 10, color: j.status === 'accepted' ? '#4CAF50' : GOLD, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>{j.status === 'accepted' ? 'Confirmado' : 'Invitado'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Publicado: lista categorías + inscriptos */}
          {ev.status === 'published' && (
            <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 40 }}>
              {!isEncuentro && cats.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>Categorías</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 40 }}>
                    {cats.map((cat: any) => {
                      const count = parts.filter((p: any) => p.category_id === cat.id).length
                      return (
                        <div key={cat.id} style={{ background: '#0a0a0a', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.3 }}>{cat.name}</div>
                            <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>{FORMAT_LABEL[cat.format] ?? cat.format}</div>
                          </div>
                          <div style={{ fontSize: 11, color: '#555', letterSpacing: 1 }}>{count} inscripto{count !== 1 ? 's' : ''}</div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 8 }}>Próximamente</div>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: 1 }}>
                  {ev.event_date ? `El evento comienza el ${formatDate(ev.event_date)}${ev.event_time ? ' a las ' + ev.event_time.slice(0, 5) : ''}` : 'Fecha por confirmar'}
                </div>
              </div>
            </div>
          )}

          {ev.status === 'draft' && (
            <div style={{ textAlign: 'center', padding: '48px 24px', borderTop: '1px solid #2a2a2a' }}>
              <div style={{ fontSize: 11, color: '#333', letterSpacing: 3, textTransform: 'uppercase' }}>Evento en preparación</div>
            </div>
          )}

          {/* Active / Finished: resultados */}
          {hasResults && (
            <>
              {cats.length === 0 && <div style={{ color: '#333', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', padding: '40px 0' }}>Sin categorías configuradas</div>}
              {cats.map(cat => {
                const catParts = parts
                  .filter((p: any) => p.category_id === cat.id)
                  .map((p: any) => ({ ...p, score: calcScore(p.id, scores, cat) }))
                  .sort((a: any, b: any) => (b.score ?? -1) - (a.score ?? -1))
                return (
                  <div key={cat.id} style={{ marginBottom: 48 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #2a2a2a' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{cat.name}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', border: '1px solid #C9A84C44', padding: '3px 10px' }}>{FORMAT_LABEL[cat.format] ?? cat.format}</span>
                    </div>
                    {catParts.length === 0
                      ? <div style={{ color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Sin participantes</div>
                      : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
                          {catParts.map((p: any, i: number) => (
                            <div key={p.id} style={{ background: '#0a0a0a', padding: '16px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ fontSize: 22, fontWeight: 900, width: 32, color: i === 0 ? GOLD : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#333', flexShrink: 0 }}>{p.score !== null ? i + 1 : '—'}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3 }}>{p.profiles?.full_name || p.display_name}</div>
                                  {cat.format === 'best_trick' && (
                                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                      {getBestTricks(p.id, scores).map((t: any, ti: number) => (
                                        <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>{t.nombre}</span>
                                          <span style={{ fontSize: 11, fontWeight: 700, color: ti === 0 ? GOLD : '#666' }}>{(t._score || 0).toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: p.score !== null ? 24 : 16, fontWeight: 900, color: p.score !== null ? GOLD : '#333', flexShrink: 0 }}>{p.score !== null ? p.score.toFixed(2) : '—'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}