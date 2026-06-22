'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function InvitacionPage() {
  const t = useTranslations('InvitacionPage')
  const params = useParams()
  const token = params.token as string
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [status, setStatus] = useState<'loading' | 'accepting' | 'success' | 'error' | 'needsAccount' | 'pending'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Caso: redirigido desde app de jueces por invitación pendiente
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('error') === 'pending') {
        setStatus('pending')
        return
      }
    }

    async function handleInvitation() {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !session) {
        localStorage.setItem('pendingInvitationToken', token)
        setStatus('needsAccount')
        return
      }

      localStorage.removeItem('pendingInvitationToken')
      setStatus('accepting')
      const res = await fetch(`/api/invite/accept/${token}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setMessage(data.role === 'judge' ? t('successRoleJudge') : t('successRoleParticipant'))
        setTimeout(() => router.push(`/eventos/${data.eventId}`), 2500)
      } else {
        setStatus('error')
        setMessage(data.error || t('errorFallback'))
      }
    }

    handleInvitation()
  }, [token])

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh', background: '#0a0a0a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'sans-serif', padding: '40px 20px',
  }
  const boxStyle: React.CSSProperties = { maxWidth: 480, width: '100%', textAlign: 'center' }
  const btnStyle: React.CSSProperties = {
    display: 'inline-block', background: '#D4B45A', color: '#0a0a0a',
    fontWeight: 900, textTransform: 'uppercase', padding: '14px 28px',
    textDecoration: 'none', letterSpacing: '1px',
  }

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <h1 style={{ color: '#D4B45A', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '3px', fontSize: '1.2rem', marginBottom: 32 }}>
          {t('brand')}
        </h1>

        {status === 'loading' && (
          <p style={{ color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: 1 }}>{t('loading')}</p>
        )}

        {status === 'accepting' && (
          <p style={{ color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: 1 }}>{t('accepting')}</p>
        )}

        {status === 'pending' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ color: '#ffffff', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>
              {t('pendingTitle')}
            </h2>
            <p style={{ color: '#aaaaaa', marginBottom: 32, lineHeight: 1.7 }}>
              {t('pendingDesc')}
            </p>
            <a href="/" style={btnStyle}>{t('pendingBtn')}</a>
          </div>
        )}

        {status === 'needsAccount' && (
          <div>
            <h2 style={{ color: '#ffffff', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>
              {t('needsAccountTitle')}
            </h2>
            <p style={{ color: '#aaaaaa', marginBottom: 16 }}>{t('needsAccountDesc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href={`/auth?invite=${token}`} style={btnStyle}>{t('needsAccountBtn')}</a>
              <a href={`/auth?invite=${token}&mode=login`} style={{ ...btnStyle, background: 'transparent', color: '#D4B45A', border: '1px solid #D4B45A' }}>
                {t('needsAccountLoginBtn')}
              </a>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#D4B45A' }}>✓</div>
            <h2 style={{ color: '#D4B45A', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>
              {t('successTitle')}
            </h2>
            <p style={{ color: '#aaaaaa' }}>{message}</p>
            <p style={{ color: '#555', fontSize: 12, marginTop: 16 }}>{t('successRedirect')}</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#ff4444' }}>✗</div>
            <h2 style={{ color: '#ffffff', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>
              {t('errorTitle')}
            </h2>
            <p style={{ color: '#aaaaaa', marginBottom: 32 }}>{message}</p>
            <a href="/" style={btnStyle}>{t('errorBtn')}</a>
          </div>
        )}
      </div>
    </div>
  )
}