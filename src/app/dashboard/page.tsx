'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import type { User } from '@supabase/supabase-js'
import type { Event } from '@/lib/supabase'

const inp: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  padding: '12px 14px', color: '#e8e8e8', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', marginBottom: 10,
  fontFamily: 'inherit',
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
      .from('events').select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    setEvents(data ?? [])
    setLoading(false)
  }

  async function createEvent() {
    if (!form.name.trim() || !user) return
    setSaving(true)
    const { data, error } = await supabase.from('events').insert({
      ...form, owner_id: user.id, status: 'draft'
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
    draft: '#444', published: '#C9A84C', active: '#4CAF50', finished: '#444'
  }
  const statusLabel: Record<string, string> = {
    draft: 'Borrador', published: 'Publicado', active: 'En vivo', finished: 'Finalizado'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <Nav />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.startsWith('❌') ? '#ef4444' : '#C9A84C', color: toast.startsWith('❌') ? '#fff' : '#000', padding: '11px 28px', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '40px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase' }}>Mi panel</div>
            <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>
              {user?.user_metadata?.full_name?.split(' ')[0] ?? 'Organizador'}
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} style={{
            background: '#C9A84C', border: 'none', padding: '12px 24px',
            color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer',
            letterSpacing: 3, textTransform: 'uppercase',
          }}>
            + Crear evento
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Formulario crear evento */}
        {showCreate && (
          <div style={{ borderTop: '2px solid #C9A84C', padding: '28px 0', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>Nuevo evento</div>
            <input placeholder="Nombre del evento *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input placeholder="Ciudad" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
              <input placeholder="País (ej: AR)" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
            </div>
            <div style={{ marginBottom: 10 }} />
            <input placeholder="Nombre del lugar" value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} style={inp} />
            <input placeholder="Dirección" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inp} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
              <input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
            </div>
            <div style={{ marginBottom: 10 }} />
            <textarea placeholder="Descripción del evento" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ ...inp, minHeight: 80, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={createEvent} disabled={saving} style={{ background: '#C9A84C', border: 'none', padding: '12px 28px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creando...' : 'Crear evento'}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '12px 28px', color: '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista eventos */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>Mis eventos</div>

        {loading && <div style={{ color: '#444', padding: 20, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Cargando...</div>}

        {!loading && events.length === 0 && (
          <div style={{ borderTop: '1px solid #2a2a2a', padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#333', letterSpacing: 3, textTransform: 'uppercase' }}>No creaste ningún evento todavía</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
          {events.map(ev => (
            <div key={ev.id} style={{ background: '#0a0a0a', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 6 }}>{ev.name}</div>
                <div style={{ color: '#444', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {ev.event_date ? new Date(ev.event_date).toLocaleDateString('es-AR') : 'Sin fecha'}
                  {ev.city ? ' · ' + ev.city : ''}
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: statusColor[ev.status], textTransform: 'uppercase' }}>
                {statusLabel[ev.status]}
              </span>
              <button onClick={() => router.push('/dashboard/' + ev.id)} style={{
                background: 'transparent', border: '1px solid #2a2a2a', padding: '8px 16px',
                color: '#666', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                letterSpacing: 2, textTransform: 'uppercase',
              }}>
                Gestionar →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}