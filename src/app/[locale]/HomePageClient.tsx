'use client'

import { useTranslations } from 'next-intl'
import Nav from '@/components/Nav'
import EventCard from '@/components/EventCard'
import type { Event } from '@/lib/supabase'
import { REGLAMENTO_ESTANDAR_URL } from '@/lib/supabase'

export default function HomePageClient({ events }: { events: Event[] }) {
  const t = useTranslations('HomePage')

  return (
    <>
      <Nav />
      <main style={{ background: '#0a0a0a', minHeight: '100vh' }}>

        {/* HERO */}
        <div style={{ borderBottom: '1px solid #2a2a2a', padding: '80px 24px 72px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 24, textTransform: 'uppercase' }}>
              {t('hero.eyebrow')}
            </div>
            <h1 style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 900, lineHeight: 1, letterSpacing: -2, textTransform: 'uppercase', marginBottom: 32 }}>
              <span style={{ color: '#e8e8e8' }}>QUAD</span><br />
              <span style={{ color: '#C9A84C' }}>SKATE</span><br />
              <span style={{ color: '#e8e8e8' }}>PLATFORM.</span>
            </h1>
            <p style={{ color: '#666', fontSize: 16, maxWidth: 480, lineHeight: 1.7, marginBottom: 40 }}>
              {t('hero.subtitle')}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/eventos" style={{ background: '#C9A84C', border: 'none', padding: '14px 32px', color: '#000', fontWeight: 900, fontSize: 11, textDecoration: 'none', letterSpacing: 3, textTransform: 'uppercase', display: 'inline-block' }}>
                {t('hero.ctaEvents')}
              </a>
              <a href="/auth" style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '14px 32px', color: '#e8e8e8', fontWeight: 700, fontSize: 11, textDecoration: 'none', letterSpacing: 3, textTransform: 'uppercase', display: 'inline-block' }}>
                {t('hero.ctaLogin')}
              </a>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div style={{ borderBottom: '1px solid #2a2a2a', padding: '0 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap' }}>
            {([
              [t('stats.judgesValue'),       t('stats.judgesLabel')],
              [t('stats.transparencyValue'), t('stats.transparencyLabel')],
              [t('stats.realtimeValue'),     t('stats.realtimeLabel')],
              [t('stats.originValue'),       t('stats.originLabel')],
            ] as [string, string][]).map(([val, label]) => (
              <div key={label} style={{ flex: '1 1 200px', padding: '28px 24px', borderRight: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#C9A84C', letterSpacing: -1 }}>{val}</div>
                <div style={{ fontSize: 11, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* EVENTOS */}
        {events.length > 0 && (
          <div style={{ padding: '64px 24px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase' }}>{t('events.eyebrow')}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{t('events.title')}</div>
                </div>
                <a href="/eventos" style={{ color: '#C9A84C', fontSize: 11, fontWeight: 700, letterSpacing: 2, textDecoration: 'none', textTransform: 'uppercase' }}>
                  {t('events.seeAll')}
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 1, background: '#2a2a2a' }}>
                {events.map(ev => <EventCard key={ev.id} event={ev} />)}
              </div>
            </div>
          </div>
        )}

        {/* FEATURES */}
        <div style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 40, textTransform: 'uppercase' }}>
              {t('features.eyebrow')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 1, background: '#2a2a2a' }}>
              {([
                ['01', t('features.f1Title'), t('features.f1Desc')],
                ['02', t('features.f2Title'), t('features.f2Desc')],
                ['03', t('features.f3Title'), t('features.f3Desc')],
                ['04', t('features.f4Title'), t('features.f4Desc')],
              ] as [string, string, string][]).map(([num, title, desc]) => (
                <div key={num} style={{ background: '#0a0a0a', padding: 32 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#1a1a1a', letterSpacing: -2, marginBottom: 16 }}>{num}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#e8e8e8', marginBottom: 10 }}>{title}</div>
                  <div style={{ color: '#666', fontSize: 13, lineHeight: 1.6 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KIT DE MARCA */}
        <div style={{ borderTop: '1px solid #2a2a2a', padding: '64px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 40 }}>

              {/* Texto */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase' }}>
                  {t('brand.eyebrow')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5, marginBottom: 12 }}>
                  {t('brand.title')}
                </div>
                <p style={{ color: '#666', fontSize: 13, lineHeight: 1.7, maxWidth: 420, marginBottom: 28 }}>
                  {t('brand.desc')}
                </p>
                <a
                  href="/logo-qskt.png"
                  download="QSKT_Platform_Logo.png"
                  style={{ background: 'transparent', border: '1px solid #C9A84C', padding: '12px 24px', color: '#C9A84C', fontWeight: 700, fontSize: 11, textDecoration: 'none', letterSpacing: 3, textTransform: 'uppercase', display: 'inline-block' }}
                >
                  {t('brand.download')}
                </a>
              </div>

              {/* Preview del logo */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ background: '#111', border: '1px solid #2a2a2a', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src="/logo-qskt.png"
                    alt="QSKT Platform Logo"
                    style={{ width: 220, height: 'auto', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: 10, color: '#333', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginTop: 8 }}>
                  {t('brand.previewLabel')}
                </div>
                <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, textAlign: 'center', marginTop: 6 }}>
                  {t('brand.credit')}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* REGLAMENTO */}
        <div style={{ borderTop: '1px solid #2a2a2a', padding: '64px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase' }}>
                  {t('reglamento.eyebrow')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5, marginBottom: 12 }}>
                  {t('reglamento.title')}
                </div>
                <p style={{ color: '#666', fontSize: 13, lineHeight: 1.7, maxWidth: 420, marginBottom: 24 }}>
                  {t('reglamento.desc')}
                </p>
                <a href={REGLAMENTO_ESTANDAR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: 'transparent', border: '1px solid #C9A84C', padding: '12px 24px', color: '#C9A84C', fontWeight: 700, fontSize: 11, textDecoration: 'none', letterSpacing: 3, textTransform: 'uppercase', display: 'inline-block' }}
                >
                  {t('reglamento.btn')}
                </a>
              </div>
              <div style={{ background: '#111', border: '1px solid #2a2a2a', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{ fontSize: 36 }}>📄</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#e8e8e8', marginBottom: 4 }}>
                    Reglamento Quad Skate v1.4
                  </div>
                  <div style={{ fontSize: 10, color: '#444', letterSpacing: 1 }}>PDF · Quad Skate Platform</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #2a2a2a', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#333', letterSpacing: 2, textTransform: 'uppercase' }}>{t('footer.copyright')}</div>
          <div style={{ fontSize: 11, color: '#333', letterSpacing: 2, textTransform: 'uppercase' }}>{t('footer.powered')}</div>
        </div>

      </main>
    </>
  )
}