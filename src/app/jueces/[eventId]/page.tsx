'use client'

import { useState, useEffect, useReducer, createContext, useContext, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

// ─── CONSTANTS ────────────────────────────────────────────────
const GOLD = '#C9A84C'
const JAM_NIVELES = [
  { val: 0.5, label: 'Intento', short: '½', color: '#78350f' },
  { val: 1,   label: 'Entrada', short: 'E', color: '#14532d' },
  { val: 2,   label: 'Básico',  short: 'B', color: '#1e3a5f' },
  { val: 3,   label: 'Nivel',   short: 'N', color: '#3b0764' },
]
const DEFAULT_W = { intencion: 15, dificultad: 30, ejecucion: 30, estilo: 10, secuencia: 15 }
const BT_W      = { intencion: 15, dificultad: 35, ejecucion: 35, estilo: 15 }

function jamScore(t: any) { return t.nivel || 0 }
function formalScore(t: any, w: any) {
  if (!t.intencion) return 0
  return (10 * w.intencion + (t.dificultad / 3 * 10) * w.dificultad + t.ejecucion * w.ejecucion + t.estilo * w.estilo + (t.secuencia ? 10 : 0) * (w.secuencia || 0)) / 100
}
function btScore(t: any) {
  if (!t.intencion) return 0
  return (10 * BT_W.intencion + (t.dificultad / 3 * 10) * BT_W.dificultad + t.ejecucion * BT_W.ejecucion + t.estilo * BT_W.estilo) / 100
}

// ─── CONTEXT ─────────────────────────────────────────────────
const Ctx = createContext<any>(null)
const useJudge = () => useContext(Ctx)

function reducer(s: any, a: any) {
  switch (a.type) {
    case 'SET_SC': return { ...s, scorecards: a.sc }
    case 'TOAST':  return { ...s, toast: a.msg }
    case 'CLR_TOAST': return { ...s, toast: null }
    default: return s
  }
}

// ─── SHARED STYLES ────────────────────────────────────────────
const gs = {
  screen: { minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8', fontFamily: "'Inter',system-ui,sans-serif" } as React.CSSProperties,
  inp: { width: '100%', background: '#111', border: '1px solid #2a2a2a', padding: '13px 14px', color: '#e8e8e8', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', marginBottom: 10 } as React.CSSProperties,
  label: { fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, display: 'block', marginBottom: 8 } as React.CSSProperties,
  btnGold: (extra: any = {}) => ({ background: GOLD, border: 'none', padding: '14px 24px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase' as const, width: '100%', ...extra }),
  btnOutline: (extra: any = {}) => ({ background: 'transparent', border: '1px solid #2a2a2a', padding: '10px 16px', color: '#666', fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' as const, ...extra }),
}

// ─── TOAST ────────────────────────────────────────────────────
function Toast() {
  const { state, dispatch } = useJudge()
  useEffect(() => {
    if (state.toast) { const t = setTimeout(() => dispatch({ type: 'CLR_TOAST' }), 2200); return () => clearTimeout(t) }
  }, [state.toast])
  if (!state.toast) return null
  const isErr = state.toast.startsWith('❌')
  return <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: isErr ? '#ef4444' : GOLD, color: isErr ? '#fff' : '#000', padding: '12px 28px', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none', whiteSpace: 'nowrap' }}>{state.toast}</div>
}

// ─── DRAG NUM ────────────────────────────────────────────────
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

// ─── FORMAL SCORER ───────────────────────────────────────────
function FormalScorer({ weights, tricks, onAdd, onRemove }: any) {
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
        <div style={gs.label}>Intención</div>
        <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => setIntencion(v)} style={{ flex: 1, padding: 14, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 16, background: intencion === v ? (v ? '#14532d' : '#7f1d1d') : '#0a0a0a', color: intencion === v ? '#fff' : '#333' }}>{v ? '✓ SÍ' : '✗ NO'}</button>
          ))}
        </div>
        <div style={{ opacity: intencion ? 1 : 0.2, pointerEvents: intencion ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 14, gap: 8 }}>
            <DragNum label="DIF 0-3"  value={dificultad} onChange={setDificultad} min={0} max={3}  accent={GOLD} />
            <DragNum label="EJE 0-10" value={ejecucion}  onChange={setEjecucion}  min={0} max={10} accent="#e8e8e8" />
            <DragNum label="EST 0-10" value={estilo}     onChange={setEstilo}     min={0} max={10} accent="#888" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #2a2a2a' }}>
            <div style={gs.label}>Secuencia / Línea</div>
            <button onClick={() => setSecuencia(!secuencia)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ width: 44, height: 24, background: secuencia ? '#1e3a5f' : '#2a2a2a', position: 'relative', transition: 'background .2s' }}>
                <div style={{ position: 'absolute', top: 3, left: secuencia ? 22 : 3, width: 18, height: 18, background: secuencia ? GOLD : '#444', transition: 'left .2s' }} />
              </div>
              <span style={{ fontSize: 10, color: secuencia ? GOLD : '#444', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{secuencia ? 'Sí' : 'No'}</span>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, borderTop: '1px solid #2a2a2a', paddingTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={gs.label}>Puntaje truco</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{score.toFixed(2)}</div>
          </div>
          <button onClick={add} style={{ width: 60, height: 60, background: GOLD, border: 'none', color: '#000', fontWeight: 900, fontSize: 28, cursor: 'pointer' }}>+</button>
        </div>
      </div>
      {tricks.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: '#333', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Historial — {tricks.length} trucos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
            {[...tricks].reverse().map((t: any, ri: number) => {
              const i = tricks.length - 1 - ri
              return (
                <div key={i} style={{ background: '#0a0a0a', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 10, color: '#333', width: 16 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 10, color: '#444' }}>Int:{t.intencion ? '✓' : '✗'} · Dif:{t.dificultad} · Eje:{t.ejecucion} · Est:{t.estilo}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: GOLD, minWidth: 44, textAlign: 'right' }}>{(t._score || 0).toFixed(2)}</div>
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

// ─── BEST TRICK SCORER ───────────────────────────────────────
function BestTrickScorer({ tricks, onAdd, onRemove }: any) {
  const [nombre, setNombre] = useState('')
  const [intencion, setIntencion] = useState(true)
  const [dificultad, setDificultad] = useState(1)
  const [ejecucion, setEjecucion] = useState(5)
  const [estilo, setEstilo] = useState(5)
  const score = intencion ? ((10 * BT_W.intencion + (dificultad / 3 * 10) * BT_W.dificultad + ejecucion * BT_W.ejecucion + estilo * BT_W.estilo) / 100) : 0
  const best = tricks.length ? Math.max(...tricks.map((t: any) => t._score || 0)) : 0

  function add() {
    if (!nombre.trim()) return
    onAdd({ nombre: nombre.trim(), intencion, dificultad, ejecucion, estilo, _score: parseFloat(score.toFixed(3)) })
    setNombre(''); setDificultad(1); setEjecucion(5); setEstilo(5); setIntencion(true)
  }

  return (
    <div style={{ padding: 14 }}>
      {best > 0 && (
        <div style={{ background: '#111', borderTop: `2px solid ${GOLD}`, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={gs.label}>Best trick actual</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: GOLD }}>{best.toFixed(2)}</div>
        </div>
      )}
      <div style={{ background: '#111', borderTop: '2px solid #2a2a2a', padding: 16, marginBottom: 14 }}>
        <div style={gs.label}>Nombre del truco</div>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Soul grind baranda kinked" style={gs.inp} />
        <div style={gs.label}>Intención</div>
        <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => setIntencion(v)} style={{ flex: 1, padding: 12, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 15, background: intencion === v ? (v ? '#14532d' : '#7f1d1d') : '#0a0a0a', color: intencion === v ? '#fff' : '#333' }}>{v ? '✓ SÍ' : '✗ NO'}</button>
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
            <div style={gs.label}>Puntaje este truco</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{score.toFixed(2)}</div>
          </div>
          <button onClick={add} disabled={!nombre.trim()} style={{ width: 60, height: 60, background: nombre.trim() ? GOLD : '#1a1a1a', border: 'none', color: nombre.trim() ? '#000' : '#333', fontWeight: 900, fontSize: 28, cursor: nombre.trim() ? 'pointer' : 'default' }}>+</button>
        </div>
      </div>
      {tricks.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: '#333', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Trucos — {tricks.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
            {[...tricks].sort((a: any, b: any) => (b._score || 0) - (a._score || 0)).map((t: any, i: number) => {
              const isBest = t._score === best
              return (
                <div key={i} style={{ background: isBest ? '#111' : '#0a0a0a', borderLeft: isBest ? `3px solid ${GOLD}` : '3px solid transparent', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isBest ? GOLD : '#e8e8e8', marginBottom: 3 }}>{t.nombre}</div>
                    <div style={{ fontSize: 10, color: '#444' }}>Int:{t.intencion ? '✓' : '✗'} · Dif:{t.dificultad} · Eje:{t.ejecucion} · Est:{t.estilo}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: isBest ? GOLD : '#666', minWidth: 44, textAlign: 'right' }}>{(t._score || 0).toFixed(2)}</div>
                  <button onClick={() => onRemove(tricks.indexOf(t))} style={{ width: 28, height: 28, border: '1px solid #2a2a2a', background: 'transparent', color: '#444', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── JAM COLUMN ──────────────────────────────────────────────
function JamColumn({ data, onAdd, onRemoveLast }: any) {
  const total = data.tricks.reduce((s: number, t: any) => s + jamScore(t), 0)
  return (
    <div style={{ flex: 1, background: '#0a0a0a', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ background: '#111', padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#e8e8e8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{data.name}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>{total.toFixed(1)}</div>
        {data.dirty && <div style={{ fontSize: 9, color: '#ef4444', letterSpacing: 1, textTransform: 'uppercase' }}>Sin guardar</div>}
      </div>
      <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {JAM_NIVELES.map(n => (
          <button key={n.val} onClick={() => onAdd(n.val)} style={{ width: '100%', padding: '11px 8px', border: 'none', cursor: 'pointer', background: n.color, color: '#fff', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15 }}>{n.short}</span>
            <span style={{ fontSize: 10 }}>{n.label}</span>
            <span style={{ background: '#ffffff20', padding: '2px 6px', fontSize: 12, fontWeight: 900 }}>{data.tricks.filter((t: any) => t.nivel === n.val).length}</span>
          </button>
        ))}
        <button onClick={onRemoveLast} disabled={!data.tricks.length} style={{ width: '100%', padding: '9px', border: '1px solid #2a2a2a', background: 'transparent', color: data.tricks.length ? '#666' : '#222', cursor: data.tricks.length ? 'pointer' : 'default', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
          ↩ Deshacer
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
        {[...data.tricks].reverse().map((t: any, i: number) => {
          const nObj = JAM_NIVELES.find(n => n.val === t.nivel)
          return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <span style={{ background: nObj?.color, padding: '1px 5px', color: '#fff', fontSize: 9, fontWeight: 900 }}>{nObj?.short}</span>
            <span style={{ fontSize: 10, color: GOLD, fontWeight: 900 }}>{t.nivel}p</span>
          </div>
        })}
      </div>
    </div>
  )
}

// ─── JAM MULTI VIEW ──────────────────────────────────────────
function JamMultiView({ parts, jId, cat, eventId, scorecards, dispatch, toast }: any) {
  const [data, setData] = useState(() =>
    parts.map((p: any) => ({ pId: p.id, name: p.display_name, tricks: scorecards[jId]?.[p.id]?.[1] || [], dirty: false }))
  )
  useEffect(() => {
    setData(parts.map((p: any) => ({ pId: p.id, name: p.display_name, tricks: scorecards[jId]?.[p.id]?.[1] || [], dirty: false })))
  }, [parts.map((p: any) => p.id).join(',')])

  function updateData(idx: number, fn: any) { setData((prev: any) => prev.map((d: any, i: number) => i === idx ? { ...fn(d), dirty: true } : d)) }
  function addTrick(idx: number, nivel: number) { updateData(idx, (d: any) => ({ ...d, tricks: [...d.tricks, { nivel }] })) }
  function removeLast(idx: number) { updateData(idx, (d: any) => ({ ...d, tricks: d.tricks.slice(0, -1) })) }

  async function saveAll() {
    let ok = 0
    for (let idx = 0; idx < data.length; idx++) {
      const d = data[idx]
      if (!d.dirty) continue
      try {
        const existing = await supabase.from('scorecards').select('id').eq('judge_id', jId).eq('participant_id', d.pId).eq('run', 1).maybeSingle()
        if (existing.data) {
          await supabase.from('scorecards').update({ tricks: d.tricks, updated_at: new Date().toISOString() }).eq('judge_id', jId).eq('participant_id', d.pId).eq('run', 1)
        } else {
          await supabase.from('scorecards').insert({ event_id: eventId, category_id: cat.id, judge_id: jId, participant_id: d.pId, run: 1, tricks: d.tricks })
        }
        const sc = scorecards
        const newSc = { ...sc, [jId]: { ...(sc[jId] || {}), [d.pId]: { ...((sc[jId] || {})[d.pId] || {}), 1: d.tricks } } }
        dispatch({ type: 'SET_SC', sc: newSc })
        ok++
      } catch { toast('❌ Error al guardar ' + d.name) }
    }
    if (ok > 0) { setData((prev: any) => prev.map((d: any) => ({ ...d, dirty: false }))); toast('💾 Guardado') }
  }

  const anyDirty = data.some((d: any) => d.dirty)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', gap: 1, background: '#2a2a2a', overflow: 'hidden' }}>
        {data.map((d: any, idx: number) => (
          <JamColumn key={d.pId} data={d} onAdd={(n: number) => addTrick(idx, n)} onRemoveLast={() => removeLast(idx)} />
        ))}
      </div>
      <div style={{ padding: '12px 16px', background: '#0a0a0a', borderTop: '1px solid #2a2a2a', flexShrink: 0 }}>
        <button onClick={saveAll} style={gs.btnGold({ background: anyDirty ? GOLD : '#1a1a1a', color: anyDirty ? '#000' : '#444' })}>
          {anyDirty ? 'Guardar batería' : '✓ Guardado'}
        </button>
      </div>
    </div>
  )
}

// ─── JAM BATTERY VIEW ────────────────────────────────────────
function JamBatteryView({ parts, jId, cat, eventId, scorecards, dispatch, toast }: any) {
  const batteryMap: Record<number, any[]> = {}
  for (const p of parts) {
    const b = p.battery || 1
    if (!batteryMap[b]) batteryMap[b] = []
    batteryMap[b].push(p)
  }
  const batteryNums = Object.keys(batteryMap).map(Number).sort((a, b) => a - b)
  const [batIdx, setBatIdx] = useState(0)
  const currentBatNum = batteryNums[batIdx]
  const battery = batteryMap[currentBatNum] || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ background: '#111', borderBottom: '1px solid #2a2a2a', padding: '10px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setBatIdx(Math.max(0, batIdx - 1))} disabled={batIdx === 0}
            style={{ width: 36, height: 36, border: '1px solid #2a2a2a', background: 'transparent', color: batIdx === 0 ? '#2a2a2a' : '#e8e8e8', fontSize: 18, cursor: batIdx === 0 ? 'default' : 'pointer', fontWeight: 900 }}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>batería {batIdx + 1} / {batteryNums.length}</div>
            <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', color: GOLD }}>Batería {currentBatNum}</div>
            <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{battery.map((p: any) => p.display_name).join(' · ')}</div>
          </div>
          <button onClick={() => setBatIdx(Math.min(batteryNums.length - 1, batIdx + 1))} disabled={batIdx === batteryNums.length - 1}
            style={{ width: 36, height: 36, border: '1px solid #2a2a2a', background: 'transparent', color: batIdx === batteryNums.length - 1 ? '#2a2a2a' : '#e8e8e8', fontSize: 18, cursor: batIdx === batteryNums.length - 1 ? 'default' : 'pointer', fontWeight: 900 }}>›</button>
        </div>
        {batteryNums.length > 1 && (
          <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginTop: 8 }}>
            {batteryNums.map((bn, i) => (
              <button key={bn} onClick={() => setBatIdx(i)} style={{ flex: 1, padding: '6px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 11, background: batIdx === i ? GOLD : '#0a0a0a', color: batIdx === i ? '#000' : '#444' }}>B{bn}</button>
            ))}
          </div>
        )}
      </div>
      <JamMultiView key={batIdx} parts={battery} jId={jId} cat={cat} eventId={eventId} scorecards={scorecards} dispatch={dispatch} toast={toast} />
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function JuecesPage() {
  const params = useParams<{ eventId: string }>()
  const router = useRouter()
  const eventId = params?.eventId ?? ''

  const [state, dispatch] = useReducer(reducer, { scorecards: {}, toast: null })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [cats, setCats] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
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
  }, [])

  async function loadData(userId: string) {
    const [evRes, catsRes, partsRes, scsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('categories').select('*').eq('event_id', eventId),
      supabase.from('participants').select('*').eq('event_id', eventId).order('battery', { ascending: true }),
      supabase.from('scorecards').select('*').eq('event_id', eventId),
    ])
    setEvent(evRes.data)
    setCats(catsRes.data ?? [])
    setParts(partsRes.data ?? [])
    const scMap: any = {}
    for (const sc of scsRes.data ?? []) {
      const tricks = typeof sc.tricks === 'string' ? JSON.parse(sc.tricks) : sc.tricks
      if (!scMap[sc.judge_id]) scMap[sc.judge_id] = {}
      if (!scMap[sc.judge_id][sc.participant_id]) scMap[sc.judge_id][sc.participant_id] = {}
      scMap[sc.judge_id][sc.participant_id][sc.run] = tricks
    }
    dispatch({ type: 'SET_SC', sc: scMap })
  }

  const cat = cats[catIdx] || null
  const catParts = cat ? parts.filter(p => p.category_id === cat.id) : []
  const participant = catParts[partIdx] || null
  const jId = user?.id || ''
  const format = cat?.format || 'formal'
  const maxRuns = cat?.max_runs || 2

  useEffect(() => {
    if (!participant || !cat) return
    const saved = state.scorecards[jId]?.[participant.id]?.[run] || []
    setTricks(saved); setDirty(false)
  }, [catIdx, partIdx, run, state.scorecards])

  function addTrick(t: any) { setTricks(prev => [...prev, t]); setDirty(true) }
  function removeTrick(i: number) { setTricks(prev => prev.filter((_, idx) => idx !== i)); setDirty(true) }

  async function save() {
    if (!participant || saving) return
    setSaving(true)
    try {
      const existing = await supabase.from('scorecards').select('id').eq('judge_id', jId).eq('participant_id', participant.id).eq('run', run).maybeSingle()
      if (existing.data) {
        await supabase.from('scorecards').update({ tricks, updated_at: new Date().toISOString() }).eq('judge_id', jId).eq('participant_id', participant.id).eq('run', run)
      } else {
        await supabase.from('scorecards').insert({ event_id: eventId, category_id: cat.id, judge_id: jId, participant_id: participant.id, run, tricks })
      }
      const sc = state.scorecards
      const newSc = { ...sc, [jId]: { ...(sc[jId] || {}), [participant.id]: { ...((sc[jId] || {})[participant.id] || {}), [run]: tricks } } }
      dispatch({ type: 'SET_SC', sc: newSc })
      setDirty(false); toast('💾 Guardado')
    } catch { toast('❌ Error al guardar') } finally { setSaving(false) }
  }

  const totalScore = format === 'jam' ? tricks.reduce((s, t) => s + jamScore(t), 0)
    : format === 'best_trick' ? (tricks.length ? Math.max(...tricks.map(t => t._score || 0)) : 0)
    : tricks.reduce((s, t) => s + (t._score || 0), 0)

  if (loading) return (
    <div style={{ ...gs.screen, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: GOLD, letterSpacing: -1 }}>CARGANDO</div>
    </div>
  )

  if (!event) return (
    <div style={{ ...gs.screen, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: GOLD, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Error</div>
        <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', marginBottom: 20 }}>Evento no encontrado</div>
        <button onClick={() => router.push('/dashboard')} style={gs.btnOutline()}>Volver</button>
      </div>
    </div>
  )

  return (
    <Ctx.Provider value={{ state, dispatch }}>
      <div style={{ ...gs.screen, display: 'flex', flexDirection: 'column' }}>
        <Toast />

        {/* TOP BAR */}
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>{user?.user_metadata?.full_name || user?.email}</div>
              <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, marginTop: 2 }}>{event.name}</div>
            </div>
            <button onClick={() => router.push('/dashboard')} style={gs.btnOutline({ padding: '6px 12px' })}>← Panel</button>
          </div>
          <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', overflowX: 'auto' }}>
            {cats.map((c, i) => (
              <button key={c.id} onClick={() => { setCatIdx(i); setPartIdx(0); setRun(1) }} style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap', background: catIdx === i ? GOLD : '#0a0a0a', color: catIdx === i ? '#000' : '#444' }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {!catParts.length ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, color: '#333', letterSpacing: 4, textTransform: 'uppercase' }}>Sin participantes</div>
          </div>
        ) : format === 'jam' ? (
          <JamBatteryView parts={catParts} jId={jId} cat={cat} eventId={eventId} scorecards={state.scorecards} dispatch={dispatch} toast={toast} />
        ) : (
          <>
            {/* NAV PARTICIPANTE */}
            <div style={{ background: '#111', borderBottom: '1px solid #2a2a2a', padding: '12px 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => { setPartIdx(Math.max(0, partIdx - 1)); setRun(1) }} disabled={partIdx === 0}
                  style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === 0 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === 0 ? 'default' : 'pointer', fontWeight: 900 }}>‹</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>{partIdx + 1} / {catParts.length}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{participant?.display_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>{tricks.length} trucos</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: GOLD }}>{format === 'best_trick' ? 'BEST: ' : '/ '}{totalScore.toFixed(2)} pts</span>
                    {dirty && <span style={{ fontSize: 10, color: '#ef4444', letterSpacing: 1 }}>SIN GUARDAR</span>}
                  </div>
                </div>
                <button onClick={() => { setPartIdx(Math.min(catParts.length - 1, partIdx + 1)); setRun(1) }} disabled={partIdx === catParts.length - 1}
                  style={{ width: 40, height: 40, border: '1px solid #2a2a2a', background: 'transparent', color: partIdx === catParts.length - 1 ? '#2a2a2a' : '#e8e8e8', fontSize: 20, cursor: partIdx === catParts.length - 1 ? 'default' : 'pointer', fontWeight: 900 }}>›</button>
              </div>
              {format === 'formal' && (
                <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginTop: 10 }}>
                  {Array.from({ length: maxRuns }, (_, i) => i + 1).map((r: number) => (
                    <button key={r} onClick={() => setRun(r)} style={{ flex: 1, padding: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', background: run === r ? GOLD : '#0a0a0a', color: run === r ? '#000' : '#444' }}>Pasada {r}</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {format === 'best_trick'
                ? <BestTrickScorer tricks={tricks} onAdd={(t: any) => { addTrick(t); toast('✅ Truco agregado') }} onRemove={(i: number) => { removeTrick(i); toast('🗑️ Eliminado') }} />
                : <FormalScorer weights={cat?.weights || DEFAULT_W} tricks={tricks} onAdd={(t: any) => { addTrick(t); toast('✅ Truco agregado') }} onRemove={(i: number) => { removeTrick(i); toast('🗑️ Eliminado') }} />
              }
            </div>

            <div style={{ padding: '12px 16px', background: '#0a0a0a', borderTop: '1px solid #2a2a2a', flexShrink: 0 }}>
              <button onClick={save} disabled={saving} style={gs.btnGold({ background: dirty ? GOLD : '#1a1a1a', color: dirty ? '#000' : '#444', opacity: saving ? 0.7 : 1 })}>
                {saving ? 'Guardando...' : dirty ? 'Guardar planilla' : '✓ Guardado'}
              </button>
            </div>
          </>
        )}
      </div>
    </Ctx.Provider>
  )
}