'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      if (data.session?.user) loadUnread(data.session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadUnread(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUnread(userId: string) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    setUnread(count ?? 0)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const active = (path: string) => pathname === path

  return (
    <nav style={{
      background: '#0f0c29',
      borderBottom: '1px solid #ffffff12',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 24 }}>🛼</span>
        <span style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 16 }}>QuadSkate</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => router.push('/eventos')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: active('/eventos') ? '#818cf8' : '#94a3b8', fontWeight: 600, fontSize: 13, padding: '6px 10px' }}>
          Eventos
        </button>

        {user ? (
          <>
            <button onClick={() => router.push('/notificaciones')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, position: 'relative', padding: '6px 8px' }}>
              🔔
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 9, fontWeight: 800, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {unread}
                </span>
              )}
            </button>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: active('/dashboard') ? '#818cf8' : '#94a3b8', fontWeight: 600, fontSize: 13, padding: '6px 10px' }}>
              Mi panel
            </button>
            <button onClick={logout} style={{ background: '#ffffff10', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
              Salir
            </button>
          </>
        ) : (
          <button onClick={() => router.push('/auth')} style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Ingresar
          </button>
        )}
      </div>
    </nav>
  )
}