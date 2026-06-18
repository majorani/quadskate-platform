'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { User } from '@supabase/supabase-js'

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('Nav')
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
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false)
    setUnread(count ?? 0)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function go(path: string) {
    setOpen(false)
    router.push(path as any)
  }

  const linkStyle = (path: string): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: 'pointer',
    color: pathname === path ? '#D4B45A' : '#666',
    fontWeight: 700, fontSize: 11, padding: '6px 12px',
    letterSpacing: 2, textTransform: 'uppercase' as const,
    borderBottom: pathname === path ? '1px solid #D4B45A' : '1px solid transparent',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <>
      <nav style={{
        background: '#0a0a0a', borderBottom: '1px solid #2a2a2a',
        padding: '0 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56,
        position: 'sticky', top: 0, zIndex: 100,
        width: '100%', overflow: 'hidden',
      }}>
        <button onClick={() => go('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 0, flexShrink: 0, minWidth: 0, padding: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: '#D4B45A', whiteSpace: 'nowrap' }}>QSKT</span>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: '#e8e8e8', whiteSpace: 'nowrap', marginLeft: 5 }}>PLATFORM</span>
          <span className="nav-by" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#444', marginLeft: 7, whiteSpace: 'nowrap' }}>BY MAJORANI</span>
        </button>

        {/* Desktop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-desktop">
          <button onClick={() => go('/como-funciona')} style={linkStyle('/como-funciona')}>{t('howItWorks')}</button>
          <button onClick={() => go('/eventos')} style={linkStyle('/eventos')}>{t('events')}</button>
          {user ? (
            <>
              <button onClick={() => go('/notificaciones')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 14, position: 'relative', padding: '6px 10px' }}>
                🔔
                {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 4, background: '#D4B45A', color: '#000', borderRadius: 999, fontSize: 9, fontWeight: 900, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unread}</span>}
              </button>
              <button onClick={() => go('/perfil')} style={linkStyle('/perfil')}>{t('profile')}</button>
              <button onClick={() => go('/dashboard')} style={linkStyle('/dashboard')}>{t('myPanel')}</button>
              <button onClick={logout} style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '6px 14px', color: '#666', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{t('logout')}</button>
            </>
          ) : (
            <button onClick={() => go('/auth')} style={{ background: '#D4B45A', border: 'none', padding: '8px 18px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}>{t('login')}</button>
          )}
          <div style={{ marginLeft: 6 }}><LanguageSwitcher /></div>
        </div>

        {/* Hamburger */}
        <button onClick={() => setOpen(!open)} className="nav-hamburger" aria-label="Menú"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'none', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <span style={{ display: 'block', width: 22, height: 2, background: open ? '#D4B45A' : '#e8e8e8', transition: 'all .2s', transform: open ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: open ? '#D4B45A' : '#e8e8e8', transition: 'all .2s', opacity: open ? 0 : 1 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: open ? '#D4B45A' : '#e8e8e8', transition: 'all .2s', transform: open ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, bottom: 0, background: '#0a0a0a', borderTop: '1px solid #2a2a2a', zIndex: 99, display: 'flex', flexDirection: 'column', padding: '24px 24px 32px', gap: 0, overflowY: 'auto' }}>
          <MobileLink label={t('howItWorks')} onClick={() => go('/como-funciona')} active={pathname === '/como-funciona'} />
          <MobileLink label={t('events')} onClick={() => go('/eventos')} active={pathname === '/eventos'} />
          {user ? (
            <>
              <MobileLink label={unread > 0 ? `${t('notifications')} (${unread})` : t('notifications')} onClick={() => go('/notificaciones')} active={pathname === '/notificaciones'} gold={unread > 0} />
              <MobileLink label={t('profile')} onClick={() => go('/perfil')} active={pathname === '/perfil'} />
              <MobileLink label={t('myPanel')} onClick={() => go('/dashboard')} active={pathname === '/dashboard'} />
              <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a' }}><LanguageSwitcher /></div>
              <div style={{ marginTop: 'auto', paddingTop: 32, borderTop: '1px solid #2a2a2a' }}>
                <button onClick={logout} style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '14px 28px', color: '#666', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>{t('logout')}</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a' }}><LanguageSwitcher /></div>
              <div style={{ marginTop: 'auto' }}>
                <button onClick={() => go('/auth')} style={{ background: '#D4B45A', border: 'none', padding: '16px', color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer', letterSpacing: 3, textTransform: 'uppercase', width: '100%' }}>{t('login')}</button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
        @media (max-width: 360px) {
          .nav-by { display: none !important; }
        }
      `}</style>
    </>
  )
}

function MobileLink({ label, onClick, active, gold }: { label: string, onClick: () => void, active: boolean, gold?: boolean }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '18px 0', fontSize: 22, fontWeight: 900, letterSpacing: -0.5, textTransform: 'uppercase', color: active ? '#D4B45A' : gold ? '#D4B45A' : '#e8e8e8', borderBottom: '1px solid #1a1a1a', width: '100%' }}>
      {label}
    </button>
  )
}