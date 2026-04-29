'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import type { User } from '@supabase/supabase-js'
import type { Event, Category, Participant } from '@/lib/supabase'

const inp: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  padding: '12px 14px', color: '#e8e8e8', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', marginBottom: 10,
  fontFamily: 'inherit',
}

function uid() { return Math.random().toString(36).slice(2, 10) }

export default function ManageEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [ev, setEv] = useState<Event | null>(null)
  const [cats, setCats] = useState<Category[]>([])
  const [parts, setParts] = useState<Participant[]>([])
  const [judges, setJudges] = useState<any[]>([])
  const [tab, setTab] = useState<'info' | 'cats' | 'parts' | 'judges'>('info')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/auth'); return }
      setUser(data.session.user)
      loadAll()
    })
  }, [])

  async function loadAll() {
    setLoading(true)
    const [evRes, catsRes, partsRes, judgesRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('categories').select('*').eq('event_id', eventId),
      supabase.from('participants').select('*').eq('event_id', eventId),
      supabase.from('judges').select('*, profiles(full_name, avatar_url)').eq('event_id', eventId),
    ])
    setEv(evRes.data); setCats(catsRes.data ?? [])
    setParts(partsRes.data ?? []); setJudges(judgesRes.data ?? [])
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function updateStatus(status: string) {
    const { error } = await supabase.from('events').update({ status }).eq('id', eventId)
    if (error) { showToast('❌ Error'); return }
    setEv(prev => prev ? { ...prev, status: status as any } : prev)
    showToast('✅ Estado actualizado')

    // Si se publica, notificar a todos los usuarios
    if (status === 'published') {
      await fetch('/api/events/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ padding: 80, textAlign: 'center', color: '#444', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>Cargando...</div>
    </div>
  )

  if (!ev) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ padding: 80, textAlign: 'center', color: '#ef4444' }}>Evento no encontrado</div>
    </div>
  )

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'cats', label: 'Categorías' },
    { id: 'parts', label: 'Participantes' },
    { id: 'judges', label: 'Jueces' },
  ] as const

  const statusOptions = [
    { value: 'draft', label: 'Borrador', color: '#444' },
    { value: 'published', label: 'Publicar', color: '#C9A84C' },
    { value: 'active', label: 'Activar', color: '#4CAF50' },
    { value: 'finished', label: 'Finalizar', color: '#666' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <Nav />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.startsWith('❌') ? '#ef4444' : '#C9A84C', color: toast.startsWith('❌') ? '#fff' : '#000', padding: '11px 28px', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '32px 24px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20, fontWeight: 700 }}>
            ← Mis eventos
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 8, textTransform: 'uppercase' }}>Gestionar evento</div>
              <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{ev.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', flexWrap: 'wrap' }}>
              {statusOptions.map(s => (
                <button key={s.value} onClick={() => updateStatus(s.value)} style={{
                  padding: '10px 16px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10,
                  letterSpacing: 2, textTransform: 'uppercase',
                  background: ev.status === s.value ? s.color : '#0a0a0a',
                  color: ev.status === s.value ? (s.value === 'published' ? '#000' : '#fff') : '#444',
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '12px 20px', border: 'none', cursor: 'pointer', fontWeight: 700,
                fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                background: 'transparent',
                color: tab === t.id ? '#C9A84C' : '#444',
                borderBottom: tab === t.id ? '2px solid #C9A84C' : '2px solid transparent',
                marginBottom: -1,
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        {tab === 'info'   && <InfoTab ev={ev} setEv={setEv} eventId={eventId} showToast={showToast} />}
        {tab === 'cats'   && <CatsTab cats={cats} setCats={setCats} eventId={eventId} showToast={showToast} />}
        {tab === 'parts'  && <PartsTab parts={parts} setParts={setParts} cats={cats} eventId={eventId} showToast={showToast} />}
        {tab === 'judges' && <JudgesTab judges={judges} setJudges={setJudges} eventId={eventId} showToast={showToast} />}
      </div>
    </div>
  )
}

// ─── INFO TAB ─────────────────────────────────────────────────
function InfoTab({ ev, setEv, eventId, showToast }: any) {
  const [f, setF] = useState({
    name: ev.name, city: ev.city ?? '', country: ev.country ?? 'AR',
    event_date: ev.event_date ?? '', event_time: ev.event_time?.slice(0,5) ?? '',
    location_name: ev.location_name ?? '', address: ev.address ?? '', description: ev.description ?? ''
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('events').update(f).eq('id', eventId)
    setSaving(false)
    if (error) { showToast('❌ Error al guardar'); return }
    setEv((prev: any) => ({ ...prev, ...f }))
    showToast('✅ Evento actualizado')
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>Información del evento</div>
      <input placeholder="Nombre *" value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} style={inp} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input placeholder="Ciudad" value={f.city} onChange={e => setF(x => ({ ...x, city: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
        <input placeholder="País" value={f.country} onChange={e => setF(x => ({ ...x, country: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
      </div>
      <div style={{ marginBottom: 10 }} />
      <input placeholder="Nombre del lugar" value={f.location_name} onChange={e => setF(x => ({ ...x, location_name: e.target.value }))} style={inp} />
      <input placeholder="Dirección" value={f.address} onChange={e => setF(x => ({ ...x, address: e.target.value }))} style={inp} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input type="date" value={f.event_date} onChange={e => setF(x => ({ ...x, event_date: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
        <input type="time" value={f.event_time} onChange={e => setF(x => ({ ...x, event_time: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
      </div>
      <div style={{ marginBottom: 10 }} />
      <textarea placeholder="Descripción" value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))}
        style={{ ...inp, minHeight: 80, resize: 'vertical' }} />
      <button onClick={save} disabled={saving} style={{ background: '#C9A84C', border: 'none', padding: '12px 28px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ─── CATS TAB ─────────────────────────────────────────────────
function CatsTab({ cats, setCats, eventId, showToast }: any) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState('formal')
  const [maxRuns, setMaxRuns] = useState(2)
  const [consolidation, setConsolidation] = useState('best_run')
  const [saving, setSaving] = useState(false)
  const fmtL: Record<string,string> = { formal:'Torneo Formal', jam:'Jam', mixto:'Mixto' }
  const consL: Record<string,string> = { best_run:'Mejor pasada', sum_runs:'Suma', best_trick:'Best Trick' }

  async function addCat() {
    if (!name.trim()) return
    setSaving(true)
    const weights = format === 'mixto' ? { intencion:15,dificultad:20,ejecucion:25,estilo:20,secuencia:20 } : { intencion:15,dificultad:30,ejecucion:30,estilo:10,secuencia:15 }
    const { data, error } = await supabase.from('categories').insert({ event_id:eventId, name, format, max_runs:maxRuns, consolidation, weights }).select().single()
    setSaving(false)
    if (error) { showToast('❌ Error: ' + error.message); return }
    setCats((prev: any) => [...prev, data])
    setName(''); showToast('✅ Categoría creada')
  }

  async function delCat(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCats((prev: any) => prev.filter((c: any) => c.id !== id))
    showToast('Categoría eliminada')
  }

  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 16px' }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>Categorías</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 32 }}>
        {cats.length === 0 && <div style={{ background: '#0a0a0a', padding: 24, color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Sin categorías</div>}
        {cats.map((cat: any) => (
          <div key={cat.id} style={{ background: '#0a0a0a', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.3 }}>{cat.name}</div>
              <div style={{ color: '#444', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>
                {fmtL[cat.format]}{cat.format !== 'jam' ? ' · ' + cat.max_runs + ' pasadas · ' + consL[cat.consolidation] : ''}
              </div>
            </div>
            <button onClick={() => delCat(cat.id)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666' }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '2px solid #C9A84C', paddingTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 16, textTransform: 'uppercase' }}>Nueva categoría</div>
        <input placeholder="Nombre *" value={name} onChange={e => setName(e.target.value)} style={inp} />
        <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Formato</div>
        <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
          {['formal','jam','mixto'].map(f => <button key={f} onClick={() => setFormat(f)} style={{ ...btnBase, flex: 1, background: format === f ? '#C9A84C' : '#0a0a0a', color: format === f ? '#000' : '#444' }}>{fmtL[f]}</button>)}
        </div>
        {format !== 'jam' && (
          <>
            <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Pasadas máximas</div>
            <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
              {[1,2,3].map(n => <button key={n} onClick={() => setMaxRuns(n)} style={{ ...btnBase, flex: 1, background: maxRuns === n ? '#C9A84C' : '#0a0a0a', color: maxRuns === n ? '#000' : '#444' }}>{n}</button>)}
            </div>
            <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Consolidación</div>
            <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
              {[['best_run','Mejor pasada'],['sum_runs','Suma'],['best_trick','Best Trick']].map(([v,l]) => <button key={v} onClick={() => setConsolidation(v)} style={{ ...btnBase, flex: 1, background: consolidation === v ? '#C9A84C' : '#0a0a0a', color: consolidation === v ? '#000' : '#444' }}>{l}</button>)}
            </div>
          </>
        )}
        <button onClick={addCat} disabled={saving} style={{ ...btnBase, background: '#C9A84C', color: '#000', padding: '12px 28px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Creando...' : 'Agregar categoría'}
        </button>
      </div>
    </div>
  )
}

// ─── PARTS TAB ────────────────────────────────────────────────
function PartsTab({ parts, setParts, cats, eventId, showToast }: any) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [catId, setCatId] = useState(cats[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 16px' }

  async function addPart() {
    if (!email.trim() || !displayName.trim() || !catId) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('❌ No hay sesión activa'); setSaving(false); return }
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: email.trim(), displayName: displayName.trim(), eventId, role: 'participant', categoryId: catId }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast('❌ ' + (data.error || 'Error')); return }
    showToast(data.hadAccount ? '✅ Participante agregado' : '✅ Invitación enviada')
    setEmail(''); setDisplayName('')
    const { data: partsData } = await supabase.from('participants').select('*').eq('event_id', eventId)
    if (partsData) setParts(partsData)
  }

  async function delPart(id: string) {
    await supabase.from('participants').delete().eq('id', id)
    setParts((prev: any) => prev.filter((p: any) => p.id !== id))
    showToast('Participante eliminado')
  }

  async function updateBattery(partId: string, battery: number) {
    const { error } = await supabase.from('participants').update({ battery }).eq('id', partId)
    if (error) { showToast('❌ Error al actualizar batería'); return }
    setParts((prev: any) => prev.map((p: any) => p.id === partId ? { ...p, battery } : p))
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>Participantes</div>
      {cats.map((cat: any) => {
        const catParts = parts.filter((p: any) => p.category_id === cat.id)
        const isJam = cat.format === 'jam'
        const maxBattery = isJam ? Math.max(1, ...catParts.map((p: any) => p.battery || 1)) : 1
        return (
          <div key={cat.id} style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
              {cat.name} {isJam && <span style={{ color: '#444' }}>· JAM</span>}
            </div>

            {/* Vista por baterías para Jam */}
            {isJam && catParts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
                  Baterías configuradas
                </div>
                <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 12, flexWrap: 'wrap' }}>
                  {Array.from({ length: maxBattery }, (_, i) => i + 1).map(b => {
                    const bParts = catParts.filter((p: any) => (p.battery || 1) === b)
                    return (
                      <div key={b} style={{ background: '#0a0a0a', padding: '10px 14px', flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                          Batería {b}
                        </div>
                        {bParts.length === 0
                          ? <div style={{ fontSize: 10, color: '#333' }}>Vacía</div>
                          : bParts.map((p: any) => (
                            <div key={p.id} style={{ fontSize: 11, color: '#e8e8e8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                              {p.display_name}
                            </div>
                          ))
                        }
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
              {catParts.length === 0 && (
                <div style={{ background: '#0a0a0a', padding: '14px 20px', color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                  Sin participantes
                </div>
              )}
              {catParts.map((p: any) => (
                <div key={p.id} style={{ background: '#0a0a0a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>{p.display_name}</div>
                    <div style={{ fontSize: 10, color: p.status === 'confirmed' ? '#4CAF50' : '#C9A84C', letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>
                      {p.status === 'confirmed' ? 'Confirmado' : 'Pendiente — sin cuenta'}
                    </div>
                  </div>

                  {/* Selector de batería solo para Jam */}
                  {isJam && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>BAT</span>
                      <div style={{ display: 'flex', gap: 1, background: '#2a2a2a' }}>
                        {[1, 2, 3, 4, 5].map(b => (
                          <button
                            key={b}
                            onClick={() => updateBattery(p.id, b)}
                            style={{
                              width: 28, height: 28, border: 'none', cursor: 'pointer',
                              fontWeight: 900, fontSize: 11,
                              background: (p.battery || 1) === b ? '#C9A84C' : '#0a0a0a',
                              color: (p.battery || 1) === b ? '#000' : '#444',
                            }}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => delPart(p.id)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div style={{ borderTop: '2px solid #C9A84C', paddingTop: 24, marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 16, textTransform: 'uppercase' }}>Nuevo participante</div>
        <input placeholder="Nombre completo *" value={displayName} onChange={e => setDisplayName(e.target.value)} style={inp} />
        <input placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} type="email" style={inp} />
        <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Categoría</div>
        <select value={catId} onChange={e => setCatId(e.target.value)} style={{ ...inp, marginBottom: 8 }}>
          {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ fontSize: 11, color: '#444', marginBottom: 16, letterSpacing: 1 }}>
          Si ya tiene cuenta queda confirmado. Si no, le llega un email para registrarse.
        </div>
        <button onClick={addPart} disabled={saving} style={{ ...btnBase, background: '#C9A84C', color: '#000', padding: '12px 28px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Agregando...' : 'Agregar participante'}
        </button>
      </div>
    </div>
  )
}

// ─── JUDGES TAB ───────────────────────────────────────────────
function JudgesTab({ judges, setJudges, eventId, showToast }: any) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 16px' }

  async function inviteJudge() {
    if (!email.trim() || !displayName.trim()) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('❌ No hay sesión activa'); setSaving(false); return }

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: email.trim(),
        displayName: displayName.trim(),
        eventId,
        role: 'judge',
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast('❌ ' + (data.error || 'Error')); return }
    showToast(data.hadAccount ? '✅ Juez agregado' : '✅ Invitación enviada')
    setEmail('')
    setDisplayName('')
    const { data: judgesData } = await supabase.from('judges').select('*, profiles(full_name, avatar_url)').eq('event_id', eventId)
    if (judgesData) setJudges(judgesData)
  }

  async function removeJudge(id: string) {
    await supabase.from('judges').delete().eq('id', id)
    setJudges((prev: any) => prev.filter((j: any) => j.id !== id))
    showToast('Juez eliminado')
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>Jueces</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 32 }}>
        {judges.length === 0 && <div style={{ background: '#0a0a0a', padding: 24, color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Sin jueces asignados</div>}
        {judges.map((j: any) => (
          <div key={j.id} style={{ background: '#0a0a0a', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 32, height: 32, background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
              {(j.profiles?.full_name ?? j.display_name ?? '?')[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>{j.profiles?.full_name ?? j.display_name ?? 'Juez'}</div>
              <div style={{ fontSize: 10, color: j.status === 'confirmed' ? '#4CAF50' : '#C9A84C', letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>
                {j.status === 'confirmed' ? 'Confirmado' : 'Pendiente — sin cuenta'}
              </div>
            </div>
            <button onClick={() => removeJudge(j.id)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666' }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '2px solid #C9A84C', paddingTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 16, textTransform: 'uppercase' }}>Invitar juez</div>
        <input
          placeholder="Nombre completo *"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          style={inp}
        />
        <input
          placeholder="Email *"
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          style={inp}
        />
        <div style={{ fontSize: 11, color: '#444', marginBottom: 16, letterSpacing: 1 }}>
          Si ya tiene cuenta queda confirmado. Si no, le llega un email para registrarse.
        </div>
        <button onClick={inviteJudge} disabled={saving} style={{ ...btnBase, background: '#C9A84C', color: '#000', padding: '12px 28px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Invitando...' : 'Invitar juez'}
        </button>
      </div>
    </div>
  )
}