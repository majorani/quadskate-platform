'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import JudgeButton from '@/components/JudgeButton'
import InscripcionButton from '@/components/InscripcionButton'
import { REGLAMENTO_ES_URL, REGLAMENTO_EN_URL, REGLAMENTO_FR_URL } from '@/lib/supabase'

const GOLD = '#D4B45A'

function formatDate(d: string | null) {
  if (!d) return null
  const date = new Date(d)
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${date.getUTCDate().toString().padStart(2,'0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

async function tryAutoActivate(ev: any): Promise<boolean> {
  if (ev.status !== 'published' || !ev.event_date) return false
  const timeStr = ev.event_time ? ev.event_time.slice(0, 5) : '00:00'
  if (new Date(`${ev.event_date}T${timeStr}:00`) > new Date()) return false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false
    const res = await fetch('/api/events/auto-activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ eventId: ev.id }),
    })
    const data = await res.json()
    return (data.activated ?? 0) > 0
  } catch { return false }
}

// ─────────────────────────────────────────────────────────────
// Helpers de puntaje JAM por pasada
// ─────────────────────────────────────────────────────────────
function calcJamRunScore(participantId: string, scores: any[], run: number): number | null {
  const judgeIds = [...new Set(scores.filter((s: any) => s.run === run).map((s: any) => s.judge_id))] as string[]
  const jScores = judgeIds.map(jId => {
    const sc = scores.find((s: any) => s.judge_id === jId && s.participant_id === participantId && s.run === run)
    if (!sc) return null
    const tricks = Array.isArray(sc.tricks) ? sc.tricks : (sc.tricks?.tricks ?? [])
    const fluidez = sc.tricks?.fluidez ?? 5
    const creatividad = sc.tricks?.creatividad ?? 5
    const exitosos = tricks.filter((t: any) => t.nivel > 0)
    const total = exitosos.length > 0 ? exitosos.reduce((s: number, t: any) => s + (t.nivel || 0), 0) : 0
    return total + (fluidez - 5) + (creatividad - 5)
  }).filter((x): x is number => x !== null)
  if (!jScores.length) return null
  return jScores.reduce((a, b) => a + b, 0) / jScores.length
}

// ─────────────────────────────────────────────────────────────
// Puntaje clasificación (run=1 para formal/best_trick; mejor de run=1 y run=2 para JAM)
// ─────────────────────────────────────────────────────────────
function calcQualScore(participantId: string, scores: any[], cat: any): number | null {
  // JAM: mejor pasada entre run=1 y run=2
  if (cat.format === 'jam') {
    const run1 = calcJamRunScore(participantId, scores, 1)
    const run2 = calcJamRunScore(participantId, scores, 2)
    if (run1 === null && run2 === null) return null
    return Math.max(run1 ?? -Infinity, run2 ?? -Infinity)
  }

  const judgeIds = [...new Set(scores.filter((s: any) => s.run === 1).map((s: any) => s.judge_id))] as string[]
  const jScores = judgeIds.map(jId => {
    const runs = scores.filter((s: any) => s.judge_id === jId && s.participant_id === participantId && s.run === 1)
    if (!runs.length) return null
    if (cat.format === 'best_trick') {
      const allTricks = runs.flatMap((r: any) => r.tricks || [])
      const exitosos = allTricks.filter((t: any) => t.intencion === true)
      return exitosos.length ? Math.max(...exitosos.map((t: any) => t._score || 0)) : null
    }
    // Formal
    const totals = runs.map((r: any) => {
      const tricks = r.tricks || []
      const exitosos = tricks.filter((t: any) => t.intencion === true)
      if (!exitosos.length) return 0
      return exitosos.reduce((s: number, t: any) => s + (t._score || 0), 0) / exitosos.length
    })
    if (cat.consolidation === 'best_run') return Math.max(...totals)
    return totals.reduce((a: number, b: number) => a + b, 0)
  }).filter((x): x is number => x !== null)
  if (!jScores.length) return null
  return jScores.reduce((a, b) => a + b, 0) / jScores.length
}

// Puntaje pasada final formal (run=2)
function calcFinalRunScore(participantId: string, scores: any[]): number | null {
  const judgeIds = [...new Set(scores.filter((s: any) => s.run === 2).map((s: any) => s.judge_id))] as string[]
  const jScores = judgeIds.map(jId => {
    const runs = scores.filter((s: any) => s.judge_id === jId && s.participant_id === participantId && s.run === 2)
    if (!runs.length) return null
    const totals = runs.map((r: any) => {
      const tricks = r.tricks || []
      const exitosos = tricks.filter((t: any) => t.intencion === true)
      if (!exitosos.length) return 0
      return exitosos.reduce((s: number, t: any) => s + (t._score || 0), 0) / exitosos.length
    })
    return Math.max(...totals)
  }).filter((x): x is number => x !== null)
  if (!jScores.length) return null
  return jScores.reduce((a, b) => a + b, 0) / jScores.length
}

// Puntaje pasada final JAM (run=3 cuando no hay best trick)
function calcJamFinalScore(participantId: string, scores: any[]): number | null {
  return calcJamRunScore(participantId, scores, 3)
}

// Puntaje best trick final (run=3)
function calcBestTrickFinalScore(participantId: string, scores: any[]): {
  score: number, meetsRequirement: boolean, successfulTricks: number
} {
  const judgeScores = scores.filter((s: any) => s.participant_id === participantId && s.run === 3)
  if (!judgeScores.length) return { score: 0, meetsRequirement: false, successfulTricks: 0 }

  const trickMap: Record<string, { scores: number[], validCount: number }> = {}
  for (const sc of judgeScores) {
    for (const trick of (sc.tricks || [])) {
      if (!trick.nombre) continue
      if (!trickMap[trick.nombre]) trickMap[trick.nombre] = { scores: [], validCount: 0 }
      if (trick.intencion === true) {
        trickMap[trick.nombre].scores.push(trick._score || 0)
        trickMap[trick.nombre].validCount++
      } else {
        trickMap[trick.nombre].scores.push(0)
      }
    }
  }

  const judgeCount = new Set(judgeScores.map((s: any) => s.judge_id)).size
  const trickScores: Array<{ nombre: string, score: number, valid: boolean }> = []
  for (const [nombre, data] of Object.entries(trickMap)) {
    const avg = data.scores.reduce((a, b) => a + b, 0) / judgeCount
    const valid = data.validCount >= Math.ceil(judgeCount / 2)
    trickScores.push({ nombre, score: avg, valid })
  }

  const validTricks = trickScores.filter(t => t.valid)
  const meetsRequirement = validTricks.length >= 2
  const totalScore = validTricks.reduce((s, t) => s + t.score, 0)
  return { score: totalScore, meetsRequirement, successfulTricks: validTricks.length }
}

function getBestTricksFinal(participantId: string, scores: any[]) {
  const judgeScores = scores.filter((s: any) => s.participant_id === participantId && s.run === 3)
  const trickMap: Record<string, number[]> = {}
  for (const sc of judgeScores) {
    for (const trick of (sc.tricks || [])) {
      if (!trick.nombre) continue
      if (!trickMap[trick.nombre]) trickMap[trick.nombre] = []
      trickMap[trick.nombre].push(trick.intencion ? (trick._score || 0) : 0)
    }
  }
  const judgeCount = new Set(judgeScores.map((s: any) => s.judge_id)).size || 1
  return Object.entries(trickMap)
    .map(([nombre, sc]) => ({ nombre, score: sc.reduce((a, b) => a + b, 0) / judgeCount }))
    .sort((a, b) => b.score - a.score)
}

// ─────────────────────────────────────────────────────────────
// Art. 19 — Desempate por criterio (Ejecución → Dificultad → Estilo)
// Promedia el criterio entre jueces del mejor truco o pasada (run=1)
// ─────────────────────────────────────────────────────────────
function tiebreakScore(participantId: string, scores: any[], criterion: 'ejecucion' | 'dificultad' | 'estilo'): number {
  const judgeIds = [...new Set(scores.filter((s: any) => s.run === 1).map((s: any) => s.judge_id))] as string[]
  const jScores = judgeIds.map(jId => {
    const sc = scores.find((s: any) => s.judge_id === jId && s.participant_id === participantId && s.run === 1)
    if (!sc) return null
    const tricks = Array.isArray(sc.tricks) ? sc.tricks : (sc.tricks?.tricks ?? [])
    const exitosos = tricks.filter((t: any) => t.intencion === true)
    if (!exitosos.length) return 0
    const best = exitosos.reduce((best: any, t: any) => (t._score || 0) > (best._score || 0) ? t : best, exitosos[0])
    return best[criterion] ?? 0
  }).filter((x): x is number => x !== null)
  if (!jScores.length) return 0
  return jScores.reduce((a, b) => a + b, 0) / jScores.length
}

function compareTiebreak(aId: string, bId: string, scores: any[]): number {
  for (const criterion of ['ejecucion', 'dificultad', 'estilo'] as const) {
    const diff = tiebreakScore(bId, scores, criterion) - tiebreakScore(aId, scores, criterion)
    if (Math.abs(diff) > 0.0001) return diff
  }
  return 0
}

function getBestTricks(participantId: string, scores: any[]) {
  return scores
    .filter((s: any) => s.participant_id === participantId && s.run === 1)
    .flatMap((s: any) => s.tricks || [])
    .filter((t: any) => t.nombre && t.intencion === true)
    .sort((a: any, b: any) => (b._score || 0) - (a._score || 0))
    .slice(0, 5)
}

// ─────────────────────────────────────────────────────────────
// Ranking clasificación JAM: muestra mejor pasada de cada uno
// ─────────────────────────────────────────────────────────────
function JamQualRanking({ parts, scores, cat, t }: any) {
  const ranked = parts
    .map((p: any) => {
      const run1 = calcJamRunScore(p.id, scores, 1)
      const run2 = calcJamRunScore(p.id, scores, 2)
      const bestRun = run1 !== null || run2 !== null ? Math.max(run1 ?? -Infinity, run2 ?? -Infinity) : null
      const bestRunNum = bestRun !== null
        ? ((run1 ?? -Infinity) >= (run2 ?? -Infinity) ? 1 : 2)
        : null
      return { ...p, run1, run2, bestRun, bestRunNum }
    })
    .sort((a: any, b: any) => {
      const diff = (b.bestRun ?? -1) - (a.bestRun ?? -1)
      if (Math.abs(diff) > 0.0001) return diff
      return compareTiebreak(a.id, b.id, scores)
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
      {ranked.map((p: any, i: number) => (
        <div key={p.id} style={{ background: '#0a0a0a', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 900, width: 32, color: i === 0 ? GOLD : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#333', flexShrink: 0 }}>
              {p.bestRun !== null ? i + 1 : '—'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3 }}>{p.profiles?.full_name || p.display_name}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                {p.run1 !== null && (
                  <span style={{ fontSize: 10, color: p.bestRunNum === 1 ? GOLD : '#444' }}>
                    P1: {p.run1.toFixed(2)}{p.bestRunNum === 1 ? ' ★' : ''}
                  </span>
                )}
                {p.run2 !== null && (
                  <span style={{ fontSize: 10, color: p.bestRunNum === 2 ? GOLD : '#444' }}>
                    P2: {p.run2.toFixed(2)}{p.bestRunNum === 2 ? ' ★' : ''}
                  </span>
                )}
                {p.run1 === null && p.run2 === null && (
                  <span style={{ fontSize: 10, color: '#333' }}>{t('evNoScore')}</span>
                )}
              </div>
              {cat.phase === 'final' && p.is_finalist && (
                <div style={{ fontSize: 9, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>{t('evFinalist')}</div>
              )}
            </div>
            <div style={{ fontSize: p.bestRun !== null ? 24 : 16, fontWeight: 900, color: p.bestRun !== null ? GOLD : '#333', flexShrink: 0 }}>
              {p.bestRun !== null ? p.bestRun.toFixed(2) : '—'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EventoDetailPage() {
  const params = useParams<{ id: string }>()
  const t = useTranslations('EventoDetailPage')

  const [ev, setEv]           = useState<any>(null)
  const [cats, setCats]       = useState<any[]>([])
  const [parts, setParts]     = useState<any[]>([])
  const [judges, setJudges]   = useState<any[]>([])
  const [scores, setScores]   = useState<any[]>([])
  const [btVotes, setBtVotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const STATUS_COLOR: Record<string, string> = { draft: '#333', published: GOLD, active: '#4CAF50', finished: '#666' }
  const STATUS_LABEL: Record<string, string> = {
    draft: t('statusDraft'), published: t('statusPublished'),
    active: t('statusActive'), finished: t('statusFinished'),
  }
  const FORMAT_LABEL: Record<string, string> = {
    formal: t('formatFormal'), jam: t('formatJam'),
    mixto: t('formatMixto'), best_trick: t('formatBestTrick'),
  }

  async function loadParts() {
    const { data } = await supabase.from('participants').select('*, profiles(full_name)').eq('event_id', params.id)
    if (data) setParts(data)
  }

  useEffect(() => {
    if (!params?.id) return
    async function load() {
      const [evRes, catsRes, partsRes, judgesRes, scRes, btVotesRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', params.id).single(),
        supabase.from('categories').select('*').eq('event_id', params.id),
        supabase.from('participants').select('*, profiles(full_name)').eq('event_id', params.id),
        supabase.from('judges').select('*, profiles(full_name, avatar_url)').eq('event_id', params.id),
        supabase.from('scorecards').select('*').eq('event_id', params.id),
        supabase.from('best_trick_votes').select('*').eq('event_id', params.id),
      ])
      let eventData = evRes.data
      if (eventData?.status === 'published') {
        const activated = await tryAutoActivate(eventData)
        if (activated) eventData = { ...eventData, status: 'active' }
      }
      setEv(eventData); setCats(catsRes.data ?? []); setParts(partsRes.data ?? [])
      setJudges(judgesRes.data ?? []); setScores(scRes.data ?? [])
      setBtVotes(btVotesRes.data ?? [])
      setLoading(false)
    }
    load()

    const channel = supabase.channel(`event-scores-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecards', filter: `event_id=eq.${params.id}` },
        async () => { const { data } = await supabase.from('scorecards').select('*').eq('event_id', params.id); if (data) setScores(data) })
      .subscribe()

    const votesChannel = supabase.channel(`event-btvotes-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'best_trick_votes', filter: `event_id=eq.${params.id}` },
        async () => { const { data } = await supabase.from('best_trick_votes').select('*').eq('event_id', params.id); if (data) setBtVotes(data) })
      .subscribe()

    const evChannel = supabase.channel(`event-status-${params.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${params.id}` },
        (payload) => { if (payload.new) setEv((prev: any) => ({ ...prev, ...payload.new })) })
      .subscribe()

    return () => { supabase.removeChannel(channel); supabase.removeChannel(votesChannel); supabase.removeChannel(evChannel) }
  }, [params?.id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <div style={{ fontSize: 11, color: '#333', letterSpacing: 4, textTransform: 'uppercase' }}>{t('loading')}</div>
      </div>
    </div>
  )

  if (!ev) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ textAlign: 'center', padding: 80, color: '#ef4444' }}>{t('notFound')}</div>
    </div>
  )

  const locale = useLocale()
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
          <a href="/eventos" style={{ color: '#444', fontSize: 11, textDecoration: 'none', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'inline-block', marginBottom: 24 }}>
            {t('back')}
          </a>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {isLive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} />}
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '2px 7px', border: `1px solid ${isEncuentro ? '#333' : '#C9A84C44'}`, color: isEncuentro ? '#666' : GOLD }}>
                  {isEncuentro ? t('badgeEncuentro') : t('badgeCompetencia')}
                </span>
              </div>
              <h1 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1, lineHeight: 1, marginBottom: 20 }}>{ev.name}</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ev.event_date && <div style={{ color: '#666', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>📅 {formatDate(ev.event_date)}{ev.event_time ? ' · ' + ev.event_time.slice(0, 5) : ''}</div>}
                {ev.city && <div style={{ color: '#666', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>📍 {ev.location_name ? ev.location_name + ' — ' : ''}{ev.city}</div>}
              </div>
              {ev.description && <p style={{ color: '#444', fontSize: 14, marginTop: 20, maxWidth: 520, lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{ev.description}</p>}
              {!isEncuentro && (() => {
                const reglamentoBase = locale === 'en' ? REGLAMENTO_EN_URL : locale === 'fr' ? REGLAMENTO_FR_URL : REGLAMENTO_ES_URL
                const url = ev.use_custom_reglamento && ev.reglamento_url ? ev.reglamento_url : reglamentoBase
                const isCustom = ev.use_custom_reglamento && ev.reglamento_url
                return (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid #2a2a2a', padding: '8px 16px', color: '#666', fontWeight: 700, fontSize: 10, textDecoration: 'none', letterSpacing: 2, textTransform: 'uppercase' }}>
                    <span>📄</span>
                    <span>{t('reglamentoTitle')}</span>
                    <span style={{ fontSize: 9, color: isCustom ? GOLD : '#444', border: `1px solid ${isCustom ? '#C9A84C44' : '#333'}`, padding: '1px 6px', letterSpacing: 2 }}>
                      {isCustom ? t('reglamentoCustomBadge') : t('reglamentoStandardBadge')}
                    </span>
                    <span style={{ color: GOLD }}>→</span>
                  </a>
                )
              })()}
            </div>
            {ev.flyer_url && (
              <div style={{ width: 160, flexShrink: 0, alignSelf: 'flex-start', border: '1px solid #2a2a2a', overflow: 'hidden' }}>
                <img src={ev.flyer_url} alt="flyer" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 280, objectFit: 'cover' }} />
              </div>
            )}
          </div>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <JudgeButton eventId={params.id} ownerId={ev.owner_id} />
            {!isEncuentro && (
              <InscripcionButton eventId={params.id} cats={cats} eventStatus={ev.status} onRegistered={loadParts} />
            )}
          </div>
        </div>
      </div>

      {/* JURADO */}
      {judges.length > 0 && (
        <div style={{ borderBottom: '1px solid #2a2a2a', padding: '40px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>
              {isEncuentro ? t('sectionOrganizers') : t('sectionJudges')}
            </div>
            <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', flexWrap: 'wrap' }}>
              {judges.map((j: any) => (
                <div key={j.id} style={{ background: '#0a0a0a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 13, fontWeight: 900 }}>
                    {j.profiles?.full_name?.[0] ?? '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                      {j.profiles?.full_name ?? (isEncuentro ? t('organizerDefaultName') : t('judgeDefaultName'))}
                    </div>
                    <div style={{ fontSize: 10, color: j.status === 'accepted' ? '#4CAF50' : GOLD, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>
                      {j.status === 'accepted' ? t('judgeConfirmed') : t('judgeInvited')}
                    </div>
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

          {ev.status === 'published' && (
            <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 40 }}>
              {!isEncuentro && cats.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>{t('sectionCategories')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 40 }}>
                    {cats.map((cat: any) => {
                      const count = parts.filter((p: any) => p.category_id === cat.id).length
                      return (
                        <div key={cat.id} style={{ background: '#0a0a0a', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.3 }}>{cat.name}</div>
                            <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>{FORMAT_LABEL[cat.format] ?? cat.format}</div>
                          </div>
                          <div style={{ fontSize: 11, color: '#555', letterSpacing: 1 }}>
                            {count !== 1 ? t('inscribedPlural', { count }) : t('inscribed', { count })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 8 }}>{t('comingSoon')}</div>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: 1 }}>
                  {ev.event_date
                    ? ev.event_time
                      ? t('comingSoonDate', { date: formatDate(ev.event_date) ?? '', time: ev.event_time.slice(0, 5) })
                      : t('comingSoonDateNoTime', { date: formatDate(ev.event_date) ?? '' })
                    : t('comingSoonNoDate')}
                </div>
              </div>
            </div>
          )}

          {ev.status === 'draft' && (
            <div style={{ textAlign: 'center', padding: '48px 24px', borderTop: '1px solid #2a2a2a' }}>
              <div style={{ fontSize: 11, color: '#333', letterSpacing: 3, textTransform: 'uppercase' }}>{t('draft')}</div>
            </div>
          )}

          {hasResults && (
            <>
              {cats.length === 0 && (
                <div style={{ color: '#333', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', padding: '40px 0' }}>
                  {t('noCategories')}
                </div>
              )}
              {cats.map(cat => {
                const isJam = cat.format === 'jam'
                const isFinalPhase = cat.phase === 'final'
                const hasBTFinal = cat.has_best_trick_final
                const allCatParts = parts.filter((p: any) => p.category_id === cat.id)

                // ─── RAMA JAM ───────────────────────────────────────────────
                if (isJam) {
                  const finalistParts = isFinalPhase
                    ? allCatParts.filter((p: any) => p.is_finalist)
                    : []

                  // Ranking final JAM con best trick
                  const jamFinalBTRanking = isFinalPhase && hasBTFinal
                    ? finalistParts
                        .map((p: any) => {
                          const qualScore = calcQualScore(p.id, scores, cat) ?? 0
                          const btResult = calcBestTrickFinalScore(p.id, scores)
                          const totalScore = qualScore + btResult.score
                          return { ...p, qualScore, btScore: btResult.score, meetsRequirement: btResult.meetsRequirement, successfulTricks: btResult.successfulTricks, totalScore }
                        })
                        .sort((a: any, b: any) => {
                          if (a.meetsRequirement && !b.meetsRequirement) return -1
                          if (!a.meetsRequirement && b.meetsRequirement) return 1
                          return b.totalScore - a.totalScore
                        })
                    : []

                  // Ranking final JAM con pasada única (run=3)
                  const jamFinalRunRanking = isFinalPhase && !hasBTFinal
                    ? finalistParts
                        .map((p: any) => ({ ...p, finalScore: calcJamFinalScore(p.id, scores) }))
                        .sort((a: any, b: any) => (b.finalScore ?? -1) - (a.finalScore ?? -1))
                    : []

                  return (
                    <div key={cat.id} style={{ marginBottom: 64 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #2a2a2a' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{cat.name}</div>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', border: '1px solid #C9A84C44', padding: '3px 10px' }}>{FORMAT_LABEL[cat.format] ?? cat.format}</span>
                        {isFinalPhase && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: '#4CAF50', textTransform: 'uppercase', border: '1px solid #4CAF5044', padding: '3px 10px' }}>{t('evFinal')}</span>}
                      </div>

                      {/* Ranking clasificación JAM (siempre visible) */}
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 4, color: isFinalPhase ? '#444' : GOLD, marginBottom: 12, textTransform: 'uppercase' }}>
                        {isFinalPhase ? t('evQualification') : t('evRanking')}
                      </div>
                      {allCatParts.length === 0
                        ? <div style={{ color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32 }}>{t('noParticipants')}</div>
                        : <JamQualRanking parts={allCatParts} scores={scores} cat={cat} t={t} />
                      }

                      {/* Ranking final JAM */}
                      {isFinalPhase && (
                        <div style={{ marginTop: 40 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 4, color: '#4CAF50', marginBottom: 12, textTransform: 'uppercase' }}>
                            {hasBTFinal ? t('evFinalLabelBT') : t('evFinalLabelRun')}
                          </div>

                          {hasBTFinal ? (
                            // Final JAM con best trick
                            jamFinalBTRanking.length === 0
                              ? <div style={{ color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noParticipants')}</div>
                              : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
                                  {jamFinalBTRanking.map((p: any, i: number) => (
                                    <div key={p.id} style={{ background: '#0a0a0a', padding: '16px 20px', borderLeft: p.meetsRequirement ? `3px solid #4CAF50` : '3px solid #333' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, width: 32, color: i === 0 && p.meetsRequirement ? GOLD : i === 1 && p.meetsRequirement ? '#94a3b8' : i === 2 && p.meetsRequirement ? '#f97316' : '#333', flexShrink: 0 }}>
                                          {p.totalScore > 0 ? i + 1 : '—'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3 }}>{p.profiles?.full_name || p.display_name}</div>
                                          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 10, color: '#555' }}>{t('evBestRunLabel')}: {p.qualScore.toFixed(2)}</span>
                                            <span style={{ fontSize: 10, color: p.meetsRequirement ? '#4CAF50' : '#ef4444' }}>
                                              {t('evBTScoreLabel')}: {p.btScore.toFixed(2)} ({p.successfulTricks}/2{p.successfulTricks > 2 ? '+' : ''})
                                            </span>
                                            {!p.meetsRequirement && (
                                              <span style={{ fontSize: 9, color: '#ef4444', letterSpacing: 1, textTransform: 'uppercase' }}>{t('evNoMeetsReq')}</span>
                                            )}
                                          </div>
                                          {p.meetsRequirement && (
                                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                              {getBestTricksFinal(p.id, scores).map((trick: any, ti: number) => (
                                                <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                  <span style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>{trick.nombre}</span>
                                                  <span style={{ fontSize: 11, fontWeight: 700, color: ti === 0 ? GOLD : '#666' }}>{trick.score.toFixed(2)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ fontSize: p.totalScore > 0 ? 24 : 16, fontWeight: 900, color: p.totalScore > 0 ? (p.meetsRequirement ? GOLD : '#555') : '#333', flexShrink: 0 }}>
                                          {p.totalScore > 0 ? p.totalScore.toFixed(2) : '—'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                          ) : (
                            // Final JAM con pasada única
                            jamFinalRunRanking.length === 0
                              ? <div style={{ color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noParticipants')}</div>
                              : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
                                  {jamFinalRunRanking.map((p: any, i: number) => (
                                    <div key={p.id} style={{ background: '#0a0a0a', padding: '16px 20px', borderLeft: `3px solid #4CAF50` }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, width: 32, color: i === 0 ? GOLD : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#333', flexShrink: 0 }}>
                                          {p.finalScore !== null ? i + 1 : '—'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3 }}>{p.profiles?.full_name || p.display_name}</div>
                                          <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{t('evFinalRunLabel')}</div>
                                        </div>
                                        <div style={{ fontSize: p.finalScore !== null ? 24 : 16, fontWeight: 900, color: p.finalScore !== null ? GOLD : '#333', flexShrink: 0 }}>
                                          {p.finalScore !== null ? p.finalScore.toFixed(2) : '—'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                          )}
                        </div>
                      )}
                    </div>
                  )
                }

                // ─── RAMA BEST TRICK ─────────────────────────────────────────
                if (cat.format === 'best_trick') {
                  const catVotes = btVotes.filter((v: any) => v.category_id === cat.id)
                  const judgeCount = judges.filter((j: any) => j.status === 'accepted').length || 1

                  // Ranking por puntaje (mejor truco promediado entre jueces)
                  const btRanked = allCatParts.map((p: any) => {
                    const trickMap: Record<string, number[]> = {}
                    for (const sc of scores.filter((s: any) => s.participant_id === p.id)) {
                      const tricks = Array.isArray(sc.tricks) ? sc.tricks : (sc.tricks?.tricks ?? [])
                      for (const trick of tricks) {
                        if (!trick.nombre || trick.intencion !== true) continue
                        if (!trickMap[trick.nombre]) trickMap[trick.nombre] = []
                        trickMap[trick.nombre].push(trick._score || 0)
                      }
                    }
                    const bestTrick = Object.entries(trickMap)
                      .map(([nombre, sc]) => ({ nombre, score: sc.reduce((a: number, b: number) => a + b, 0) / judgeCount }))
                      .sort((a, b) => b.score - a.score)[0] ?? null
                    return { ...p, bestTrick, bestScore: bestTrick?.score ?? 0 }
                  }).sort((a: any, b: any) => b.bestScore - a.bestScore)

                  // Podio por votación (si hay votos suficientes)
                  const votingDone = catVotes.length > 0
                  let podioRanked = btRanked

                  if (votingDone) {
                    // Sumar votos por posición: rank=1 → 3pts, rank=2 → 2pts, rank=3 → 1pt
                    const scoreMap: Record<string, number> = {}
                    const voteCountMap: Record<number, Record<string, number>> = { 1: {}, 2: {}, 3: {} }
                    for (const v of catVotes) {
                      const pts = v.rank === 1 ? 3 : v.rank === 2 ? 2 : 1
                      scoreMap[v.participant_id] = (scoreMap[v.participant_id] ?? 0) + pts
                      voteCountMap[v.rank][v.participant_id] = (voteCountMap[v.rank][v.participant_id] ?? 0) + 1
                    }
                    // Top 3 por votos, empate desempata por bestScore
                    const top3Ids = btRanked.slice(0, 3).map((p: any) => p.id)
                    const top3 = btRanked
                      .filter((p: any) => top3Ids.includes(p.id))
                      .sort((a: any, b: any) => {
                        const diff = (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0)
                        return diff !== 0 ? diff : b.bestScore - a.bestScore
                      })
                    // Resto sin cambio
                    const rest = btRanked.filter((p: any) => !top3Ids.includes(p.id))
                    podioRanked = [...top3, ...rest]
                  }

                  return (
                    <div key={cat.id} style={{ marginBottom: 64 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #2a2a2a' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{cat.name}</div>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', border: '1px solid #C9A84C44', padding: '3px 10px' }}>{FORMAT_LABEL[cat.format] ?? cat.format}</span>
                      </div>

                      {podioRanked.length === 0 ? (
                        <div style={{ color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noParticipants')}</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
                          {podioRanked.map((p: any, i: number) => {
                            const isPodio = i < 3 && votingDone
                            const podioColors: Record<number, string> = { 0: GOLD, 1: '#94a3b8', 2: '#f97316' }
                            return (
                              <div key={p.id} style={{ background: isPodio ? '#0f0f0f' : '#0a0a0a', padding: '16px 20px', borderLeft: isPodio ? `3px solid ${podioColors[i] ?? '#333'}` : '3px solid transparent' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                  <div style={{ fontSize: 22, fontWeight: 900, width: 32, color: isPodio ? podioColors[i] : '#333', flexShrink: 0 }}>
                                    {i + 1}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3 }}>
                                      {p.profiles?.full_name || p.display_name}
                                    </div>
                                    {isPodio && p.bestTrick && (
                                      <div style={{ fontSize: 12, color: podioColors[i] ?? GOLD, marginTop: 4, fontWeight: 700 }}>
                                        {p.bestTrick.nombre}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                // ─── RAMA FORMAL / BEST_TRICK ────────────────────────────────
                const qualParts = allCatParts
                  .map((p: any) => ({ ...p, score: calcQualScore(p.id, scores, cat) }))
                  .sort((a: any, b: any) => {
                    const diff = (b.score ?? -1) - (a.score ?? -1)
                    if (Math.abs(diff) > 0.0001) return diff
                    return compareTiebreak(a.id, b.id, scores)
                  })

                const finalParts = isFinalPhase
                  ? allCatParts
                      .filter((p: any) => p.is_finalist)
                      .map((p: any) => {
                        const runScore = calcFinalRunScore(p.id, scores) ?? 0
                        const btResult = hasBTFinal ? calcBestTrickFinalScore(p.id, scores) : { score: 0, meetsRequirement: true, successfulTricks: 0 }
                        const totalScore = runScore + btResult.score
                        return { ...p, runScore, btScore: btResult.score, meetsRequirement: btResult.meetsRequirement, successfulTricks: btResult.successfulTricks, totalScore }
                      })
                      .sort((a: any, b: any) => {
                        if (a.meetsRequirement && !b.meetsRequirement) return -1
                        if (!a.meetsRequirement && b.meetsRequirement) return 1
                        const diff = b.totalScore - a.totalScore
                        if (Math.abs(diff) > 0.0001) return diff
                        return compareTiebreak(a.id, b.id, scores)
                      })
                  : []

                return (
                  <div key={cat.id} style={{ marginBottom: 64 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #2a2a2a' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{cat.name}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', border: '1px solid #C9A84C44', padding: '3px 10px' }}>{FORMAT_LABEL[cat.format] ?? cat.format}</span>
                      {isFinalPhase && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: '#4CAF50', textTransform: 'uppercase', border: '1px solid #4CAF5044', padding: '3px 10px' }}>{t('evFinal')}</span>}
                    </div>

                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 4, color: isFinalPhase ? '#444' : GOLD, marginBottom: 12, textTransform: 'uppercase' }}>
                      {isFinalPhase ? t('evQualification') : t('evRanking')}
                    </div>
                    {qualParts.length === 0
                      ? <div style={{ color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32 }}>{t('noParticipants')}</div>
                      : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: isFinalPhase ? 40 : 0 }}>
                          {qualParts.map((p: any, i: number) => (
                            <div key={p.id} style={{ background: isFinalPhase && p.is_finalist ? '#0f0f0f' : '#0a0a0a', padding: '16px 20px', borderLeft: isFinalPhase && p.is_finalist ? `3px solid ${GOLD}` : '3px solid transparent' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ fontSize: 22, fontWeight: 900, width: 32, color: i === 0 ? GOLD : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#333', flexShrink: 0 }}>
                                  {p.score !== null ? i + 1 : '—'}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3 }}>{p.profiles?.full_name || p.display_name}</div>
                                  {isFinalPhase && p.is_finalist && (
                                    <div style={{ fontSize: 9, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>{t('evFinalist')}</div>
                                  )}
                                  {cat.format === 'best_trick' && (
                                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                      {getBestTricks(p.id, scores).map((trick: any, ti: number) => (
                                        <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>{trick.nombre}</span>
                                          <span style={{ fontSize: 11, fontWeight: 700, color: ti === 0 ? GOLD : '#666' }}>{(trick._score || 0).toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: p.score !== null ? 24 : 16, fontWeight: 900, color: p.score !== null ? GOLD : '#333', flexShrink: 0 }}>
                                  {p.score !== null ? p.score.toFixed(2) : '—'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    {isFinalPhase && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 4, color: '#4CAF50', marginBottom: 12, textTransform: 'uppercase' }}>Final</div>
                        {finalParts.length === 0
                          ? <div style={{ color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noParticipants')}</div>
                          : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
                              {finalParts.map((p: any, i: number) => (
                                <div key={p.id} style={{ background: '#0a0a0a', padding: '16px 20px', borderLeft: p.meetsRequirement ? `3px solid #4CAF50` : '3px solid #333' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ fontSize: 22, fontWeight: 900, width: 32, color: i === 0 && p.meetsRequirement ? GOLD : i === 1 && p.meetsRequirement ? '#94a3b8' : i === 2 && p.meetsRequirement ? '#f97316' : '#333', flexShrink: 0 }}>
                                      {p.totalScore > 0 ? i + 1 : '—'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3 }}>{p.profiles?.full_name || p.display_name}</div>
                                      <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                                        {p.runScore > 0 && <span style={{ fontSize: 10, color: '#555' }}>{t('evRunScoreLabel')}: {p.runScore.toFixed(2)}</span>}
                                        {hasBTFinal && (
                                          <span style={{ fontSize: 10, color: p.meetsRequirement ? '#4CAF50' : '#ef4444' }}>
                                            {t('evBTScoreLabel')}: {p.btScore.toFixed(2)} ({p.successfulTricks}/2{p.successfulTricks > 2 ? '+' : ''})
                                          </span>
                                        )}
                                        {hasBTFinal && !p.meetsRequirement && (
                                          <span style={{ fontSize: 9, color: '#ef4444', letterSpacing: 1, textTransform: 'uppercase' }}>{t('evNoMeetsReq')}</span>
                                        )}
                                      </div>
                                      {hasBTFinal && p.meetsRequirement && (
                                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                          {getBestTricksFinal(p.id, scores).map((trick: any, ti: number) => (
                                            <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                              <span style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>{trick.nombre}</span>
                                              <span style={{ fontSize: 11, fontWeight: 700, color: ti === 0 ? GOLD : '#666' }}>{trick.score.toFixed(2)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ fontSize: p.totalScore > 0 ? 24 : 16, fontWeight: 900, color: p.totalScore > 0 ? (p.meetsRequirement ? GOLD : '#555') : '#333', flexShrink: 0 }}>
                                      {p.totalScore > 0 ? p.totalScore.toFixed(2) : '—'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                      </>
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