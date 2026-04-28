'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function InvitacionPage() {
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
        const { data: { user }, } = await supabase.auth.getUser()

        if (!user) {
        localStorage.setItem('pendingInvitationToken', token)
        setStatus('needsAccount')
        return
        }

        setStatus('accepting')
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/invite/accept/${token}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session?.access_token}`,
        },
        })
        const data = await res.json()

        if (data.success) {
        setStatus('success')
        setMessage(`¡Listo! Quedaste registrado como ${data.role === 'judge' ? 'juez' : 'participante'}.`)
        setTimeout(() => router.push(`/eventos/${data.eventId}`), 2500)
        } else {
        setStatus('error')
        setMessage(data.error || 'La invitación es inválida o ya fue usada.')
        }
    }

    handleInvitation()
    }, [token])

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    padding: '40px 20px',
  }

  const boxStyle: React.CSSProperties = {
    maxWidth: 480,
    width: '100%',
    textAlign: 'center',
  }

  const btnStyle: React.CSSProperties = {
    display: 'inline-block',
    background: '#C9A84C',
    color: '#0a0a0a',
    fontWeight: 900,
    textTransform: 'uppercase',
    padding: '14px 28px',
    textDecoration: 'none',
    letterSpacing: '1px',
  }

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <h1 style={{ color: '#C9A84C', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '3px', fontSize: '1.2rem', marginBottom: 32 }}>
          QUAD SKATE PLATFORM
        </h1>

        {status === 'loading' && (
          <p style={{ color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: 1 }}>Verificando invitación...</p>
        )}

        {status === 'accepting' && (
          <p style={{ color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: 1 }}>Aceptando invitación...</p>
        )}

        {status === 'needsAccount' && (
          <div>
            <h2 style={{ color: '#ffffff', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>
              NECESITÁS UNA CUENTA
            </h2>
            <p style={{ color: '#aaaaaa', marginBottom: 32 }}>
              Para aceptar esta invitación, primero creá tu cuenta. Una vez registrado, quedás vinculado automáticamente.
            </p>
            <a href={`/auth?invite=${token}`} style={btnStyle}>
              CREAR CUENTA
            </a>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#C9A84C' }}>✓</div>
            <h2 style={{ color: '#C9A84C', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>
              INVITACIÓN ACEPTADA
            </h2>
            <p style={{ color: '#aaaaaa' }}>{message}</p>
            <p style={{ color: '#555', fontSize: 12, marginTop: 16 }}>Redirigiendo al evento...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#ff4444' }}>✗</div>
            <h2 style={{ color: '#ffffff', textTransform: 'uppercase', fontWeight: 900, marginBottom: 16 }}>ERROR</h2>
            <p style={{ color: '#aaaaaa', marginBottom: 32 }}>{message}</p>
            <a href="/" style={btnStyle}>IR AL INICIO</a>
          </div>
        )}
      </div>
    </div>
  )
}