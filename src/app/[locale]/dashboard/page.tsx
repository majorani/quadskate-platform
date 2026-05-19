'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
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
  const t = useTranslations('DashboardPage')
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    name: '', city: '', country: 'AR', event_date: '',
    event_time: '', location_name: '', address: '', description: '',
    event_type: 'competition' as 'competition' | 'encuentro',
  })

  const statusColor: Record<string, string> = {
    draft: '#444', published: '#C9A84C', active: '#4CAF50', finished: '#444',
  }
  const statusLabel: Record<string, string> = {
    draft: t('statusDraft'), published: t('statusPublished'),
    active: t('statusActive'), finished: t('statusFinished'),
  }

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
    if (error) { showToast(t('toastError')); return }
    setEvents(prev => [data, ...prev])
    setShowCreate(false)
    setForm({ name: '', city: '', country: 'AR', event_date: '', event_time: '', location_name: '', address: '', description: '', event_type: 'competition' })
    showToast(t('toastCreated'))
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <Nav />

      <style>{`
        .dash-header-inner { max-width: 900px; margin: 0 auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
        .dash-create-btn { flex-shrink: 0; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .event-card { background: #0a0a0a; padding: 20px 20px; display: flex; align-items: center; gap: 16px; }
        .event-card-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .event-card-btn { background: transparent; border: 1px solid #2a2a2a; padding: 8px 14px; color: #666; cursor: pointer; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; }
        .form-action-row { display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
        .type-btns { display: flex; gap: 1px; background: #2a2a2a; margin-bottom: 16px; }
        .type-btn { flex: 1; padding: 14px 12px; border: none; cursor: pointer; font-weight: 900; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
        .event-type-badge { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 2px 7px; border: 1px solid currentColor; }
        @media (max-width: 640px) {
          .dash-header-inner { flex-direction: column; align-items: flex-start; }
          .dash-create-btn { width: 100%; text-align: center; }
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .event-card { flex-direction: column; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
          .event-card-actions { width: 100%; justify-content: space-between; }
          .event-card-btn { flex: 1; text-align: center; }
        }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.startsWith('❌') ? '#ef4444' : '#C9A84C', color: toast.startsWith('❌') ? '#fff' : '#000', padding: '11px 28px', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '40px 16px' }}>
        <div className="dash-header-inner">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase' }}>{t('eyebrow')}</div>
            <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>
              {user?.user_metadata?.full_name?.split(' ')[0] ?? t('defaultName')}
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="dash-create-btn" style={{ background: '#C9A84C', border: 'none', padding: '12px 24px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase' }}>
            {t('createButton')}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px' }}>

        {/* Formulario crear evento */}
        {showCreate && (
          <div style={{ borderTop: '2px solid #C9A84C', padding: '28px 0', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>{t('formTitle')}</div>

            <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('typeLabel')}</div>
            <div className="type-btns">
              <button className="type-btn" onClick={() => setForm(f => ({ ...f, event_type: 'competition' }))}
                style={{ background: form.event_type === 'competition' ? '#C9A84C' : '#0a0a0a', color: form.event_type === 'competition' ? '#000' : '#444' }}>
                {t('typeCompetition')}
              </button>
              <button className="type-btn" onClick={() => setForm(f => ({ ...f, event_type: 'encuentro' }))}
                style={{ background: form.event_type === 'encuentro' ? '#e8e8e8' : '#0a0a0a', color: form.event_type === 'encuentro' ? '#000' : '#444' }}>
                {t('typeEncuentro')}
              </button>
            </div>
            <div style={{ background: '#111', borderLeft: `3px solid ${form.event_type === 'competition' ? '#C9A84C' : '#555'}`, padding: '10px 14px', marginBottom: 20, fontSize: 11, color: '#555', letterSpacing: 0.5, lineHeight: 1.5 }}>
              {form.event_type === 'competition' ? t('hintCompetition') : t('hintEncuentro')}
            </div>

            <input placeholder={t('placeholderName')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            <div className="form-grid-2">
              <input placeholder={t('placeholderCity')} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
              <input placeholder={t('placeholderCountry')} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
            </div>
            <div style={{ marginBottom: 10 }} />
            <input placeholder={t('placeholderLocation')} value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} style={inp} />
            <input placeholder={t('placeholderAddress')} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inp} />
            <div className="form-grid-2">
              <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
              <input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
            </div>
            <div style={{ marginBottom: 10 }} />
            <textarea placeholder={t('placeholderDescription')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ ...inp, minHeight: 80, resize: 'vertical' }} />
            <div className="form-action-row">
              <button onClick={createEvent} disabled={saving} style={{ background: '#C9A84C', border: 'none', padding: '12px 28px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', opacity: saving ? 0.7 : 1 }}>
                {saving ? t('creating') : t('submitCreate')}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '12px 28px', color: '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}>
                {t('cancelCreate')}
              </button>
            </div>
          </div>
        )}

        {/* Lista eventos */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>{t('sectionMyEvents')}</div>
        {loading && <div style={{ color: '#444', padding: 20, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('loadingEvents')}</div>}
        {!loading && events.length === 0 && (
          <div style={{ borderTop: '1px solid #2a2a2a', padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#333', letterSpacing: 3, textTransform: 'uppercase' }}>{t('emptyEvents')}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
          {events.map(ev => {
            const isEncuentro = (ev as any).event_type === 'encuentro'
            return (
              <div key={ev.id} className="event-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.3 }}>{ev.name}</div>
                    <span className="event-type-badge" style={{ color: isEncuentro ? '#666' : '#C9A84C' }}>
                      {isEncuentro ? t('badgeEncuentro') : t('badgeCompetition')}
                    </span>
                  </div>
                  <div style={{ color: '#444', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {ev.event_date ? (() => {
                      const d = new Date(ev.event_date!)
                      const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
                      return `${d.getUTCDate().toString().padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
                    })() : t('noDate')}
                    {ev.city ? ' · ' + ev.city : ''}
                  </div>
                </div>
                <div className="event-card-actions">
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: statusColor[ev.status], textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {statusLabel[ev.status]}
                  </span>
                  <button onClick={() => router.push('/dashboard/' + ev.id)} className="event-card-btn">{t('manageButton')}</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}