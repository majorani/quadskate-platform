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
  const [open, setOpen] = useState(false)

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

  useEffect(() => { setOpen(false) }, [pathname])

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

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  const linkStyle = (path: string): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: 'pointer',
    color: pathname === path ? '#C9A84C' : '#666',
    fontWeight: 700, fontSize: 11, padding: '6px 12px',
    letterSpacing: 2, textTransform: 'uppercase' as const,
    borderBottom: pathname === path ? '1px solid #C9A84C' : '1px solid transparent',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <>
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
        <button onClick={() => go('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: '#e8e8e8' }}>QUAD</span>
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: '#C9A84C' }}>SKATE</span>
          <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: 2, color: '#444', marginLeft: 2 }}>PLATFORM</span>
        </button>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-desktop">
          <button onClick={() => go('/eventos')} style={linkStyle('/eventos')}>Eventos</button>
          {user ? (
            <>
              <button onClick={() => go('/notificaciones')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 14, position: 'relative', padding: '6px 10px' }}>
                🔔
                {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 4, background: '#C9A84C', color: '#000', borderRadius: 999, fontSize: 9, fontWeight: 900, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unread}</span>}
              </button>
              <button onClick={() => go('/dashboard')} style={linkStyle('/dashboard')}>Mi panel</button>
              <button onClick={logout} style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '6px 14px', color: '#666', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Salir</button>
            </>
          ) : (
            <button onClick={() => go('/auth')} style={{ background: '#C9A84C', border: 'none', padding: '8px 18px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}>Ingresar</button>
          )}
        </div>

        {/* Hamburger — mobile */}
        <button
          onClick={() => setOpen(!open)}
          className="nav-hamburger"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'none', flexDirection: 'column', gap: 5, flexShrink: 0 }}
        >
          <span style={{ display: 'block', width: 22, height: 2, background: open ? '#C9A84C' : '#e8e8e8', transition: 'all .2s', transform: open ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: open ? '#C9A84C' : '#e8e8e8', transition: 'all .2s', opacity: open ? 0 : 1 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: open ? '#C9A84C' : '#e8e8e8', transition: 'all .2s', transform: open ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, bottom: 0,
          background: '#0a0a0a', borderTop: '1px solid #2a2a2a',
          zIndex: 99, display: 'flex', flexDirection: 'column',
          padding: '32px 24px', gap: 2,
        }}>
          <MobileLink label="Eventos" onClick={() => go('/eventos')} active={pathname === '/eventos'} />
          {user ? (
            <>
              <MobileLink
                label={unread > 0 ? `Notificaciones (${unread})` : 'Notificaciones'}
                onClick={() => go('/notificaciones')}
                active={pathname === '/notificaciones'}
                gold={unread > 0}
              />
              <MobileLink label="Mi panel" onClick={() => go('/dashboard')} active={pathname === '/dashboard'} />
              <div style={{ marginTop: 'auto', paddingTop: 32, borderTop: '1px solid #2a2a2a' }}>
                <button onClick={logout} style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '14px 28px', color: '#666', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>
                  Salir
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 'auto' }}>
              <button onClick={() => go('/auth')} style={{ background: '#C9A84C', border: 'none', padding: '16px', color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>
                Ingresar
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}

function MobileLink({ label, onClick, active, gold }: { label: string, onClick: () => void, active: boolean, gold?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      padding: '18px 0', fontSize: 22, fontWeight: 900, letterSpacing: -0.5,
      textTransform: 'uppercase', color: active ? '#C9A84C' : gold ? '#C9A84C' : '#e8e8e8',
      borderBottom: '1px solid #1a1a1a', width: '100%',
    }}>
      {label}
    </button>
  )
}