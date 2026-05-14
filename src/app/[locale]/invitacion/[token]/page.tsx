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

  const [status, setStatus] = useState<'loading' | 'accepting' | 'success' | 'error' | 'needsAccount'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
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
    display: 'inline-block', background: '#C9A84C', color: '#0a0a0a',
    fontWeight: 900, textTransform: 'uppercase', padding: '14px 28px',
    textDecoration: 'none', letterSpacing: '1px',
  }

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <h1 style={{ color: '#C9A84C', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '3px', fontSize: '1.2rem', marginBottom: 32 }}>
          {t('brand')}
        </h1>

        {status === 'loading' && (
          <p style={{ color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: 1 }}>{t('loading')}</p>
        )}

        {status === 'accepting' && (
          <p style={{ color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: 1 }}>{t('accepting')}</p>
        )}

        {status === 'needsAccount' && (
          <div>
            <h2 style={{ color: '#ffffff', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>
              {t('needsAccountTitle')}
            </h2>
            <p style={{ color: '#aaaaaa', marginBottom: 32 }}>{t('needsAccountDesc')}</p>
            <a href={`/auth?invite=${token}`} style={btnStyle}>{t('needsAccountBtn')}</a>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#C9A84C' }}>✓</div>
            <h2 style={{ color: '#C9A84C', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>
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