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
  const [menu, setMenu] = useState(false)

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

  return (
    <nav style={{
      background: '#0a0a0a',
      borderBottom: '1px solid #2a2a2a',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: '#e8e8e8' }}>QUAD</span>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: '#C9A84C' }}>SKATE</span>
        <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: 2, color: '#666', marginLeft: 4 }}>PLATFORM</span>
      </button>

      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => router.push('/eventos')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: pathname === '/eventos' ? '#C9A84C' : '#666',
          fontWeight: 700, fontSize: 11, padding: '6px 12px',
          letterSpacing: 2, textTransform: 'uppercase',
          borderBottom: pathname === '/eventos' ? '1px solid #C9A84C' : '1px solid transparent',
        }}>
          Eventos
        </button>

        {user ? (
          <>
            <button onClick={() => router.push('/notificaciones')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#666', fontSize: 14, position: 'relative', padding: '6px 10px',
            }}>
              🔔
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 4, background: '#C9A84C', color: '#000', borderRadius: 999, fontSize: 9, fontWeight: 900, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {unread}
                </span>
              )}
            </button>
            <button onClick={() => router.push('/dashboard')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: pathname === '/dashboard' ? '#C9A84C' : '#666',
              fontWeight: 700, fontSize: 11, padding: '6px 12px',
              letterSpacing: 2, textTransform: 'uppercase',
              borderBottom: pathname === '/dashboard' ? '1px solid #C9A84C' : '1px solid transparent',
            }}>
              Mi panel
            </button>
            <button onClick={logout} style={{
              background: 'transparent', border: '1px solid #2a2a2a',
              padding: '6px 14px', color: '#666', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
            }}>
              Salir
            </button>
          </>
        ) : (
          <button onClick={() => router.push('/auth')} style={{
            background: '#C9A84C', border: 'none',
            padding: '8px 18px', color: '#000',
            fontWeight: 900, fontSize: 11, cursor: 'pointer',
            letterSpacing: 2, textTransform: 'uppercase',
          }}>
            Ingresar
          </button>
        )}
      </div>
    </nav>
  )
}