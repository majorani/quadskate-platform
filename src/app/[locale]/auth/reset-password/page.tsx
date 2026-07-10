'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase parsea el hash automáticamente y establece la sesión
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleReset() {
    if (!pass.trim() || pass !== confirm) {
      setErr('Las contraseñas no coinciden')
      return
    }
    if (pass.length < 6) {
      setErr('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setErr('')
    const { error } = await supabase.auth.updateUser({ password: pass })
    setLoading(false)
    if (error) { setErr('Error al actualizar la contraseña'); return }
    router.push('/dashboard')
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#111', border: '1px solid #2a2a2a',
    padding: '14px 16px', color: '#e8e8e8', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', marginBottom: 10,
    fontFamily: 'inherit',
  }

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 11, color: '#333', letterSpacing: 4, textTransform: 'uppercase' }}>Verificando...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ borderTop: '2px solid #D4B45A', paddingTop: 28, marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#D4B45A', marginBottom: 10, textTransform: 'uppercase' }}>
            Nueva contraseña
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>
            QSKT Platform
          </div>
        </div>

        <input
          value={pass}
          onChange={e => setPass(e.target.value)}
          placeholder="Nueva contraseña"
          type="password"
          style={inp}
        />
        <input
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Confirmar contraseña"
          type="password"
          onKeyDown={e => e.key === 'Enter' && handleReset()}
          style={{ ...inp, marginBottom: 16 }}
        />

        {err && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, letterSpacing: 1 }}>{err}</div>}

        <button
          onClick={handleReset}
          disabled={loading || !pass.trim() || !confirm.trim()}
          style={{ width: '100%', background: '#D4B45A', border: 'none', padding: '14px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', opacity: loading || !pass.trim() ? 0.7 : 1 }}
        >
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </div>
    </div>
  )
}