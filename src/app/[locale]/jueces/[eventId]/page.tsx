'use client'

import { useState, useEffect, useReducer, createContext, useContext, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import type { User } from '@supabase/supabase-js'

const GOLD = '#D4B45A'
const JAM_NIVELES = [
  { val: 0.5, label: 'Intento',  short: '½', color: '#92400e', colorDark: '#78350f' },
  { val: 1,   label: 'Entrada',  short: 'E', color: '#166534', colorDark: '#14532d' },
  { val: 2,   label: 'Básico',   short: 'B', color: '#1e40af', colorDark: '#1e3a5f' },
  { val: 3,   label: 'Nivel',    short: 'N', color: '#6d28d9', colorDark: '#3b0764' },
]
const DEFAULT_W = { intencion: 15, dificultad: 30, ejecucion: 30, estilo: 10, secuencia: 15 }
const BT_W      = { intencion: 15, dificultad: 35, ejecucion: 35, estilo: 15 }

function jamScore(t: any) { return t.nivel || 0 }
function parseJamData(raw: any): { tricks: any[], fluidez: number, creatividad: number } {
  if (!raw) return { tricks: [], fluidez: 5, creatividad: 5 }
  if (Array.isArray(raw)) return { tricks: raw, fluidez: 5, creatividad: 5 }
  return { tricks: Array.isArray(raw.tricks) ? raw.tricks : [], fluidez: raw.fluidez ?? 5, creatividad: raw.creatividad ?? 5 }
}

const Ctx = createContext<any>(null)
const useJudge = () => useContext(Ctx)

function reducer(s: any, a: any) {
  switch (a.type) {
    case 'SET_SC':    return { ...s, scorecards: a.sc }
    case 'TOAST':     return { ...s, toast: a.msg }
    case 'CLR_TOAST': return { ...s, toast: null }
    default: return s
  }
}

const gs = {
  screen: { minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8', fontFamily: "'Inter',system-ui,sans-serif" } as React.CSSProperties,
  inp: { width: '100%', background: '#111', border: '1px solid #2a2a2a', padding: '13px 14px', color: '#e8e8e8', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', marginBottom: 10 } as React.CSSProperties,
  label: { fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, display: 'block', marginBottom: 8 } as React.CSSProperties,
  btnGold: (extra: any = {}) => ({ background: GOLD, border: 'none', padding: '14px 24px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase' as const, width: '100%', ...extra }),
  btnOutline: (extra: any = {}) => ({ background: 'transparent', border: '1px solid #2a2a2a', padding: '10px 16px', color: '#666', fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' as const, ...extra }),
}

function Toast() {
  const { state, dispatch } = useJudge()
  useEffect(() => {
    if (state.toast) { const t = setTimeout(() => dispatch({ type: 'CLR_TOAST' }), 2200); return () => clearTimeout(t) }
  }, [state.toast])
  if (!state.toast) return null
  const isErr = state.toast.startsWith('❌')
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: isErr ? '#ef4444' : GOLD, color: isErr ? '#fff' : '#000', padding: '12px 28px', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
      {state.toast}
    </div>
  )
}

function DragNum({ value, onChange, min = 0, max = 10, label, accent = GOLD }: any) {
  const startY = useRef<number | null>(null), startV = useRef(value), drag = useRef(false)
  function pd(e: React.PointerEvent) { startY.current = e.clientY; startV.current = value; drag.current = true; e.currentTarget.setPointerCapture(e.pointerId) }
  function pm(e: React.PointerEvent) { if (!drag.current) return; const d = Math.round((startY.current! - e.clientY) / 12); const nv = Math.max(min, Math.min(max, startV.current + d)); if (nv !== value) onChange(nv) }
  function pu() { drag.current = false }
  const pct = (value - min) / (max - min || 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      {label && <div style={{ fontSize: 9, color: '#666', fontWeight: 700, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' }}>{label}</div>}
      <div style={{ width: 56, height: 56, background: `conic-gradient(${accent} ${pct * 360}deg, #1a1a1a 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3 }}>
        <div onPointerDown={pd} onPointerMove={pm} onPointerUp={pu} style={{ width: '100%', height: '100%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#e8e8e8', cursor: 'ns-resize', userSelect: 'none', touchAction: 'none' }}>
          {value}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 30, height: 26, border: '1px solid #2a2a2a', background: 'transparent', color: '#666', fontSize: 16, cursor: 'pointer' }}>−</button>
        <button onClick={() => onChange(Math.min(max, value + 1))} style={{ width: 30, height: 26, border: '1px solid #2a2a2a', background: 'transparent', color: '#666', fontSize: 16, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  )
}

function ModifierStepper({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  const delta = value - 5
  const deltaColor = delta > 0 ? '#4CAF50' : delta < 0 ? '#ef4444' : '#444'
  const deltaStr  = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d0d0d', padding: '8px 10px', borderTop: '1px solid #1a1a1a' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 900, color: deltaColor, letterSpacing: 1 }}>{deltaStr}</div>
      </div>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={{ width: 30, height: 30, border: '1px solid #2a2a2a', background: value > 0 ? '#1a1a1a' : 'transparent', color: value > 0 ? '#e8e8e8' : '#2a2a2a', fontSize: 18, fontWeight: 900, cursor: value > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
      <div style={{ width: 34, textAlign: 'center', fontSize: 20, fontWeight: 900, color: value === 5 ? '#666' : value > 5 ? '#4CAF50' : '#ef4444', lineHeight: 1 }}>{value}</div>
      <button onClick={() => onChange(Math.min(10, value + 1))} style={{ width: 30, height: 30, border: '1px solid #2a2a2a', background: value < 10 ? '#1a1a1a' : 'transparent', color: value < 10 ? '#e8e8e8' : '#2a2a2a', fontSize: 18, fontWeight: 900, cursor: value < 10 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
    </div>
  )
}

function FormalScorer({ weights, tricks, onAdd, onRemove, t }: any) {
  const [intencion, setIntencion] = useState(true)
  const [dificultad, setDificultad] = useState(1)
  const [ejecucion, setEjecucion] = useState(5)
  const [estilo, setEstilo] = useState(5)
  const [secuencia, setSecuencia] = useState(false)
  const w = weights || DEFAULT_W
  const score = intencion ? ((10 * w.intencion + (dificultad / 3 * 10) * w.dificultad + ejecucion * w.ejecucion + estilo * w.estilo + (secuencia ? 10 : 0) * (w.secuencia || 0)) / 100) : 0

  function add() {
    onAdd({ intencion, dificultad, ejecucion, estilo, secuencia, _score: parseFloat(score.toFixed(3)) })
    setDificultad(1); setEjecucion(5); setEstilo(5); setSecuencia(false); setIntencion(true)
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ background: '#111', borderTop: `2px solid ${GOLD}`, padding: 16, marginBottom: 14 }}>
        <div style={gs.label}>{t('labelIntencion')}</div>
        <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => setIntencion(v)} style={{ flex: 1, padding: 14, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 16, background: intencion === v ? (v ? '#14532d' : '#7f1d1d') : '#0a0a0a', color: intencion === v ? '#fff' : '#333' }}>
              {v ? t('intentYes') : t('intentNo')}
            </button>
          ))}
        </div>
        <div style={{ opacity: intencion ? 1 : 0.2, pointerEvents: intencion ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 14, gap: 8 }}>
            <DragNum label="DIF 0-3"  value={dificultad} onChange={setDificultad} min={0} max={3}  accent={GOLD} />
            <DragNum label="EJE 0-10" value={ejecucion}  onChange={setEjecucion}  min={0} max={10} accent="#e8e8e8" />
            <DragNum label="EST 0-10" value={estilo}     onChange={setEstilo}     min={0} max={10} accent="#888" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #2a2a2a' }}>
            <div style={gs.label}>{t('labelSecuencia')}</div>
            <button onClick={() => setSecuencia(!secuencia)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ width: 44, height: 24, background: secuencia ? '#1e3a5f' : '#2a2a2a', position: 'relative', transition: 'background .2s' }}>
                <div style={{ position: 'absolute', top: 3, left: secuencia ? 22 : 3, width: 18, height: 18, background: secuencia ? GOLD : '#444', transition: 'left .2s' }} />
              </div>
              <span style={{ fontSize: 10, color: secuencia ? GOLD : '#444', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                {secuencia ? t('secuenciaSi') : t('secuenciaNo')}
              </span>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, borderTop: '1px solid #2a2a2a', paddingTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={gs.label}>{t('labelTrickScore')}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{score.toFixed(2)}</div>
          </div>
          <button onClick={add} style={{ width: 60, height: 60, background: GOLD, border: 'none', color: '#000', fontWeight: 900, fontSize: 28, cursor: 'pointer' }}>+</button>
        </div>
      </div>
      {tricks.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: '#333', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{t('historial', { count: tricks.length })}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
            {[...tricks].reverse().map((trick: any, ri: number) => {
              const i = tricks.length - 1 - ri
              return (
                <div key={i} style={{ background: '#0a0a0a', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 10, color: '#333', width: 16 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 10, color: '#444' }}>Int:{trick.intencion ? '✓' : '✗'} · Dif:{trick.dificultad} · Eje:{trick.ejecucion} · Est:{trick.estilo}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: GOLD, minWidth: 44, textAlign: 'right' }}>{(trick._score || 0).toFixed(2)}</div>
                  <button onClick={() => onRemove(i)} style={{ width: 28, height: 28, border: '1px solid #2a2a2a', background: 'transparent', color: '#444', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BestTrickScorer({ tricks, onAdd, onRemove, t }: any) {
  const [nombre, setNombre] = useState('')
  const [intencion, setIntencion] = useState(true)
  const [dificultad, setDificultad] = useState(1)
  const [ejecucion, setEjecucion] = useState(5)
  const [estilo, setEstilo] = useState(5)
  const score = intencion ? ((10 * BT_W.intencion + (dificultad / 3 * 10) * BT_W.dificultad + ejecucion * BT_W.ejecucion + estilo * BT_W.estilo) / 100) : 0
  const best = tricks.filter((t: any) => t.intencion === true).length
    ? Math.max(...tricks.filter((t: any) => t.intencion === true).map((t: any) => t._score || 0))
    : 0

  function add() {
    if (!nombre.trim()) return
    onAdd({ nombre: nombre.trim(), intencion, dificultad, ejecucion, estilo, _score: parseFloat(score.toFixed(3)) })
    setNombre(''); setDificultad(1); setEjecucion(5); setEstilo(5); setIntencion(true)
  }

  return (
    <div style={{ padding: 14 }}>
      {best > 0 && (
        <div style={{ background: '#111', borderTop: `2px solid ${GOLD}`, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={gs.label}>{t('labelBestTrick')}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: GOLD }}>{best.toFixed(2)}</div>
        </div>
      )}
      <div style={{ background: '#111', borderTop: '2px solid #2a2a2a', padding: 16, marginBottom: 14 }}>
        <div style={gs.label}>{t('labelTrickName')}</div>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder={t('trickNamePlaceholder')} style={gs.inp} />
        <div style={gs.label}>{t('labelIntencion')}</div>
        <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => setIntencion(v)} style={{ flex: 1, padding: 12, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 15, background: intencion === v ? (v ? '#14532d' : '#7f1d1d') : '#0a0a0a', color: intencion === v ? '#fff' : '#333' }}>
              {v ? t('intentYes') : t('intentNo')}
            </button>
          ))}
        </div>
        <div style={{ opacity: intencion ? 1 : 0.2, pointerEvents: intencion ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
            <DragNum label="DIF 0-3"  value={dificultad} onChange={setDificultad} min={0} max={3}  accent={GOLD} />
            <DragNum label="EJE 0-10" value={ejecucion}  onChange={setEjecucion}  min={0} max={10} accent="#e8e8e8" />
            <DragNum label="EST 0-10" value={estilo}     onChange={setEstilo}     min={0} max={10} accent="#888" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, borderTop: '1px solid #2a2a2a', paddingTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={gs.label}>{t('labelThisTrick')}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{score.toFixed(2)}</div>
          </div>
          <button onClick={add} disabled={!nombre.trim()} style={{ width: 60, height: 60, background: nombre.trim() ? GOLD : '#1a1a1a', border: 'none', color: nombre.trim() ? '#000' : '#333', fontWeight: 900, fontSize: 28, cursor: nombre.trim() ? 'pointer' : 'default' }}>+</button>
        </div>
      </div>
      {tricks.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: '#333', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{t('tricksCount', { count: tricks.length })}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
            {[...tricks].sort((a: any, b: any) => (b._score || 0) - (a._score || 0)).map((trick: any, i: number) => {
              const isBest = trick._score === best && trick.intencion
              return (
                <div key={i} style={{ background: isBest ? '#111' : '#0a0a0a', borderLeft: isBest ? `3px solid ${GOLD}` : '3px solid transparent', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isBest ? GOLD : '#e8e8e8', marginBottom: 3 }}>{trick.nombre}</div>
                    <div style={{ fontSize: 10, color: '#444' }}>Int:{trick.intencion ? '✓' : '✗'} · Dif:{trick.dificultad} · Eje:{trick.ejecucion} · Est:{trick.estilo}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: isBest ? GOLD : '#666', minWidth: 44, textAlign: 'right' }}>{(trick._score || 0).toFixed(2)}</div>
                  <button onClick={() => onRemove(tricks.indexOf(trick))} style={{ width: 28, height: 28, border: '1px solid #2a2a2a', background: 'transparent', color: '#444', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BestTrickScorerFinal({ eventId, catId, participantId, jId, scorecards, dispatch, toast, event, t }: any) {
  const MAX_ATTEMPTS = 4
  const saved = scorecards[jId]?.[participantId]?.[3]
  const [tricks, setTricks] = useState<any[]>(Array.isArray(saved) ? saved : (saved?.tricks ?? []))
  const [nombre, setNombre] = useState('')
  const [intencion, setIntencion] = useState(true)
  const [dificultad, setDificultad] = useState(1)
  const [ejecucion, setEjecucion] = useState(5)
  const [estilo, setEstilo] = useState(5)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const saved = scorecards[jId]?.[participantId]?.[3]
    setTricks(Array.isArray(saved) ? saved : (saved?.tricks ?? []))
    setDirty(false)
  }, [participantId, scorecards])

  const score = intencion ? ((10 * BT_W.intencion + (dificultad / 3 * 10) * BT_W.dificultad + ejecucion * BT_W.ejecucion + estilo * BT_W.estilo) / 100) : 0
  const exitosos = tricks.filter((t: any) => t.intencion === true)
  const canAdd = tricks.length < MAX_ATTEMPTS && nombre.trim()

  function add() {
    if (!canAdd) return
    setTricks(prev => [...prev, { nombre: nombre.trim(), intencion, dificultad, ejecucion, estilo, _score: parseFloat(score.toFixed(3)) }])
    setNombre(''); setDificultad(1); setEjecucion(5); setEstilo(5); setIntencion(true)
    setDirty(true)
  }

  function remove(i: number) {
    setTricks(prev => prev.filter((_, idx) => idx !== i))
    setDirty(true)
  }

  async function save() {
    if (!participantId || saving) return
    if (event?.status !== 'active') { toast(t('toastNotStarted')); return }
    setSaving(true)
    try {
      const existing = await supabase.from('scorecards').select('id').eq('judge_id', jId).eq('participant_id', participantId).eq('run', 3).maybeSingle()
      if (existing.data) {
        await supabase.from('scorecards').update({ tricks, updated_at: new Date().toISOString() }).eq('judge_id', jId).eq('participant_id', participantId).eq('run', 3)
      } else {
        await supabase.from('scorecards').insert({ event_id: eventId, category_id: catId, judge_id: jId, participant_id: participantId, run: 3, tricks })
      }
      const sc = scorecards
      const newSc = { ...sc, [jId]: { ...(sc[jId] || {}), [participantId]: { ...((sc[jId] || {})[participantId] || {}), 3: tricks } } }
      dispatch({ type: 'SET_SC', sc: newSc })
      setDirty(false)
      toast(t('toastSaved'))
    } catch { toast(t('toastError')) } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 14 }}>
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
          const trick = tricks[i]
          return (
            <div key={i} style={{ flex: 1, padding: '10px 8px', background: trick ? (trick.intencion ? '#14532d' : '#7f1d1d') : '#0a0a0a', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: trick ? '#fff' : '#333', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                {trick ? (trick.intencion ? '✓' : '✗') : (i + 1)}
              </div>
              {trick && <div style={{ fontSize: 10, color: '#ffffff88', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trick.nombre}</div>}
            </div>
          )
        })}
      </div>
      <div style={{ background: exitosos.length >= 2 ? '#0d2b0d' : '#1a0a0a', border: `1px solid ${exitosos.length >= 2 ? '#166534' : '#7f1d1d'}`, padding: '8px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: exitosos.length >= 2 ? '#4CAF50' : '#ef4444' }}>
          {exitosos.length >= 2 ? '✓ Requisito cumplido' : `✗ ${exitosos.length}/2 exitosos`}
        </div>
      </div>
      {tricks.length < MAX_ATTEMPTS && (
        <div style={{ background: '#111', borderTop: '2px solid #2a2a2a', padding: 16, marginBottom: 14 }}>
          <div style={gs.label}>Nombre del truco</div>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Fakie 360..." style={gs.inp} />
          <div style={gs.label}>{t('labelIntencion')}</div>
          <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => setIntencion(v)} style={{ flex: 1, padding: 12, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 15, background: intencion === v ? (v ? '#14532d' : '#7f1d1d') : '#0a0a0a', color: intencion === v ? '#fff' : '#333' }}>
                {v ? t('intentYes') : t('intentNo')}
              </button>
            ))}
          </div>
          <div style={{ opacity: intencion ? 1 : 0.2, pointerEvents: intencion ? 'auto' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
              <DragNum label="DIF 0-3" value={dificultad} onChange={setDificultad} min={0} max={3} accent={GOLD} />
              <DragNum label="EJE 0-10" value={ejecucion} onChange={setEjecucion} min={0} max={10} accent="#e8e8e8" />
              <DragNum label="EST 0-10" value={estilo} onChange={setEstilo} min={0} max={10} accent="#888" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, borderTop: '1px solid #2a2a2a', paddingTop: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={gs.label}>Puntaje este intento</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{score.toFixed(2)}</div>
            </div>
            <button onClick={add} disabled={!canAdd} style={{ width: 60, height: 60, background: canAdd ? GOLD : '#1a1a1a', border: 'none', color: canAdd ? '#000' : '#333', fontWeight: 900, fontSize: 28, cursor: canAdd ? 'pointer' : 'default' }}>+</button>
          </div>
        </div>
      )}
      {tricks.length === MAX_ATTEMPTS && (
        <div style={{ background: '#111', border: '1px solid #2a2a2a', padding: '12px 16px', marginBottom: 14, textAlign: 'center', fontSize: 11, color: '#555', letterSpacing: 1 }}>
          Máximo de intentos alcanzado ({MAX_ATTEMPTS}/{MAX_ATTEMPTS})
        </div>
      )}
      {tricks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 14 }}>
          {tricks.map((trick: any, i: number) => (
            <div key={i} style={{ background: trick.intencion ? '#0d1a0d' : '#1a0a0a', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${trick.intencion ? '#166534' : '#7f1d1d'}` }}>
              <div style={{ fontSize: 11, color: '#555', width: 16 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: trick.intencion ? '#e8e8e8' : '#555' }}>{trick.nombre}</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>Int:{trick.intencion ? '✓' : '✗'} · Dif:{trick.dificultad} · Eje:{trick.ejecucion} · Est:{trick.estilo}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: trick.intencion ? GOLD : '#333' }}>{(trick._score || 0).toFixed(2)}</div>
              <button onClick={() => remove(i)} style={{ width: 28, height: 28, border: '1px solid #2a2a2a', background: 'transparent', color: '#444', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <button onClick={save} disabled={saving || !dirty} style={gs.btnGold({ background: dirty ? GOLD : '#1a1a1a', color: dirty ? '#000' : '#444', opacity: saving ? 0.7 : 1 })}>
        {saving ? t('saving') : dirty ? 'Guardar Best Trick' : 'Guardado'}
      </button>
    </div>
  )
}

function JamColumn({ data, onAdd, onRemoveLast, onFluidez, onCreatividad, t }: any) {
  const tricksExitosos = data.tricks.filter((trick: any) => trick.nivel > 0)
  const tricksTotal = tricksExitosos.length > 0
    ? tricksExitosos.reduce((s: number, trick: any) => s + jamScore(trick), 0) / tricksExitosos.length
    : 0
  const modifier = (data.fluidez - 5) + (data.creatividad - 5)
  const total = tricksTotal + modifier
  const modColor = modifier > 0 ? '#4CAF50' : modifier < 0 ? '#ef4444' : '#444'

  return (
    <div style={{ flex: 1, background: '#0a0a0a', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ background: '#111', padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #1a1a1a', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{data.name}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{total.toFixed(1)}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#555' }}>{tricksTotal.toFixed(1)} trucos</span>
          {modifier !== 0 && <span style={{ fontSize: 10, fontWeight: 700, color: modColor }}>{modifier > 0 ? '+' : ''}{modifier} mod</span>}
        </div>
        {data.dirty && <div style={{ fontSize: 9, color: '#ef4444', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>{t('unsaved')}</div>}
      </div>
      <div style={{ padding: '6px 6px', display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
        {JAM_NIVELES.map(n => {
          const count = data.tricks.filter((trick: any) => trick.nivel === n.val).length
          return (
            <button key={n.val} onClick={() => onAdd(n.val)} style={{ width: '100%', padding: '10px 8px', border: 'none', cursor: 'pointer', background: n.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', width: 20, textAlign: 'center', flexShrink: 0 }}>{n.short}</span>
              <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#ffffff99', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>{n.label}</span>
              <span style={{ background: count > 0 ? '#ffffff30' : '#00000030', color: count > 0 ? '#fff' : '#ffffff50', padding: '2px 7px', fontSize: 13, fontWeight: 900, minWidth: 28, textAlign: 'center', flexShrink: 0 }}>{count}</span>
            </button>
          )
        })}
        <button onClick={onRemoveLast} disabled={!data.tricks.length} style={{ width: '100%', padding: '8px', border: '1px solid #1e1e1e', background: data.tricks.length ? '#161616' : 'transparent', color: data.tricks.length ? '#888' : '#2a2a2a', cursor: data.tricks.length ? 'pointer' : 'default', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>
          {t('undo')}
        </button>
      </div>
      <div style={{ flexShrink: 0, borderTop: '1px solid #1a1a1a', marginTop: 2 }}>
        <ModifierStepper label="Fluidez"     value={data.fluidez}     onChange={onFluidez} />
        <ModifierStepper label="Creatividad" value={data.creatividad} onChange={onCreatividad} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px 4px' }}>
        {data.tricks.length === 0 && <div style={{ fontSize: 9, color: '#2a2a2a', textAlign: 'center', paddingTop: 8, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noTricks')}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {[...data.tricks].reverse().map((trick: any, i: number) => {
            const nObj = JAM_NIVELES.find(n => n.val === trick.nivel)
            return (
              <div key={i} style={{ background: nObj?.colorDark, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>{nObj?.short}</span>
                <span style={{ color: GOLD, fontSize: 9, fontWeight: 700 }}>{trick.nivel}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// JamRunView: grilla de participantes para una pasada JAM (run=1 o run=2)
// ─────────────────────────────────────────────────────────────
function JamRunMultiView({ parts, jId, cat, eventId, run, scorecards, dispatch, toast, event, t }: any) {
  const [data, setData] = useState(() =>
    parts.map((p: any) => {
      const parsed = parseJamData(scorecards[jId]?.[p.id]?.[run])
      return { pId: p.id, name: p.display_name, ...parsed, dirty: false }
    })
  )

  useEffect(() => {
    setData(parts.map((p: any) => {
      const parsed = parseJamData(scorecards[jId]?.[p.id]?.[run])
      return { pId: p.id, name: p.display_name, ...parsed, dirty: false }
    }))
  }, [parts.map((p: any) => p.id).join(','), run, scorecards])

  function updateData(idx: number, fn: any) {
    setData((prev: any) => prev.map((d: any, i: number) => i === idx ? { ...fn(d), dirty: true } : d))
  }
  function addTrick(idx: number, nivel: number) { updateData(idx, (d: any) => ({ ...d, tricks: [...d.tricks, { nivel }] })) }
  function removeLast(idx: number) { updateData(idx, (d: any) => ({ ...d, tricks: d.tricks.slice(0, -1) })) }
  function setFluidez(idx: number, v: number) { updateData(idx, (d: any) => ({ ...d, fluidez: v })) }
  function setCreatividad(idx: number, v: number) { updateData(idx, (d: any) => ({ ...d, creatividad: v })) }

  async function saveAll() {
    if (event?.status !== 'active') { toast(t('toastNotStarted')); return }
    let ok = 0
    for (let idx = 0; idx < data.length; idx++) {
      const d = data[idx]
      if (!d.dirty) continue
      const payload = { tricks: d.tricks, fluidez: d.fluidez, creatividad: d.creatividad }
      try {
        const existing = await supabase.from('scorecards').select('id').eq('judge_id', jId).eq('participant_id', d.pId).eq('run', run).maybeSingle()
        if (existing.data) {
          await supabase.from('scorecards').update({ tricks: payload, updated_at: new Date().toISOString() }).eq('judge_id', jId).eq('participant_id', d.pId).eq('run', run)
        } else {
          await supabase.from('scorecards').insert({ event_id: eventId, category_id: cat.id, judge_id: jId, participant_id: d.pId, run, tricks: payload })
        }
        const sc = scorecards
        const newSc = { ...sc, [jId]: { ...(sc[jId] || {}), [d.pId]: { ...((sc[jId] || {})[d.pId] || {}), [run]: payload } } }
        dispatch({ type: 'SET_SC', sc: newSc })
        ok++
      } catch { toast(t('toastError')) }
    }
    if (ok > 0) {
      setData((prev: any) => prev.map((d: any) => ({ ...d, dirty: false })))
      toast(t('toastSaved'))
    }
  }

  const anyDirty = data.some((d: any) => d.dirty)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', gap: 1, background: '#1a1a1a', overflow: 'hidden' }}>
        {data.map((d: any, idx: number) => (
          <JamColumn key={d.pId} data={d} onAdd={(n: number) => addTrick(idx, n)} onRemoveLast={() => removeLast(idx)} onFluidez={(v: number) => setFluidez(idx, v)} onCreatividad={(v: number) => setCreatividad(idx, v)} t={t} />
        ))}
      </div>
      <div style={{ padding: '12px 16px', background: '#0a0a0a', borderTop: '1px solid #2a2a2a', flexShrink: 0 }}>
        <button onClick={saveAll} style={gs.btnGold({ background: anyDirty ? GOLD : '#1a1a1a', color: anyDirty ? '#000' : '#444' })}>
          {anyDirty ? t('saveBattery') : t('savedBattery')}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// JamBestTrickFinalView: best trick final para finalistas JAM
// Cada participante individualmente (navega entre ellos)
// ─────────────────────────────────────────────────────────────
function JamBestTrickFinalView({ parts, jId, cat, eventId, scorecards, dispatch, toast, event, confirmations, judges, setConfirmations, t }: any) {
  const [partIdx, setPartIdx] = useState(0)
  const participant = parts[partIdx]

  // Confirmación de ronda final (run=3)
  function judgeConfirmed(): boolean {
    return confirmations.some((c: any) => c.judge_id === jId && c.category_id === cat?.id && c.run === 3)
  }
  function allJudgesConfirmed(): boolean {
    if (!judges.length) return false
    return judges.every((j: any) =>
      confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === 3)
    )
  }

  async function confirmRound() {
    try {
      await supabase.from('round_confirmations').insert({
        event_id: eventId, category_id: cat.id, judge_id: jId, run: 3,
      })
      setConfirmations((prev: any) => [...prev, { event_id: eventId, category_id: cat.id, judge_id: jId, run: 3 }])
      toast(t('toastFinalConfirmed'))
    } catch { toast(t('toastConfirmError')) }
  }

  const myConfirmed = judgeConfirmed()
  const allConfirmed = allJudgesConfirmed()

  if (!participant) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 10, color: '#333', letterSpacing: 4, textTransform: 'uppercase' }}>{t('noParticipants')}</div>
    </div>
  )

  // Pantalla de bloqueo si ya confirmó
  if (myConfirmed) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, color: '#4CAF50' }}>
        {t('jamBestTrickFinalConfirmed')}
      </div>
      <div style={{ fontSize: 11, color: '#444', textAlign: 'center', letterSpacing: 1 }}>
        {allConfirmed ? t('jamAllConfirmed') : t('jamWaitingConfirm')}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {judges.map((j: any) => {
          const confirmed = confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === 3)
          return (
            <div key={j.id} style={{ width: 32, height: 32, background: confirmed ? '#14532d' : '#1a1a1a', border: `1px solid ${confirmed ? '#166534' : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: confirmed ? '#4CAF50' : '#333' }}>
              {confirmed ? '✓' : '?'}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Nav participantes */}
      <div style={{ background: '#111', borderBottom: '1px solid #2a2a2a', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setPartIdx(Math.max(0, partIdx - 1))} disabled={partIdx === 0}
            style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === 0 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === 0 ? 'default' : 'pointer', fontWeight: 900 }}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>{partIdx + 1} / {parts.length}</div>
            <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{participant.display_name}</div>
            <div style={{ fontSize: 9, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>{t('jamBestTrickFinalLabel')}</div>
          </div>
          <button onClick={() => setPartIdx(Math.min(parts.length - 1, partIdx + 1))} disabled={partIdx === parts.length - 1}
            style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === parts.length - 1 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === parts.length - 1 ? 'default' : 'pointer', fontWeight: 900 }}>›</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <BestTrickScorerFinal
          key={participant.id}
          eventId={eventId}
          catId={cat.id}
          participantId={participant.id}
          jId={jId}
          scorecards={scorecards}
          dispatch={dispatch}
          toast={toast}
          event={event}
          t={t}
        />
      </div>
      {/* Footer con botón confirmar */}
      <div style={{ padding: '10px 16px', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', flexShrink: 0 }}>
        <button
          onClick={confirmRound}
          style={{ background: 'transparent', border: '1px solid #4CAF50', padding: '12px 24px', color: '#4CAF50', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>
          {t('jamConfirmBestTrick')}
        </button>
        <div style={{ fontSize: 10, color: '#333', textAlign: 'center', letterSpacing: 1, marginTop: 8 }}>
          {t('jamConfirmBestTrickHint')}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// JamQualBatteryView: navegador de baterías para clasificación JAM
// Maneja run=1 y run=2 internamente con selector de pasada
// ─────────────────────────────────────────────────────────────
function JamQualBatteryView({ parts, jId, cat, eventId, scorecards, dispatch, toast, event, confirmations, judges, setConfirmations, t }: any) {
  const batteryMap: Record<number, any[]> = {}
  for (const p of parts) {
    const b = p.battery || 1
    if (!batteryMap[b]) batteryMap[b] = []
    batteryMap[b].push(p)
  }
  const batteryNums = Object.keys(batteryMap).map(Number).sort((a, b) => a - b)
  const [batIdx, setBatIdx] = useState(0)
  const [jamRun, setJamRun] = useState(1) // pasada activa: 1 o 2
  const currentBatNum = batteryNums[batIdx]
  const battery = batteryMap[currentBatNum] || []

  // Confirmación de ronda JAM
  function judgeConfirmedRun(run: number): boolean {
    return confirmations.some((c: any) => c.judge_id === jId && c.category_id === cat?.id && c.run === run)
  }
  function allJudgesConfirmedRun(run: number): boolean {
    if (!judges.length) return false
    return judges.every((j: any) =>
      confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === run)
    )
  }

  // run=2 solo disponible si todos confirmaron run=1
  const run2Available = allJudgesConfirmedRun(1)
  const myConfirmedCurrentRun = judgeConfirmedRun(jamRun)
  const allConfirmedCurrentRun = allJudgesConfirmedRun(jamRun)

  async function confirmRound(run: number) {
    try {
      await supabase.from('round_confirmations').insert({
        event_id: eventId, category_id: cat.id, judge_id: jId, run,
      })
      setConfirmations((prev: any) => [...prev, { event_id: eventId, category_id: cat.id, judge_id: jId, run }])
      toast(t('toastRunConfirmed'))
    } catch { toast(t('toastConfirmError')) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Selector pasada JAM */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '10px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 10 }}>
          <button onClick={() => setJamRun(1)}
            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', background: jamRun === 1 ? GOLD : '#0a0a0a', color: jamRun === 1 ? '#000' : '#444' }}>
            {t('jamRun1')}
            {judgeConfirmedRun(1) && <span style={{ marginLeft: 6, fontSize: 9 }}>✓</span>}
          </button>
          <button onClick={() => run2Available && setJamRun(2)} disabled={!run2Available}
            style={{ flex: 1, padding: '10px', border: 'none', cursor: run2Available ? 'pointer' : 'default', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', background: jamRun === 2 ? GOLD : '#0a0a0a', color: jamRun === 2 ? '#000' : run2Available ? '#888' : '#2a2a2a', opacity: run2Available ? 1 : 0.5 }}>
            {t('jamRun2')}
            {judgeConfirmedRun(2) && <span style={{ marginLeft: 6, fontSize: 9 }}>✓</span>}
          </button>
        </div>
        {!run2Available && (
          <div style={{ fontSize: 9, color: '#333', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' }}>
            {t('jamRun2Locked')}
          </div>
        )}
      </div>

      {/* Contenido bloqueado si ya confirmó */}
      {myConfirmedCurrentRun ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, color: '#4CAF50' }}>
            {t('jamRunConfirmed', { n: jamRun })}
          </div>
          <div style={{ fontSize: 11, color: '#444', textAlign: 'center', letterSpacing: 1 }}>
            {allConfirmedCurrentRun ? t('jamAllConfirmed') : t('jamWaitingConfirm')}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {judges.map((j: any) => {
              const confirmed = confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === jamRun)
              return (
                <div key={j.id} style={{ width: 32, height: 32, background: confirmed ? '#14532d' : '#1a1a1a', border: `1px solid ${confirmed ? '#166534' : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: confirmed ? '#4CAF50' : '#333' }}>
                  {confirmed ? '✓' : '?'}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Nav baterías */}
          <div style={{ background: '#111', borderBottom: '1px solid #2a2a2a', padding: '10px 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setBatIdx(Math.max(0, batIdx - 1))} disabled={batIdx === 0}
                style={{ width: 36, height: 36, border: '1px solid #2a2a2a', background: 'transparent', color: batIdx === 0 ? '#2a2a2a' : '#e8e8e8', fontSize: 18, cursor: batIdx === 0 ? 'default' : 'pointer', fontWeight: 900 }}>‹</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>Batería {batIdx + 1} de {batteryNums.length}</div>
                <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', color: GOLD }}>Batería {currentBatNum}</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{battery.map((p: any) => p.display_name).join(' · ')}</div>
              </div>
              <button onClick={() => setBatIdx(Math.min(batteryNums.length - 1, batIdx + 1))} disabled={batIdx === batteryNums.length - 1}
                style={{ width: 36, height: 36, border: '1px solid #2a2a2a', background: 'transparent', color: batIdx === batteryNums.length - 1 ? '#2a2a2a' : '#e8e8e8', fontSize: 18, cursor: batIdx === batteryNums.length - 1 ? 'default' : 'pointer', fontWeight: 900 }}>›</button>
            </div>
            {batteryNums.length > 1 && (
              <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginTop: 8 }}>
                {batteryNums.map((bn, i) => (
                  <button key={bn} onClick={() => setBatIdx(i)}
                    style={{ flex: 1, padding: '6px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 11, background: batIdx === i ? GOLD : '#0a0a0a', color: batIdx === i ? '#000' : '#444' }}>B{bn}</button>
                ))}
              </div>
            )}
          </div>

          {/* Grilla de puntaje */}
          <JamRunMultiView
            key={`${batIdx}-${jamRun}`}
            parts={battery}
            jId={jId}
            cat={cat}
            eventId={eventId}
            run={jamRun}
            scorecards={scorecards}
            dispatch={dispatch}
            toast={toast}
            event={event}
            t={t}
          />

          {/* Confirmar pasada */}
          <div style={{ padding: '10px 16px', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', flexShrink: 0 }}>
            <button
              onClick={() => confirmRound(jamRun)}
              style={{ background: 'transparent', border: '1px solid #4CAF50', padding: '12px 24px', color: '#4CAF50', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>
              {t('jamConfirmRun', { n: jamRun })}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// JamFinalRunView: pasada final JAM (run=3 cuando no hay best trick)
// Participantes individuales (navega entre finalistas)
// ─────────────────────────────────────────────────────────────
function JamFinalRunView({ parts, jId, cat, eventId, scorecards, dispatch, toast, event, confirmations, judges, setConfirmations, t }: any) {
  const [partIdx, setPartIdx] = useState(0)
  const [tricks, setTricks] = useState<any[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const participant = parts[partIdx]

  // Confirmación de ronda final (run=3)
  function judgeConfirmed(): boolean {
    return confirmations.some((c: any) => c.judge_id === jId && c.category_id === cat?.id && c.run === 3)
  }
  function allJudgesConfirmed(): boolean {
    if (!judges.length) return false
    return judges.every((j: any) =>
      confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === 3)
    )
  }

  async function confirmRound() {
    try {
      await supabase.from('round_confirmations').insert({
        event_id: eventId, category_id: cat.id, judge_id: jId, run: 3,
      })
      setConfirmations((prev: any) => [...prev, { event_id: eventId, category_id: cat.id, judge_id: jId, run: 3 }])
      toast(t('toastFinalConfirmed'))
    } catch { toast(t('toastConfirmError')) }
  }

  useEffect(() => {
    if (!participant) return
    const saved = parseJamData(scorecards[jId]?.[participant.id]?.[3])
    setTricks(saved.tricks)
    setDirty(false)
  }, [partIdx, scorecards, participant?.id])

  function addTrick(nivel: number) { setTricks(prev => [...prev, { nivel }]); setDirty(true) }
  function removeLast() { setTricks(prev => prev.slice(0, -1)); setDirty(true) }

  const exitosos = tricks.filter((t: any) => t.nivel > 0)
  const score = exitosos.length > 0 ? exitosos.reduce((s: number, t: any) => s + t.nivel, 0) / exitosos.length : 0

  async function save() {
    if (!participant || saving) return
    if (event?.status !== 'active') { toast(t('toastNotStarted')); return }
    setSaving(true)
    const payload = { tricks, fluidez: 5, creatividad: 5 }
    try {
      const existing = await supabase.from('scorecards').select('id').eq('judge_id', jId).eq('participant_id', participant.id).eq('run', 3).maybeSingle()
      if (existing.data) {
        await supabase.from('scorecards').update({ tricks: payload, updated_at: new Date().toISOString() }).eq('judge_id', jId).eq('participant_id', participant.id).eq('run', 3)
      } else {
        await supabase.from('scorecards').insert({ event_id: eventId, category_id: cat.id, judge_id: jId, participant_id: participant.id, run: 3, tricks: payload })
      }
      const sc = scorecards
      const newSc = { ...sc, [jId]: { ...(sc[jId] || {}), [participant.id]: { ...((sc[jId] || {})[participant.id] || {}), 3: payload } } }
      dispatch({ type: 'SET_SC', sc: newSc })
      setDirty(false)
      toast(t('toastSaved'))
    } catch { toast(t('toastError')) } finally { setSaving(false) }
  }

  if (!participant) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 10, color: '#333', letterSpacing: 4, textTransform: 'uppercase' }}>{t('noParticipants')}</div>
    </div>
  )

  // Pantalla de bloqueo si ya confirmó
  if (judgeConfirmed()) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, color: '#4CAF50' }}>
        {t('jamFinalConfirmed')}
      </div>
      <div style={{ fontSize: 11, color: '#444', textAlign: 'center', letterSpacing: 1 }}>
        {allJudgesConfirmed() ? t('jamAllConfirmed') : t('jamWaitingConfirm')}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {judges.map((j: any) => {
          const confirmed = confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === 3)
          return (
            <div key={j.id} style={{ width: 32, height: 32, background: confirmed ? '#14532d' : '#1a1a1a', border: `1px solid ${confirmed ? '#166534' : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: confirmed ? '#4CAF50' : '#333' }}>
              {confirmed ? '✓' : '?'}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Nav participantes */}
      <div style={{ background: '#111', borderBottom: '1px solid #2a2a2a', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setPartIdx(Math.max(0, partIdx - 1))} disabled={partIdx === 0}
            style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === 0 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === 0 ? 'default' : 'pointer', fontWeight: 900 }}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>{partIdx + 1} / {parts.length}</div>
            <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{participant.display_name}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: GOLD }}>{score.toFixed(2)}</span>
              {dirty && <span style={{ fontSize: 10, color: '#ef4444', letterSpacing: 1 }}>{t('unsavedLabel')}</span>}
            </div>
            <div style={{ fontSize: 9, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>{t('jamFinalRunLabel')}</div>
          </div>
          <button onClick={() => setPartIdx(Math.min(parts.length - 1, partIdx + 1))} disabled={partIdx === parts.length - 1}
            style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === parts.length - 1 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === parts.length - 1 ? 'default' : 'pointer', fontWeight: 900 }}>›</button>
        </div>
      </div>

      {/* Scorer JAM */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        <div style={{ background: '#111', borderTop: `2px solid ${GOLD}`, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{t('jamFinalPassLabel')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
            {JAM_NIVELES.map(n => {
              const count = tricks.filter((t: any) => t.nivel === n.val).length
              return (
                <button key={n.val} onClick={() => addTrick(n.val)} style={{ width: '100%', padding: '12px 16px', border: 'none', cursor: 'pointer', background: n.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', width: 24 }}>{n.short}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#ffffff99', textTransform: 'uppercase', letterSpacing: 1 }}>{n.label}</span>
                  <span style={{ background: count > 0 ? '#ffffff30' : '#00000030', color: count > 0 ? '#fff' : '#ffffff50', padding: '2px 10px', fontSize: 15, fontWeight: 900, minWidth: 32, textAlign: 'center' }}>{count}</span>
                </button>
              )
            })}
          </div>
          <button onClick={removeLast} disabled={!tricks.length}
            style={{ width: '100%', padding: '10px', border: '1px solid #1e1e1e', background: tricks.length ? '#161616' : 'transparent', color: tricks.length ? '#888' : '#2a2a2a', cursor: tricks.length ? 'pointer' : 'default', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
            {t('undo')}
          </button>
          <div style={{ marginTop: 14, borderTop: '1px solid #2a2a2a', paddingTop: 14 }}>
            <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>{t('jamFinalScoreLabel')}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: GOLD }}>{score.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{t('jamSuccessfulTricks', { count: exitosos.length })}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {[...tricks].reverse().map((t: any, i: number) => {
            const nObj = JAM_NIVELES.find(n => n.val === t.nivel)
            return (
              <div key={i} style={{ background: nObj?.colorDark, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>{nObj?.short}</span>
                <span style={{ color: GOLD, fontSize: 10, fontWeight: 700 }}>{t.nivel}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: '#0a0a0a', borderTop: '1px solid #2a2a2a', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={save} disabled={saving || !dirty}
          style={gs.btnGold({ background: dirty ? GOLD : '#1a1a1a', color: dirty ? '#000' : '#444', opacity: saving ? 0.7 : 1 })}>
          {saving ? t('saving') : dirty ? t('savePlanilla') : t('savedPlanilla')}
        </button>
        {!dirty && (
          <button
            onClick={confirmRound}
            style={{ background: 'transparent', border: '1px solid #4CAF50', padding: '12px 24px', color: '#4CAF50', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>
            {t('jamConfirmFinal')}
          </button>
        )}
        {dirty && (
          <div style={{ fontSize: 10, color: '#555', textAlign: 'center', letterSpacing: 1 }}>
            {t('jamConfirmBeforeSaveFinal')}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BestTrickQualView: clasificación Best Trick (run=1 y run=2)
// Navega entre participantes, con confirmación entre pasadas
// ─────────────────────────────────────────────────────────────
function BestTrickQualView({ parts, jId, cat, eventId, scorecards, dispatch, toast, event, confirmations, judges, setConfirmations, t }: any) {
  const [partIdx, setPartIdx] = useState(0)
  const [tricks, setTricks] = useState<any[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const maxRuns = cat?.max_runs ?? 1
  const participant = parts[partIdx]

  function allJudgesConfirmedRun(run: number): boolean {
    if (!judges.length) return false
    return judges.every((j: any) =>
      confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === run)
    )
  }
  function judgeConfirmedRun(run: number): boolean {
    return confirmations.some((c: any) => c.judge_id === jId && c.category_id === cat?.id && c.run === run)
  }

  const enabledRun = (maxRuns >= 2 && allJudgesConfirmedRun(1)) ? 2 : 1
  const myConfirmed = judgeConfirmedRun(enabledRun)
  const allConfirmed = allJudgesConfirmedRun(enabledRun)

  useEffect(() => {
    if (!participant) return
    const saved = scorecards[jId]?.[participant.id]?.[enabledRun]
    const arr = Array.isArray(saved) ? saved : (saved?.tricks ?? [])
    setTricks(arr)
    setDirty(false)
  }, [partIdx, enabledRun, scorecards, participant?.id])

  function addTrick(trick: any) { setTricks(prev => [...prev, trick]); setDirty(true) }
  function removeTrick(i: number) { setTricks(prev => prev.filter((_, idx) => idx !== i)); setDirty(true) }

  const bestScore = tricks.filter((t: any) => t.intencion === true).length
    ? Math.max(...tricks.filter((t: any) => t.intencion === true).map((t: any) => t._score || 0))
    : 0

  async function save() {
    if (!participant || saving) return
    if (event?.status !== 'active') { toast(t('toastNotStarted')); return }
    setSaving(true)
    try {
      const existing = await supabase.from('scorecards').select('id')
        .eq('judge_id', jId).eq('participant_id', participant.id).eq('run', enabledRun).maybeSingle()
      if (existing.data) {
        await supabase.from('scorecards').update({ tricks, updated_at: new Date().toISOString() })
          .eq('judge_id', jId).eq('participant_id', participant.id).eq('run', enabledRun)
      } else {
        await supabase.from('scorecards').insert({
          event_id: eventId, category_id: cat.id, judge_id: jId,
          participant_id: participant.id, run: enabledRun, tricks
        })
      }
      const sc = scorecards
      const newSc = { ...sc, [jId]: { ...(sc[jId] || {}), [participant.id]: { ...((sc[jId] || {})[participant.id] || {}), [enabledRun]: tricks } } }
      dispatch({ type: 'SET_SC', sc: newSc })
      setDirty(false)
      toast(t('toastSaved'))
    } catch { toast(t('toastError')) } finally { setSaving(false) }
  }

  async function confirmRound() {
    try {
      await supabase.from('round_confirmations').insert({
        event_id: eventId, category_id: cat.id, judge_id: jId, run: enabledRun,
      })
      setConfirmations((prev: any) => [...prev, { event_id: eventId, category_id: cat.id, judge_id: jId, run: enabledRun }])
      toast(t('toastRunConfirmed'))
    } catch { toast(t('toastConfirmError')) }
  }

  if (!participant) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 10, color: '#333', letterSpacing: 4, textTransform: 'uppercase' }}>{t('noParticipants')}</div>
    </div>
  )

  if (myConfirmed) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, color: '#4CAF50' }}>
        {t('jamRunConfirmed', { n: enabledRun })}
      </div>
      <div style={{ fontSize: 11, color: '#444', textAlign: 'center', letterSpacing: 1 }}>
        {allConfirmed
          ? (maxRuns >= 2 && enabledRun === 1 ? t('btRun2Starting') : t('jamAllConfirmed'))
          : t('jamWaitingConfirm')}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {judges.map((j: any) => {
          const confirmed = confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === enabledRun)
          return (
            <div key={j.id} style={{ width: 32, height: 32, background: confirmed ? '#14532d' : '#1a1a1a', border: `1px solid ${confirmed ? '#166534' : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: confirmed ? '#4CAF50' : '#333' }}>
              {confirmed ? '✓' : '?'}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {maxRuns >= 2 && (
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '8px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 1, background: '#2a2a2a' }}>
            <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: enabledRun === 1 ? GOLD : '#0a0a0a', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: enabledRun === 1 ? '#000' : '#444' }}>
              {t('jamRun1')} {judgeConfirmedRun(1) ? '✓' : ''}
            </div>
            <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: enabledRun === 2 ? GOLD : '#0a0a0a', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: enabledRun === 2 ? '#000' : (allJudgesConfirmedRun(1) ? '#888' : '#2a2a2a') }}>
              {t('jamRun2')} {judgeConfirmedRun(2) ? '✓' : ''}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#111', borderBottom: '1px solid #2a2a2a', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setPartIdx(Math.max(0, partIdx - 1))} disabled={partIdx === 0}
            style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === 0 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === 0 ? 'default' : 'pointer', fontWeight: 900 }}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>{t('partNav', { current: partIdx + 1, total: parts.length })}</div>
            <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{participant.display_name}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: GOLD }}>
                {bestScore > 0 ? `${t('bestPrefix')}${bestScore.toFixed(2)}` : '—'}
              </span>
              {dirty && <span style={{ fontSize: 10, color: '#ef4444', letterSpacing: 1 }}>{t('unsavedLabel')}</span>}
            </div>
          </div>
          <button onClick={() => setPartIdx(Math.min(parts.length - 1, partIdx + 1))} disabled={partIdx === parts.length - 1}
            style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === parts.length - 1 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === parts.length - 1 ? 'default' : 'pointer', fontWeight: 900 }}>›</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <BestTrickScorer
          tricks={tricks}
          onAdd={(trick: any) => { addTrick(trick); toast(t('toastTrickAdded')) }}
          onRemove={(i: number) => { removeTrick(i); toast(t('toastTrickRemoved')) }}
          t={t}
        />
      </div>

      <div style={{ padding: '12px 16px', background: '#0a0a0a', borderTop: '1px solid #2a2a2a', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={save} disabled={saving || !dirty}
          style={gs.btnGold({ background: dirty ? GOLD : '#1a1a1a', color: dirty ? '#000' : '#444', opacity: saving ? 0.7 : 1 })}>
          {saving ? t('saving') : dirty ? t('savePlanilla') : t('savedPlanilla')}
        </button>
        {!dirty && (
          <button onClick={confirmRound}
            style={{ background: 'transparent', border: '1px solid #4CAF50', padding: '12px 24px', color: '#4CAF50', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>
            {t('jamConfirmRun', { n: enabledRun })}
          </button>
        )}
        {dirty && (
          <div style={{ fontSize: 10, color: '#555', textAlign: 'center', letterSpacing: 1 }}>
            {t('jamConfirmBeforeSave')}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BestTrickVoteView: votación del podio entre los top 3
// ─────────────────────────────────────────────────────────────
function BestTrickVoteView({ parts, jId, cat, eventId, scorecards, judges, toast, event, t }: any) {
  const [votes, setVotes] = useState<Record<number, string | null>>({ 1: null, 2: null, 3: null })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Top 3 por mejor truco promediado entre jueces
  const ranked = parts.map((p: any) => {
    const trickMap: Record<string, number[]> = {}
    for (const jKey of Object.keys(scorecards)) {
      const runs = scorecards[jKey]?.[p.id] ?? {}
      for (const runKey of Object.keys(runs)) {
        const runData = runs[runKey]
        const trickArr = Array.isArray(runData) ? runData : (runData?.tricks ?? [])
        for (const trick of trickArr) {
          if (!trick.nombre || trick.intencion !== true) continue
          if (!trickMap[trick.nombre]) trickMap[trick.nombre] = []
          trickMap[trick.nombre].push(trick._score || 0)
        }
      }
    }
    const judgeCount = judges.length || 1
    const bestTrick = Object.entries(trickMap)
      .map(([nombre, scores]) => ({ nombre, score: scores.reduce((a, b) => a + b, 0) / judgeCount }))
      .sort((a, b) => b.score - a.score)[0] ?? null
    return { ...p, bestTrick, bestScore: bestTrick?.score ?? 0 }
  }).sort((a: any, b: any) => b.bestScore - a.bestScore).slice(0, 3)

  useEffect(() => {
    async function loadVotes() {
      const { data } = await supabase.from('best_trick_votes')
        .select('rank, participant_id')
        .eq('category_id', cat.id)
        .eq('judge_id', jId)
      if (data && data.length > 0) {
        const v: Record<number, string> = {}
        data.forEach((d: any) => { v[d.rank] = d.participant_id })
        setVotes(v as any)
        setSaved(true)
      }
    }
    loadVotes()
  }, [cat.id, jId])

  function assign(rank: number, participantId: string) {
    setVotes(prev => {
      const next = { ...prev }
      for (const r of [1, 2, 3]) {
        if (next[r] === participantId && r !== rank) next[r] = null
      }
      next[rank] = participantId
      return next
    })
    setSaved(false)
  }

  const allAssigned = votes[1] && votes[2] && votes[3] && new Set([votes[1], votes[2], votes[3]]).size === 3

  async function saveVotes() {
    if (!allAssigned || saving) return
    if (event?.status !== 'active') { toast(t('toastNotStarted')); return }
    setSaving(true)
    try {
      await supabase.from('best_trick_votes').delete()
        .eq('category_id', cat.id).eq('judge_id', jId)
      await supabase.from('best_trick_votes').insert([
        { event_id: eventId, category_id: cat.id, judge_id: jId, rank: 1, participant_id: votes[1] },
        { event_id: eventId, category_id: cat.id, judge_id: jId, rank: 2, participant_id: votes[2] },
        { event_id: eventId, category_id: cat.id, judge_id: jId, rank: 3, participant_id: votes[3] },
      ])
      setSaved(true)
      toast(t('btToastVoteSaved'))
    } catch { toast(t('toastError')) } finally { setSaving(false) }
  }

  const rankColors: Record<number, string> = { 1: GOLD, 2: '#94a3b8', 3: '#f97316' }
  const rankLabels: Record<number, string> = { 1: '1°', 2: '2°', 3: '3°' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ background: '#111', borderTop: `2px solid ${GOLD}`, padding: '16px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
          {t('btVoteTitle')}
        </div>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>
          {t('btVoteHint')}
        </div>
      </div>

      {/* Top 3 con sus mejores trucos */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>{t('btTop3Label')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
          {ranked.map((p: any, i: number) => (
            <div key={p.id} style={{ background: '#0a0a0a', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 11, color: '#333', fontWeight: 700, width: 20, textAlign: 'center' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase' }}>{p.display_name || p.profiles?.full_name}</div>
                {p.bestTrick && (
                  <div style={{ fontSize: 11, color: GOLD, marginTop: 3 }}>
                    {p.bestTrick.nombre}
                    <span style={{ color: '#444', fontSize: 10 }}> — {p.bestTrick.score.toFixed(2)} pts</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asignador de posiciones */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>{t('btYourVoteLabel')}</div>
        {[1, 2, 3].map(rank => (
          <div key={rank} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: rankColors[rank], fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              {t('btRankPlace', { rank })}
            </div>
            <div style={{ display: 'flex', gap: 1, background: '#2a2a2a' }}>
              {ranked.map((p: any) => {
                const isSelected = votes[rank] === p.id
                const usedInOther = [1, 2, 3].some(r => r !== rank && votes[r] === p.id)
                return (
                  <button key={p.id} onClick={() => assign(rank, p.id)} disabled={usedInOther}
                    style={{ flex: 1, padding: '12px 8px', border: 'none', cursor: usedInOther ? 'default' : 'pointer', background: isSelected ? rankColors[rank] : usedInOther ? '#0d0d0d' : '#0a0a0a', color: isSelected ? '#000' : usedInOther ? '#222' : '#666', fontWeight: 900, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' }}>
                    {p.display_name || p.profiles?.full_name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      {allAssigned && (
        <div style={{ background: '#111', borderLeft: `3px solid ${GOLD}`, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{t('btYourVoteSummary')}</div>
          {[1, 2, 3].map(rank => {
            const p = ranked.find((r: any) => r.id === votes[rank])
            return (
              <div key={rank} style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: rankColors[rank], width: 28 }}>{rankLabels[rank]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#e8e8e8' }}>{p?.display_name || p?.profiles?.full_name}</span>
              </div>
            )
          })}
        </div>
      )}

      <button onClick={saveVotes} disabled={!allAssigned || saving}
        style={gs.btnGold({
          background: allAssigned && !saved ? GOLD : allAssigned && saved ? '#14532d' : '#1a1a1a',
          color: allAssigned ? (saved ? '#4CAF50' : '#000') : '#444',
          opacity: saving ? 0.7 : 1
        })}>
        {saving ? t('btSaving') : saved ? t('btVoteSaved') : allAssigned ? t('btVoteSave') : t('btVoteAssign')}
      </button>
    </div>
  )
}

export default function JuecesPage() {
  const t = useTranslations('JuecesPage')
  const params = useParams<{ eventId: string }>()
  const router = useRouter()
  const eventId = params?.eventId ?? ''

  const [state, dispatch] = useReducer(reducer, { scorecards: {}, toast: null })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [cats, setCats] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [judges, setJudges] = useState<any[]>([])
  const [confirmations, setConfirmations] = useState<any[]>([])
  const [catIdx, setCatIdx] = useState(0)
  const [partIdx, setPartIdx] = useState(0)
  const [run, setRun] = useState(1)
  const [tricks, setTricks] = useState<any[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const toast = (m: string) => dispatch({ type: 'TOAST', msg: m })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/auth'); return }
      setUser(data.session.user)
      await loadData(data.session.user.id)
      setLoading(false)
    })

    const confirmChannel = supabase.channel(`judge-confirms-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_confirmations', filter: `event_id=eq.${eventId}` },
        async () => {
          const { data } = await supabase.from('round_confirmations').select('*').eq('event_id', eventId)
          if (data) setConfirmations(data)
        })
      .subscribe()

    return () => { supabase.removeChannel(confirmChannel) }
  }, [])

  async function loadData(userId: string) {
    const [evRes, catsRes, partsRes, judgesRes, scsRes, confirmsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('categories').select('*').eq('event_id', eventId),
      supabase.from('participants').select('*, is_finalist').eq('event_id', eventId).order('battery', { ascending: true }),
      supabase.from('judges').select('*').eq('event_id', eventId).eq('status', 'accepted'),
      supabase.from('scorecards').select('*').eq('event_id', eventId),
      supabase.from('round_confirmations').select('*').eq('event_id', eventId),
    ])
    setEvent(evRes.data); setCats(catsRes.data ?? []); setParts(partsRes.data ?? [])
    setJudges(judgesRes.data ?? []); setConfirmations(confirmsRes.data ?? [])
    const scMap: any = {}
    for (const sc of scsRes.data ?? []) {
      const raw = typeof sc.tricks === 'string' ? JSON.parse(sc.tricks) : sc.tricks
      if (!scMap[sc.judge_id]) scMap[sc.judge_id] = {}
      if (!scMap[sc.judge_id][sc.participant_id]) scMap[sc.judge_id][sc.participant_id] = {}
      scMap[sc.judge_id][sc.participant_id][sc.run] = raw
    }
    dispatch({ type: 'SET_SC', sc: scMap })
  }

  const cat = cats[catIdx] || null
  const phase = cat?.phase ?? 'qualification'
  const hasBestTrickFinal = cat?.has_best_trick_final ?? false
  const isFinalPhase = phase === 'final'
  const format = cat?.format || 'formal'
  const isJam = format === 'jam'

  const catParts = cat
    ? (isFinalPhase
        ? parts.filter((p: any) => p.category_id === cat.id && p.is_finalist)
        : parts.filter((p: any) => p.category_id === cat.id))
    : []

  const participant = catParts[partIdx] || null
  const jId = user?.id || ''
  const maxRuns = cat?.max_runs || 2

  function judgeConfirmed(run: number): boolean {
    return confirmations.some(c => c.judge_id === jId && c.category_id === cat?.id && c.run === run)
  }
  function allJudgesConfirmed(run: number): boolean {
    if (!judges.length) return false
    return judges.every((j: any) =>
      confirmations.some(c => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === run)
    )
  }
  function currentEnabledRun(): number {
    if (isFinalPhase) return 2
    if (maxRuns >= 2 && allJudgesConfirmed(1)) return 2
    return 1
  }

  const enabledRun = currentEnabledRun()
  const myConfirmedCurrentRun = judgeConfirmed(isFinalPhase ? 2 : enabledRun)

  async function confirmRound(run: number) {
    if (!cat || !jId) return
    try {
      await supabase.from('round_confirmations').insert({
        event_id: eventId, category_id: cat.id, judge_id: jId, run,
      })
      setConfirmations(prev => [...prev, { event_id: eventId, category_id: cat.id, judge_id: jId, run }])
      toast(t('toastRunConfirmed'))
    } catch { toast(t('toastConfirmError')) }
  }

  useEffect(() => {
    if (!participant || !cat || isJam) return
    const saved = state.scorecards[jId]?.[participant.id]?.[isFinalPhase ? 2 : enabledRun]
    const arr = Array.isArray(saved) ? saved : (saved?.tricks ?? [])
    setTricks(arr); setDirty(false)
  }, [catIdx, partIdx, run, state.scorecards, isFinalPhase, enabledRun, isJam])

  function addTrick(trick: any) { setTricks(prev => [...prev, trick]); setDirty(true) }
  function removeTrick(i: number) { setTricks(prev => prev.filter((_, idx) => idx !== i)); setDirty(true) }

  async function save() {
    if (!participant || saving) return
    if (event.status !== 'active') { toast(t('toastNotStarted')); return }
    setSaving(true)
    const saveRun = isFinalPhase ? 2 : enabledRun
    try {
      const existing = await supabase.from('scorecards').select('id').eq('judge_id', jId).eq('participant_id', participant.id).eq('run', saveRun).maybeSingle()
      if (existing.data) {
        await supabase.from('scorecards').update({ tricks, updated_at: new Date().toISOString() }).eq('judge_id', jId).eq('participant_id', participant.id).eq('run', saveRun)
      } else {
        await supabase.from('scorecards').insert({ event_id: eventId, category_id: cat.id, judge_id: jId, participant_id: participant.id, run: saveRun, tricks })
      }
      const sc = state.scorecards
      const newSc = { ...sc, [jId]: { ...(sc[jId] || {}), [participant.id]: { ...((sc[jId] || {})[participant.id] || {}), [saveRun]: tricks } } }
      dispatch({ type: 'SET_SC', sc: newSc })
      setDirty(false); toast(t('toastSaved'))
    } catch { toast(t('toastError')) } finally { setSaving(false) }
  }

  const totalScore = format === 'jam'
    ? 0 // JAM maneja su propio score internamente
    : format === 'best_trick'
    ? (tricks.filter((t: any) => t.intencion === true).length
        ? Math.max(...tricks.filter((t: any) => t.intencion === true).map((t: any) => t._score || 0))
        : 0)
    : (() => {
        const exitosos = tricks.filter((t: any) => t.intencion === true)
        return exitosos.length > 0 ? exitosos.reduce((s: number, t: any) => s + (t._score || 0), 0) / exitosos.length : 0
      })()

  if (loading) return (
    <div style={{ ...gs.screen, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: GOLD, letterSpacing: -1 }}>{t('loading')}</div>
    </div>
  )

  if (!event) return (
    <div style={{ ...gs.screen, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: GOLD, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>{t('errorEyebrow')}</div>
        <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', marginBottom: 20 }}>{t('errorTitle')}</div>
        <button onClick={() => router.push('/dashboard')} style={gs.btnOutline()}>{t('errorBack')}</button>
      </div>
    </div>
  )

  return (
    <Ctx.Provider value={{ state, dispatch }}>
      <div style={{ ...gs.screen, display: 'flex', flexDirection: 'column' }}>
        <Toast />

        {/* Header */}
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>{user?.user_metadata?.full_name || user?.email}</div>
              <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, marginTop: 2 }}>{event.name}</div>
            </div>
            <button onClick={() => router.push('/dashboard')} style={gs.btnOutline({ padding: '6px 12px' })}>{t('backPanel')}</button>
          </div>
          <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', overflowX: 'auto' }}>
            {cats.map((c, i) => (
              <button key={c.id} onClick={() => { setCatIdx(i); setPartIdx(0); setRun(1) }}
                style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap', background: catIdx === i ? GOLD : '#0a0a0a', color: catIdx === i ? '#000' : '#444' }}>
                {c.name}
                {c.phase === 'final' && <span style={{ marginLeft: 4, fontSize: 8, opacity: 0.7 }}>FINAL</span>}
              </button>
            ))}
          </div>
        </div>

        {!catParts.length ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, color: '#333', letterSpacing: 4, textTransform: 'uppercase' }}>{t('noParticipants')}</div>
          </div>

        ) : format === 'best_trick' ? (
          // ─── RAMA BEST TRICK ─────────────────────────────────────────
          (() => {
            const maxRuns = cat?.max_runs ?? 1
            const lastRun = maxRuns >= 2 ? 2 : 1
            function allJudgesConfirmedRun(run: number): boolean {
              if (!judges.length) return false
              return judges.every((j: any) =>
                confirmations.some((c: any) => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === run)
              )
            }
            const qualDone = allJudgesConfirmedRun(lastRun)
            return qualDone ? (
              <BestTrickVoteView
                parts={catParts}
                jId={jId}
                cat={cat}
                eventId={eventId}
                scorecards={state.scorecards}
                judges={judges}
                toast={toast}
                event={event}
                t={t}
              />
            ) : (
              <BestTrickQualView
                parts={catParts}
                jId={jId}
                cat={cat}
                eventId={eventId}
                scorecards={state.scorecards}
                dispatch={dispatch}
                toast={toast}
                event={event}
                confirmations={confirmations}
                judges={judges}
                setConfirmations={setConfirmations}
                t={t}
              />
            )
          })()

        ) : isJam ? (
          // ─── RAMA JAM ───────────────────────────────────────────────
          isFinalPhase ? (
            hasBestTrickFinal ? (
              // JAM final con best trick
              <JamBestTrickFinalView
                parts={catParts}
                jId={jId}
                cat={cat}
                eventId={eventId}
                scorecards={state.scorecards}
                dispatch={dispatch}
                toast={toast}
                event={event}
                confirmations={confirmations}
                judges={judges}
                setConfirmations={setConfirmations}
                t={t}
              />
            ) : (
              // JAM final con pasada única
              <JamFinalRunView
                parts={catParts}
                jId={jId}
                cat={cat}
                eventId={eventId}
                scorecards={state.scorecards}
                dispatch={dispatch}
                toast={toast}
                event={event}
                confirmations={confirmations}
                judges={judges}
                setConfirmations={setConfirmations}
                t={t}
              />
            )
          ) : (
            // JAM clasificación: pasada 1 y pasada 2
            <JamQualBatteryView
              parts={catParts}
              jId={jId}
              cat={cat}
              eventId={eventId}
              scorecards={state.scorecards}
              dispatch={dispatch}
              toast={toast}
              event={event}
              confirmations={confirmations}
              judges={judges}
              setConfirmations={setConfirmations}
              t={t}
            />
          )

        ) : (
          // ─── RAMA FORMAL / BEST_TRICK ────────────────────────────────
          <>
            <div style={{ background: '#111', borderBottom: '1px solid #2a2a2a', padding: '12px 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => { setPartIdx(Math.max(0, partIdx - 1)); setRun(1) }} disabled={partIdx === 0}
                  style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === 0 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === 0 ? 'default' : 'pointer', fontWeight: 900 }}>‹</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>{t('partNav', { current: partIdx + 1, total: catParts.length })}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{participant?.display_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>{tricks.length} {t('tricksLabel', { count: '' }).trim()}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: GOLD }}>{totalScore.toFixed(2)}{t('ptsLabel')}</span>
                    {dirty && <span style={{ fontSize: 10, color: '#ef4444', letterSpacing: 1 }}>{t('unsavedLabel')}</span>}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 9, color: GOLD, letterSpacing: 3, textTransform: 'uppercase' }}>
                    {isFinalPhase
                      ? (hasBestTrickFinal ? 'Final · Pasada 2 + Best Trick' : 'Final · Pasada 2')
                      : t('run', { n: enabledRun })}
                  </div>
                </div>
                <button onClick={() => { setPartIdx(Math.min(catParts.length - 1, partIdx + 1)); setRun(1) }} disabled={partIdx === catParts.length - 1}
                  style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === catParts.length - 1 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === catParts.length - 1 ? 'default' : 'pointer', fontWeight: 900 }}>›</button>
              </div>
            </div>

            {myConfirmedCurrentRun ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
                <div style={{ fontSize: 48 }}>🔒</div>
                <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, color: '#4CAF50' }}>
                  {t('jamRunConfirmed', { n: isFinalPhase ? 2 : enabledRun })}
                </div>
                <div style={{ fontSize: 11, color: '#444', textAlign: 'center', letterSpacing: 1 }}>
                  {allJudgesConfirmed(isFinalPhase ? 2 : enabledRun)
                    ? t('jamAllConfirmed')
                    : t('jamWaitingConfirm')}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {judges.map((j: any) => {
                    const confirmed = confirmations.some(c => c.judge_id === j.profile_id && c.category_id === cat?.id && c.run === (isFinalPhase ? 2 : enabledRun))
                    return (
                      <div key={j.id} style={{ width: 32, height: 32, background: confirmed ? '#14532d' : '#1a1a1a', border: `1px solid ${confirmed ? '#166534' : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: confirmed ? '#4CAF50' : '#333' }}>
                        {confirmed ? '✓' : '?'}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {format === 'best_trick'
                    ? <BestTrickScorer tricks={tricks} onAdd={(trick: any) => { addTrick(trick); toast(t('toastTrickAdded')) }} onRemove={(i: number) => { removeTrick(i); toast(t('toastTrickRemoved')) }} t={t} />
                    : isFinalPhase && hasBestTrickFinal
                    ? <>
                        <div style={{ padding: '10px 14px', background: '#111', borderBottom: '1px solid #2a2a2a' }}>
                          <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>{t('run', { n: 2 })}</div>
                        </div>
                        <FormalScorer weights={cat?.weights || DEFAULT_W} tricks={tricks} onAdd={(trick: any) => { addTrick(trick); toast(t('toastTrickAdded')) }} onRemove={(i: number) => { removeTrick(i); toast(t('toastTrickRemoved')) }} t={t} />
                        <div style={{ padding: '10px 14px', background: '#111', borderBottom: '1px solid #2a2a2a', borderTop: '2px solid #2a2a2a' }}>
                          <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Best Trick Final — 4 intentos</div>
                        </div>
                        <BestTrickScorerFinal eventId={eventId} catId={cat.id} participantId={participant?.id} jId={jId} scorecards={state.scorecards} dispatch={dispatch} toast={toast} event={event} t={t} />
                      </>
                    : <FormalScorer weights={cat?.weights || DEFAULT_W} tricks={tricks} onAdd={(trick: any) => { addTrick(trick); toast(t('toastTrickAdded')) }} onRemove={(i: number) => { removeTrick(i); toast(t('toastTrickRemoved')) }} t={t} />
                  }
                </div>

                <div style={{ padding: '12px 16px', background: '#0a0a0a', borderTop: '1px solid #2a2a2a', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={save} disabled={saving || !dirty}
                    style={gs.btnGold({ background: dirty ? GOLD : '#1a1a1a', color: dirty ? '#000' : '#444', opacity: saving ? 0.7 : 1 })}>
                    {saving ? t('saving') : dirty ? t('savePlanilla') : t('savedPlanilla')}
                  </button>
                  {!dirty && (
                    <button
                      onClick={() => confirmRound(isFinalPhase ? 2 : enabledRun)}
                      style={{ background: 'transparent', border: '1px solid #4CAF50', padding: '12px 24px', color: '#4CAF50', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>
                      {t('jamConfirmRun', { n: isFinalPhase ? 2 : enabledRun })}
                    </button>
                  )}
                  {dirty && (
                    <div style={{ fontSize: 10, color: '#555', textAlign: 'center', letterSpacing: 1 }}>
                      {t('jamConfirmBeforeSave')}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Ctx.Provider>
  )
}