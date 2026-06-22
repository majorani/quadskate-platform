'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AuthPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) setInviteToken(invite)
    const mode = params.get('mode')
    if (mode === 'login') setMode('login')  
    const stored = localStorage.getItem('pendingInvitationToken')
    if (stored) setInviteToken(stored)
  }, [])

  async function handleSubmit() {
    if (!email.trim() || !pass.trim()) return
    setLoading(true); setErr('')
    try {
      if (mode === 'register') {
        if (!name.trim()) { setErr(t('errorName')); return }
        const { error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { full_name: name } }
        })
        if (error) { setErr(error.message); return }
        if (inviteToken) localStorage.removeItem('pendingInvitationToken')
        setOk(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) { setErr(t('errorCredentials')); return }
        if (inviteToken) {
          localStorage.removeItem('pendingInvitationToken')
          router.push(`/invitacion/${inviteToken}`)
        } else {
          const redirectTo = new URLSearchParams(window.location.search).get('redirect')
          router.push(redirectTo || '/dashboard')
        }
      }
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#111', border: '1px solid #2a2a2a',
    padding: '14px 16px', color: '#e8e8e8', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', marginBottom: 10,
    fontFamily: 'inherit',
  }

  if (ok) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <LanguageSwitcher />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 380, borderTop: '2px solid #D4B45A', paddingTop: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#D4B45A', marginBottom: 20, textTransform: 'uppercase' }}>
          {t('confirmTitle')}
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5, marginBottom: 16 }}>
          {t('confirmHeading')}
        </div>
        <p style={{ color: '#666', lineHeight: 1.7, fontSize: 14, marginBottom: 28 }}>
          {t('confirmText', { email }).split(email).map((part, i, arr) =>
            i < arr.length - 1
              ? <span key={i}>{part}<strong style={{ color: '#e8e8e8' }}>{email}</strong></span>
              : <span key={i}>{part}</span>
          )}
        </p>
        <button
          onClick={() => { setOk(false); setMode('login') }}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '12px 24px', color: '#666', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}
        >
          {t('confirmBack')}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <LanguageSwitcher />
      </div>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ borderTop: '2px solid #D4B45A', paddingTop: 28, marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#D4B45A', marginBottom: 10, textTransform: 'uppercase' }}>
            {mode === 'login' ? t('loginLabel') : t('registerLabel')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>
            {t('title')}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', marginBottom: 28 }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 700,
              fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
              background: 'transparent',
              color: mode === m ? '#D4B45A' : '#444',
              borderBottom: mode === m ? '2px solid #D4B45A' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {m === 'login' ? t('tabLogin') : t('tabRegister')}
            </button>
          ))}
        </div>

        {/* Google */}
        <button onClick={handleGoogle} style={{
          width: '100%', background: '#111', border: '1px solid #2a2a2a',
          padding: '13px', color: '#e8e8e8', fontWeight: 700, fontSize: 11,
          cursor: 'pointer', marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <span style={{ fontWeight: 900, fontSize: 14 }}>G</span> {t('google')}
        </button>

        <div style={{ textAlign: 'center', color: '#333', fontSize: 11, letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' }}>
          {t('orEmail')}
        </div>

        {mode === 'register' && (
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('namePlaceholder')} style={inp} />
        )}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} type="email" style={inp} />
        <input
          value={pass} onChange={e => setPass(e.target.value)}
          placeholder={t('passPlaceholder')} type="password"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ ...inp, marginBottom: 16 }}
        />

        {err && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, letterSpacing: 1 }}>{err}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', background: '#D4B45A', border: 'none',
          padding: '14px', color: '#000', fontWeight: 900, fontSize: 11,
          cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? t('loading') : mode === 'login' ? t('submitLogin') : t('submitRegister')}
        </button>

      </div>
    </div>
  )
}