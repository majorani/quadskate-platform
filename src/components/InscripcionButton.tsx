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
  isEncuentro: boolean
  onRegistered?: () => void
}

export default function InscripcionButton({ eventId, cats, eventStatus, isEncuentro, onRegistered }: Props) {
  const t = useTranslations('InscripcionButton')
  const router = useRouter()

  const MAX_CATEGORIES = 2

  const [user, setUser]               = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [attending, setAttending]     = useState<any>(null)
  const [myParts, setMyParts]         = useState<any[]>([])
  const [showCatForm, setShowCatForm] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState('')
  const [displayName, setDisplayName] = useState('')
  const [catId, setCatId]             = useState('')

  if (eventStatus !== 'published') return null

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setLoading(false); return }
      const u = data.session.user
      setUser(u)

      const [profileRes, attendRes, partsRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', u.id).single(),
        supabase.from('attendees').select('*').eq('event_id', eventId).eq('profile_id', u.id).maybeSingle(),
        supabase.from('participants').select('*, categories(name)').eq('event_id', eventId).eq('profile_id', u.id),
      ])

      if (profileRes.data?.full_name) setDisplayName(profileRes.data.full_name)
      setAttending(attendRes.data)
      setMyParts(partsRes.data ?? [])
      setLoading(false)
    })
  }, [eventId])

  const registeredCatIds = myParts.map((p: any) => p.category_id)
  const availableCats = cats.filter((c: any) => !registeredCatIds.includes(c.id))

  useEffect(() => {
    if (!catId && availableCats.length > 0) setCatId(availableCats[0].id)
  }, [availableCats.length])

  async function confirmAttendance() {
    if (!user) return
    setSaving(true)
    const { data, error } = await supabase
      .from('attendees')
      .insert({ event_id: eventId, profile_id: user.id })
      .select()
      .single()
    setSaving(false)
    if (error) { showToastMsg('❌ Error al confirmar asistencia'); return }
    setAttending(data)
    showToastMsg('✓ Asistencia confirmada')
    onRegistered?.()
  }

  async function registerCategory() {
    if (!user || !catId || !displayName.trim()) return
    if (myParts.length >= MAX_CATEGORIES) return
    setSaving(true)
    const { data: currentUser } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('participants').insert({
      event_id:     eventId,
      category_id:  catId,
      profile_id:   user.id,
      display_name: displayName.trim(),
      email:        currentUser.user?.email ?? '',
      status:       'confirmed',
    }).select('*, categories(name)').single()
    setSaving(false)
    if (error) { showToastMsg(t('toastError')); return }
    const updated = [...myParts, data]
    setMyParts(updated)
    setCatId(cats.find((c: any) => !updated.some((p: any) => p.category_id === c.id))?.id ?? '')
    setShowCatForm(false)
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

      {/* NO LOGUEADO */}
      {!user && (
        <button
          onClick={() => router.push('/auth?redirect=/eventos/' + eventId)}
          style={{ background: 'transparent', border: `1px solid ${GOLD}`, padding: '12px 24px', color: GOLD, fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}
        >
          {t('loginPrompt')}
        </button>
      )}

      {/* LOGUEADO */}
      {user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>

          {/* PASO 1: ASISTENCIA */}
          {!attending ? (
            <button
              onClick={confirmAttendance}
              disabled={saving}
              style={{ background: GOLD, border: 'none', padding: '12px 28px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Confirmando...' : 'Confirmar asistencia'}
            </button>
          ) : (
            <div style={{ background: '#111', borderLeft: `3px solid ${GOLD}`, padding: '14px 20px', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, color: GOLD }}>✓</span>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, textTransform: 'uppercase' }}>
                Asistencia confirmada
              </div>
            </div>
          )}

          {/* PASO 2: CATEGORÍA (solo competencias, solo si confirmó asistencia, hasta 2 categorías) */}
          {attending && !isEncuentro && cats.length > 0 && (
            <>
              {myParts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  {myParts.map((p: any) => (
                    <div key={p.id} style={{ background: '#111', borderLeft: `3px solid #4CAF50`, padding: '14px 20px', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18, color: '#4CAF50' }}>✓</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#4CAF50', textTransform: 'uppercase', marginBottom: 2 }}>{t('alreadyRegistered')}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{p.categories?.name ?? ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {myParts.length < MAX_CATEGORIES && availableCats.length > 0 && (
                <div>
                  {!showCatForm ? (
                    <button
                      onClick={() => setShowCatForm(true)}
                      style={{ background: 'transparent', border: `1px solid ${GOLD}`, padding: '12px 28px', color: GOLD, fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase' }}
                    >
                      {myParts.length > 0 ? t('registerAnotherBtn') : t('registerBtn')}
                    </button>
                  ) : (
                    <div style={{ background: '#111', borderTop: `2px solid ${GOLD}`, padding: '24px', marginTop: 4, maxWidth: 420 }}>
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
                        {availableCats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>

                      <div style={{ fontSize: 11, color: '#555', marginBottom: 20, lineHeight: 1.6, fontStyle: 'italic', borderLeft: '2px solid #2a2a2a', paddingLeft: 12 }}>
                        {t('disclaimer')}
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          onClick={registerCategory}
                          disabled={saving || !displayName.trim() || !catId}
                          style={{ background: GOLD, border: 'none', padding: '12px 24px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', opacity: saving || !displayName.trim() ? 0.7 : 1 }}
                        >
                          {saving ? t('confirming') : t('confirmBtn')}
                        </button>
                        <button
                          onClick={() => setShowCatForm(false)}
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
          )}
        </div>
      )}
    </>
  )
}