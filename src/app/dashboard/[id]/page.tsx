'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import type { User } from '@supabase/supabase-js'
import type { Event, Category, Participant } from '@/lib/supabase'

const inp: React.CSSProperties = {
  width: '100%', background: '#0f172a', border: '1px solid #334155',
  borderRadius: 9, padding: '11px 13px', color: '#e2e8f0', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', marginBottom: 10
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
    setEv(evRes.data)
    setCats(catsRes.data ?? [])
    setParts(partsRes.data ?? [])
    setJudges(judgesRes.data ?? [])
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
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <Nav />
      <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>Cargando...</div>
    </div>
  )

  if (!ev) return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <Nav />
      <div style={{ textAlign: 'center', padding: 80, color: '#ef4444' }}>Evento no encontrado</div>
    </div>
  )

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'cats', label: 'Categorías' },
    { id: 'parts', label: 'Participantes' },
    { id: 'judges', label: 'Jueces' },
  ] as const

  const statusOptions = [
    { value: 'draft', label: 'Borrador', color: '#64748b' },
    { value: 'published', label: 'Publicar', color: '#4f46e5' },
    { value: 'active', label: 'Activar (En vivo)', color: '#22c55e' },
    { value: 'finished', label: 'Finalizar', color: '#94a3b8' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Nav />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.startsWith('❌') ? '#dc2626' : '#22c55e', color: '#fff', padding: '11px 28px', borderRadius: 999, fontWeight: 700, fontSize: 14, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#1e1b4b', borderBottom: '1px solid #312e81', padding: '20px 20px 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, marginBottom: 12 }}>
            ← Mis eventos
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>GESTIONAR EVENTO</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '6px 0 0' }}>{ev.name}</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {statusOptions.map(s => (
                <button key={s.value} onClick={() => updateStatus(s.value)}
                  style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                    background: ev.status === s.value ? s.color : '#1e293b',
                    color: ev.status === s.value ? '#fff' : '#64748b' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  background: 'transparent', color: tab === t.id ? '#fff' : '#64748b',
                  borderBottom: tab === t.id ? '2px solid #818cf8' : '2px solid transparent' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
        {tab === 'info' && <InfoTab ev={ev} setEv={setEv} eventId={eventId} showToast={showToast} />}
        {tab === 'cats' && <CatsTab cats={cats} setCats={setCats} eventId={eventId} showToast={showToast} />}
        {tab === 'parts' && <PartsTab parts={parts} setParts={setParts} cats={cats} eventId={eventId} showToast={showToast} />}
        {tab === 'judges' && <JudgesTab judges={judges} setJudges={setJudges} eventId={eventId} showToast={showToast} />}
      </div>
    </div>
  )
}

// ─── INFO TAB ─────────────────────────────────────────────────
function InfoTab({ ev, setEv, eventId, showToast }: any) {
  const [f, setF] = useState({ name: ev.name, city: ev.city ?? '', country: ev.country ?? 'AR', event_date: ev.event_date ?? '', event_time: ev.event_time?.slice(0,5) ?? '', location_name: ev.location_name ?? '', address: ev.address ?? '', description: ev.description ?? '' })
  const [saving, setSaving] = useState(false)
  const inp2: React.CSSProperties = { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 9, padding: '11px 13px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }

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
      <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>INFORMACIÓN DEL EVENTO</div>
      <input placeholder="Nombre *" value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} style={inp2} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input placeholder="Ciudad" value={f.city} onChange={e => setF(x => ({ ...x, city: e.target.value }))} style={{ ...inp2, marginBottom: 0 }} />
        <input placeholder="País" value={f.country} onChange={e => setF(x => ({ ...x, country: e.target.value }))} style={{ ...inp2, marginBottom: 0 }} />
      </div>
      <div style={{ marginBottom: 10 }} />
      <input placeholder="Nombre del lugar" value={f.location_name} onChange={e => setF(x => ({ ...x, location_name: e.target.value }))} style={inp2} />
      <input placeholder="Dirección" value={f.address} onChange={e => setF(x => ({ ...x, address: e.target.value }))} style={inp2} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input type="date" value={f.event_date} onChange={e => setF(x => ({ ...x, event_date: e.target.value }))} style={{ ...inp2, marginBottom: 0 }} />
        <input type="time" value={f.event_time} onChange={e => setF(x => ({ ...x, event_time: e.target.value }))} style={{ ...inp2, marginBottom: 0 }} />
      </div>
      <div style={{ marginBottom: 10 }} />
      <textarea placeholder="Descripción" value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} style={{ ...inp2, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
      <button onClick={save} disabled={saving} style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 9, padding: '12px 24px', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
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

  async function addCat() {
    if (!name.trim()) return
    setSaving(true)
    const newCat = { event_id: eventId, name, format, max_runs: maxRuns, consolidation, weights: format === 'mixto' ? { intencion:15,dificultad:20,ejecucion:25,estilo:20,secuencia:20 } : { intencion:15,dificultad:30,ejecucion:30,estilo:10,secuencia:15 } }
    const { data, error } = await supabase.from('categories').insert(newCat).select().single()
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

  const fmtL: Record<string, string> = { formal: 'Torneo Formal', jam: 'Jam', mixto: 'Mixto' }
  const consL: Record<string, string> = { best_run: 'Mejor pasada', sum_runs: 'Suma', best_trick: 'Best Trick' }

  return (
    <div>
      <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>CATEGORÍAS</div>
      {cats.map((cat: any) => (
        <div key={cat.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{cat.name}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>{fmtL[cat.format]}{cat.format !== 'jam' ? ' · ' + cat.max_runs + ' pasadas · ' + consL[cat.consolidation] : ''}</div>
          </div>
          <button onClick={() => delCat(cat.id)} style={{ background: '#dc262622', border: '1px solid #dc262644', borderRadius: 8, padding: '6px 12px', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✕</button>
        </div>
      ))}
      <div style={{ background: '#1e1b4b', border: '1px solid #4338ca', borderRadius: 14, padding: 20, marginTop: 16 }}>
        <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>NUEVA CATEGORÍA</div>
        <input placeholder="Nombre de la categoría *" value={name} onChange={e => setName(e.target.value)} style={{ ...inp, marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>FORMATO</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['formal','jam','mixto'].map(f => <button key={f} onClick={() => setFormat(f)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: format === f ? '#4f46e5' : '#0f172a', color: format === f ? '#fff' : '#64748b' }}>{fmtL[f]}</button>)}
          </div>
        </div>
        {format !== 'jam' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>PASADAS MÁXIMAS</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3].map(n => <button key={n} onClick={() => setMaxRuns(n)} style={{ width: 48, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: maxRuns === n ? '#4f46e5' : '#0f172a', color: maxRuns === n ? '#fff' : '#64748b' }}>{n}</button>)}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>CONSOLIDACIÓN</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['best_run','Mejor pasada'],['sum_runs','Suma'],['best_trick','Best Trick']].map(([v,l]) => <button key={v} onClick={() => setConsolidation(v)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: consolidation === v ? '#4f46e5' : '#0f172a', color: consolidation === v ? '#fff' : '#64748b' }}>{l}</button>)}
              </div>
            </div>
          </>
        )}
        <button onClick={addCat} disabled={saving} style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 9, padding: '12px 24px', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Creando...' : 'Agregar categoría'}
        </button>
      </div>
    </div>
  )
}

