'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#D4B45A'

const inp: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  padding: '12px 14px', color: '#e8e8e8', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

interface Props {
  eventId: string
  cats: any[]
  eventStatus: string
  onRegistered?: () => void
}

export default function InscripcionButton({ eventId, cats, eventStatus, onRegistered }: Props) {
  const t = useTranslations('InscripcionButton')
  const router = useRouter()
  const [user, setUser]               = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [myPart, setMyPart]           = useState<any>(null)
  const [showForm, setShowForm]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState('')
  const [displayName, setDisplayName] = useState('')
  const [catId, setCatId]             = useState(cats[0]?.id ?? '')

  if (eventStatus !== 'published') return null
  if (cats.length === 0) return null

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setLoading(false); return }
      setUser(data.session.user)
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', data.session.user.id).single()
      if (profile?.full_name) setDisplayName(profile.full_name)
      const { data: existing } = await supabase
        .from('participants')
        .select('*, categories(name)')
        .eq('event_id', eventId)
        .eq('profile_id', data.session.user.id)
        .maybeSingle()
      setMyPart(existing)
      setLoading(false)
    })
  }, [eventId])

  async function register() {
    if (!user || !catId || !displayName.trim()) return
    setSaving(true)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('participants').insert({
      event_id:     eventId,
      category_id:  catId,
      profile_id:   user.id,
      display_name: displayName.trim(),
      email:        currentUser?.email ?? '',
      status:       'confirmed',
    }).select('*, categories(name)').single()
    setSaving(false)
    if (error) { showToastMsg(t('toastError')); return }
    setMyPart(data)
    setShowForm(false)
    showToastMsg(t('toastSuccess'))
    onRegistered?.()
  }

  function showToastMsg(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  if (loading) return null

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.startsWith('❌') ? '#ef4444' : GOLD, color: toast.startsWith('❌') ? '#fff' : '#000', padding: '11px 28px', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {!user && (
        <button
          onClick={() => router.push('/auth?redirect=/eventos/' + eventId)}
          style={{ background: 'transparent', border: `1px solid ${GOLD}`, padding: '12px 24px', color: GOLD, fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}
        >
          {t('loginPrompt')}
        </button>
      )}

      {user && myPart && (
        <div style={{ background: '#111', borderLeft: `3px solid ${GOLD}`, padding: '14px 20px', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, color: GOLD }}>✓</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 2 }}>{t('alreadyRegistered')}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{myPart.categories?.name ?? ''}</div>
          </div>
        </div>
      )}

      {user && !myPart && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              style={{ background: GOLD, border: 'none', padding: '12px 28px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase' }}
            >
              {t('registerBtn')}
            </button>
          ) : (
            <div style={{ background: '#111', borderTop: `2px solid ${GOLD}`, padding: '24px', marginTop: 12, maxWidth: 420 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>{t('formTitle')}</div>

              <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{t('labelName')}</div>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={t('placeholderName')}
                style={{ ...inp, marginBottom: 14 }}
              />

              <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{t('labelCategory')}</div>
              <select
                value={catId}
                onChange={e => setCatId(e.target.value)}
                style={{ ...inp, marginBottom: 16 }}
              >
                {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <div style={{ fontSize: 11, color: '#555', marginBottom: 20, lineHeight: 1.6, fontStyle: 'italic', borderLeft: '2px solid #2a2a2a', paddingLeft: 12 }}>
                {t('disclaimer')}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={register}
                  disabled={saving || !displayName.trim() || !catId}
                  style={{ background: GOLD, border: 'none', padding: '12px 24px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', opacity: saving || !displayName.trim() ? 0.7 : 1 }}
                >
                  {saving ? t('confirming') : t('confirmBtn')}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '12px 24px', color: '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}
                >
                  {t('cancelBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}