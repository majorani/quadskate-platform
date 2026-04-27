'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !pass.trim()) return
    setLoading(true)
    setErr('')
    try {
      if (mode === 'register') {
        if (!name.trim()) { setErr('Ingresá tu nombre'); return }
        const { error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { full_name: name } }
        })
        if (error) { setErr(error.message); return }
        setOk(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) { setErr('Usuario o contraseña incorrectos'); return }
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#ffffff12', border: '1px solid #ffffff20',
    borderRadius: 10, padding: '12px 14px', color: '#f1f5f9', fontSize: 15,
    outline: 'none', boxSizing: 'border-box', marginBottom: 10
  }

  if (ok) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
        <h2 style={{ color: '#e2e8f0', fontWeight: 800, marginBottom: 12 }}>¡Revisá tu email!</h2>
        <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>
          Te enviamos un link de confirmación a <strong>{email}</strong>. Confirmá tu cuenta para ingresar.
        </p>
        <button onClick={() => { setOk(false); setMode('login') }} style={{ marginTop: 24, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 24px', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
          Ir al login
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#ffffff0a', border: '1px solid #ffffff18', borderRadius: 22, padding: 36, width: '100%', maxWidth: 380, backdropFilter: 'blur(20px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48 }}>🛼</div>
          <div style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 800, marginTop: 8 }}>QuadSkate Platform</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: mode === m ? '#4f46e5' : '#ffffff10', color: mode === m ? '#fff' : '#94a3b8' }}>
              {m === 'login' ? 'Ingresar' : 'Registrarse'}
            </button>
          ))}
        </div>

        <button onClick={handleGoogle} style={{ width: '100%', background: '#fff', border: 'none', borderRadius: 10, padding: '12px', color: '#1e293b', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 900 }}>G</span> Continuar con Google
        </button>

        <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginBottom: 16 }}>— o con email —</div>

        {mode === 'register' && (
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" style={inp} />
        )}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inp} />
        <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña" type="password"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={inp} />

        {err && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>{err}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, padding: 14, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </div>
    </div>
  )
}