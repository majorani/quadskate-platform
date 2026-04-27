'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import type { User } from '@supabase/supabase-js'
import type { Event } from '@/lib/supabase'

const inp: React.CSSProperties = {
  width: '100%', background: '#0f172a', border: '1px solid #334155',
  borderRadius: 9, padding: '11px 13px', color: '#e2e8f0', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', marginBottom: 10
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    name: '', city: '', country: 'AR', event_date: '',
    event_time: '', location_name: '', address: '', description: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/auth'); return }
      setUser(data.session.user)
      loadEvents(data.session.user.id)
    })
  }, [])

  async function loadEvents(userId: string) {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    setEvents(data ?? [])
    setLoading(false)
  }

  async function createEvent() {
    if (!form.name.trim() || !user) return
    setSaving(true)
    const { data, error } = await supabase.from('events').insert({
      ...form,
      owner_id: user.id,
      status: 'draft'
    }).select().single()
    setSaving(false)
    if (error) { showToast('❌ Error al crear evento'); return }
    setEvents(prev => [data, ...prev])
    setShowCreate(false)
    setForm({ name: '', city: '', country: 'AR', event_date: '', event_time: '', location_name: '', address: '', description: '' })
    showToast('✅ Evento creado')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const statusColor: Record<string, string> = {
    draft: '#64748b', published: '#4f46e5', active: '#22c55e', finished: '#94a3b8'
  }
  const statusLabel: Record<string, string> = {
    draft: 'Borrador', published: 'Publicado', active: 'En vivo', finished: 'Finalizado'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Nav />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.startsWith('❌') ? '#dc2626' : '#22c55e', color: '#fff', padding: '11px 28px', borderRadius: 999, fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px #0005', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>MI PANEL</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 0' }}>
              Hola, {user?.user_metadata?.full_name?.split(' ')[0] ?? 'organizador'} 👋
            </h1>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 10, padding: '12px 20px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Crear evento
          </button>
        </div>

        {/* Formulario crear evento */}
        {showCreate && (
          <div style={{ background: '#1e1b4b', border: '1px solid #4338ca', borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <div style={{ color: '#818cf8', fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 16 }}>NUEVO EVENTO</div>
            <input placeholder="Nombre del evento *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input placeholder="Ciudad" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
              <input placeholder="País (ej: AR)" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
            </div>
            <div style={{ marginBottom: 10 }} />
            <input placeholder="Nombre del lugar (ej: Skatepark Palermo)" value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} style={inp} />
            <input placeholder="Dirección" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inp} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
              <input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
            </div>
            <div style={{ marginBottom: 10 }} />
            <textarea placeholder="Descripción del evento (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={createEvent} disabled={saving} style={{ flex: 1, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 9, padding: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creando...' : 'Crear evento'}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 9, padding: '12px', color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de eventos */}
        <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>MIS EVENTOS</div>
        {loading && <div style={{ color: '#475569', padding: 20 }}>Cargando...</div>}
        {!loading && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div>No creaste ningún evento todavía</div>
          </div>
        )}
        {events.map(ev => (
          <div key={ev.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '16px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{ev.name}</div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                {ev.event_date ? new Date(ev.event_date).toLocaleDateString('es-AR') : 'Sin fecha'}
                {ev.city ? ' · ' + ev.city : ''}
              </div>
            </div>
            <span style={{ background: (statusColor[ev.status] ?? '#64748b') + '22', color: statusColor[ev.status] ?? '#64748b', border: '1px solid ' + (statusColor[ev.status] ?? '#64748b') + '44', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {statusLabel[ev.status] ?? ev.status}
            </span>
            <button onClick={() => router.push('/dashboard/' + ev.id)} style={{ background: '#ffffff10', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              Gestionar →
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}