// ─── PARTS TAB ────────────────────────────────────────────────
function PartsTab({ parts, setParts, cats, eventId, showToast }: any) {
  const [name, setName] = useState('')
  const [catId, setCatId] = useState(cats[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  async function addPart() {
    if (!name.trim() || !catId) return
    setSaving(true)
    const { data, error } = await supabase.from('participants').insert({ event_id: eventId, category_id: catId, display_name: name.trim() }).select().single()
    setSaving(false)
    if (error) { showToast('❌ Error: ' + error.message); return }
    setParts((prev: any) => [...prev, data])
    setName(''); showToast('✅ Participante agregado')
  }

  async function delPart(id: string) {
    await supabase.from('participants').delete().eq('id', id)
    setParts((prev: any) => prev.filter((p: any) => p.id !== id))
    showToast('Participante eliminado')
  }

  return (
    <div>
      <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>PARTICIPANTES</div>
      {cats.map((cat: any) => {
        const catParts = parts.filter((p: any) => p.category_id === cat.id)
        return (
          <div key={cat.id} style={{ marginBottom: 24 }}>
            <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{cat.name}</div>
            {catParts.length === 0 && <div style={{ color: '#334155', fontSize: 13, marginBottom: 8 }}>Sin participantes</div>}
            {catParts.map((p: any) => (
              <div key={p.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '11px 16px', marginBottom: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{p.display_name}</span>
                <button onClick={() => delPart(p.id)} style={{ background: '#dc262622', border: '1px solid #dc262644', borderRadius: 7, padding: '5px 10px', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        )
      })}
      <div style={{ background: '#1e1b4b', border: '1px solid #4338ca', borderRadius: 14, padding: 20, marginTop: 8 }}>
        <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>NUEVO PARTICIPANTE</div>
        <input placeholder="Nombre completo *" value={name} onChange={e => setName(e.target.value)} style={inp} />
        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>CATEGORÍA</div>
        <select value={catId} onChange={e => setCatId(e.target.value)} style={{ ...inp, marginBottom: 14 }}>
          {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={addPart} disabled={saving} style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 9, padding: '12px 24px', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Agregando...' : 'Agregar participante'}
        </button>
      </div>
    </div>
  )
}

// ─── JUDGES TAB ───────────────────────────────────────────────
function JudgesTab({ judges, setJudges, eventId, showToast }: any) {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  async function inviteJudge() {
    if (!email.trim()) return
    setSaving(true)
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('username', email.trim())
      .maybeSingle()

    if (pErr || !profile) {
      const { data: byEmail } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', '%' + email.trim() + '%')
        .maybeSingle()

      if (!byEmail) { showToast('❌ Usuario no encontrado'); setSaving(false); return }

      const { data, error } = await supabase.from('judges').insert({ event_id: eventId, profile_id: byEmail.id, status: 'invited' }).select('*, profiles(full_name, avatar_url)').single()
      setSaving(false)
      if (error) { showToast('❌ Error: ' + error.message); return }
      setJudges((prev: any) => [...prev, data])
      setEmail(''); showToast('✅ Juez invitado')
      return
    }

    const { data, error } = await supabase.from('judges').insert({ event_id: eventId, profile_id: profile.id, status: 'invited' }).select('*, profiles(full_name, avatar_url)').single()
    setSaving(false)
    if (error) { showToast('❌ Error: ' + error.message); return }
    setJudges((prev: any) => [...prev, data])
    setEmail(''); showToast('✅ Juez invitado')
  }

  async function removeJudge(id: string) {
    await supabase.from('judges').delete().eq('id', id)
    setJudges((prev: any) => prev.filter((j: any) => j.id !== id))
    showToast('Juez eliminado')
  }

  return (
    <div>
      <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>JUECES</div>
      {judges.length === 0 && <div style={{ color: '#334155', fontSize: 13, marginBottom: 16 }}>Sin jueces asignados</div>}
      {judges.map((j: any) => (
        <div key={j.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '12px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            {j.profiles?.full_name?.[0] ?? '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{j.profiles?.full_name ?? 'Juez'}</div>
            <div style={{ fontSize: 11, color: j.status === 'accepted' ? '#22c55e' : '#f59e0b' }}>
              {j.status === 'accepted' ? 'Confirmado' : 'Invitado'}
            </div>
          </div>
          <button onClick={() => removeJudge(j.id)} style={{ background: '#dc262622', border: '1px solid #dc262644', borderRadius: 8, padding: '6px 12px', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      ))}
      <div style={{ background: '#1e1b4b', border: '1px solid #4338ca', borderRadius: 14, padding: 20, marginTop: 16 }}>
        <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>INVITAR JUEZ</div>
        <input placeholder="Nombre del juez (debe tener cuenta en la plataforma)" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
        <button onClick={inviteJudge} disabled={saving} style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 9, padding: '12px 24px', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Invitando...' : 'Invitar juez'}
        </button>
      </div>
    </div>
  )
}