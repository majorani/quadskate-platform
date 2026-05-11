'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

const GOLD = '#C9A227'
const GOLD_L = '#E2BC4A'

const STEPS = [
  {
    num: '01', label: 'ACCESO', title: 'Iniciar sesión',
    desc: 'Entra con tu cuenta de organizador y accedé al panel donde vivirán todos tus eventos.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    num: '02', label: 'MODALIDAD', title: 'Elegir el tipo de evento',
    desc: 'Competencia con categorías, jueces y puntaje completo, o un encuentro de comunidad más libre.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    num: '03', label: 'LO ESENCIAL', title: 'Completar el formulario base',
    desc: 'Nombre del evento, ciudad, lugar, fecha y hora. Todo lo necesario para que tome forma.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
      </svg>
    ),
  },
  {
    num: '04', label: 'IDENTIDAD VISUAL', title: 'Sumar el flyer y descripción',
    desc: 'Subí el flyer oficial (JPG, PNG o WEBP) y contale a la comunidad de qué se trata.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
      </svg>
    ),
  },
  {
    num: '05', label: 'ESTRUCTURA', title: 'Categorías, jueces y staff',
    desc: 'Definí formatos (Formal, Jam, Mixto, Best Trick), invitá jueces por email y armá tu equipo.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    num: '06', label: 'LANZAMIENTO', title: 'Publicar el evento',
    desc: 'Listo. Tu evento queda visible para toda la comunidad de patín y empieza a circular.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
      </svg>
    ),
  },
]

export default function ComoFuncionaPage() {
  const router = useRouter()
  const [hovered, setHovered] = useState<number | null>(null)
  const [card1Hov, setCard1Hov] = useState(false)
  const [card2Hov, setCard2Hov] = useState(false)
  const [btnHov, setBtnHov] = useState(false)
  const revealRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = Number(el.dataset.delay ?? 0)
            setTimeout(() => {
              el.style.opacity = '1'
              el.style.transform = 'translateY(0)'
            }, delay)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.1 }
    )
    revealRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  function reveal(index: number, delay = 0) {
    return (el: HTMLDivElement | null) => {
      if (el) {
        el.style.opacity = '0'
        el.style.transform = 'translateY(24px)'
        el.style.transition = `opacity 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`
        revealRefs.current[index] = el
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f4f1e8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Manrope:wght@300;400;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .arch { font-family: 'Archivo Black', sans-serif !important; }
        .mono { font-family: 'JetBrains Mono', monospace !important; }
        .manrope { font-family: 'Manrope', sans-serif !important; }
        .step-card { transition: background 0.3s ease; }
        .step-card:hover { background: #141414 !important; }
        .feature-item::before { content: '—'; color: ${GOLD}; margin-right: 10px; font-weight: 700; }
      `}</style>

      <Nav />

      {/* Grain overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.035, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── HERO ── */}
        <section style={{ padding: 'clamp(64px, 10vw, 120px) clamp(20px, 5vw, 80px)', maxWidth: 1100, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>

          {/* Gold glow */}
          <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

          {/* Eyebrow */}
          <div ref={reveal(0)} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            <div style={{ width: 48, height: 1, background: GOLD }} />
            <span className="mono" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.28em', color: GOLD, textTransform: 'uppercase' }}>
              Cómo funciona
            </span>
          </div>

          {/* Título */}
          <div ref={reveal(1, 80)}>
            <h1 className="arch" style={{ fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: 32, color: '#f4f1e8' }}>
              De la idea<br />
              al podio en<br />
              <span style={{ color: GOLD }}>6 pasos.</span>
            </h1>
          </div>

          {/* Subtítulo */}
          <div ref={reveal(2, 160)}>
            <p className="manrope" style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#8a8a82', maxWidth: 540, lineHeight: 1.7, fontWeight: 300, marginBottom: 56 }}>
              Creá tu evento de patín en minutos. <strong style={{ color: '#f4f1e8', fontWeight: 700 }}>Quad Circuit</strong> te simplifica todo lo que necesitás para conseguirlo — impulsemos juntos la comunidad.
            </p>
          </div>

          {/* Meta strip */}
          <div ref={reveal(3, 240)} style={{ borderTop: '1px solid #1f1f1f', paddingTop: 28, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            {[
              { label: 'Pasos', value: '06' },
              { label: 'Tipos de evento', value: 'Competencia · Encuentro' },
              { label: 'Tiempo estimado', value: '~10 min' },
            ].map((item, i) => (
              <div key={i}>
                <div className="mono" style={{ fontSize: 9, color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                <div className="manrope" style={{ fontSize: 14, fontWeight: 700, color: '#f4f1e8' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PASOS ── */}
        <section style={{ borderTop: '1px solid #1f1f1f', padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 80px)', maxWidth: 1100, margin: '0 auto' }}>

          {/* Header sección */}
          <div ref={reveal(4)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20, marginBottom: 48 }}>
            <h2 className="arch" style={{ fontSize: 'clamp(28px, 4vw, 48px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#f4f1e8', lineHeight: 1 }}>
              El flujo, <span style={{ color: GOLD }}>paso</span> a paso.
            </h2>
            <div className="mono" style={{ fontSize: 10, color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase', textAlign: 'right' }}>
              Flujo completo · 06 etapas
            </div>
          </div>

          {/* Grid de pasos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1, background: '#1f1f1f' }}>
            {STEPS.map((step, i) => (
              <div
                key={i}
                ref={reveal(5 + i, i * 60)}
                className="step-card"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: hovered === i ? '#141414' : '#0a0a0a',
                  padding: 'clamp(24px, 4vw, 40px)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'default',
                }}
              >
                {/* Numeral gigante */}
                <div className="arch" style={{
                  position: 'absolute', top: -10, right: 12,
                  fontSize: 140, lineHeight: 1, fontWeight: 900,
                  color: 'transparent',
                  WebkitTextStroke: `1px ${hovered === i ? GOLD : '#2a2a2a'}`,
                  transition: 'all 0.3s ease',
                  userSelect: 'none', pointerEvents: 'none',
                  letterSpacing: '-0.04em',
                }}>
                  {step.num}
                </div>

                {/* Gradient diagonal en hover */}
                {hovered === i && (
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${GOLD}06 0%, transparent 60%)`, pointerEvents: 'none', transition: 'opacity 0.3s' }} />
                )}

                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Icono */}
                  <div style={{
                    width: 44, height: 44, border: `1px solid ${hovered === i ? GOLD : '#2a2a2a'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: hovered === i ? GOLD : '#555',
                    marginBottom: 24, transition: 'all 0.3s ease',
                    borderRadius: '50%',
                  }}>
                    {step.icon}
                  </div>

                  {/* Label eyebrow */}
                  <div className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>
                    {step.label}
                  </div>

                  {/* Título */}
                  <h3 className="arch" style={{ fontSize: 'clamp(17px, 2vw, 21px)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 14, lineHeight: 1.1 }}>
                    {step.title}
                  </h3>

                  {/* Descripción */}
                  <p className="manrope" style={{ fontSize: 13, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── UNA VEZ PUBLICADO ── */}
        <section style={{ borderTop: '1px solid #1f1f1f', padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 80px)', maxWidth: 1100, margin: '0 auto' }}>

          {/* Separador con línea gold centrada */}
          <div ref={reveal(11)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 48 }}>
            <div style={{ width: 120, height: 2, background: GOLD, marginBottom: 28 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: '#1f1f1f', minWidth: 40 }} />
              <span className="mono" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Una vez publicado</span>
              <div style={{ flex: 1, height: 1, background: '#1f1f1f', minWidth: 40 }} />
            </div>
            <h2 className="arch" style={{ fontSize: 'clamp(24px, 4vw, 44px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#f4f1e8', textAlign: 'center', lineHeight: 1 }}>
              La plataforma hace el resto.
            </h2>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: '#1f1f1f' }}>

            {/* Card 1 — Patinadores */}
            <div
              ref={reveal(12, 60)}
              onMouseEnter={() => setCard1Hov(true)}
              onMouseLeave={() => setCard1Hov(false)}
              style={{ background: '#0a0a0a', padding: 'clamp(24px, 4vw, 40px)', border: `1px solid ${card1Hov ? GOLD + '55' : 'transparent'}`, transition: 'border-color 0.3s ease', cursor: 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: card1Hov ? `0 0 12px ${GOLD}` : 'none', transition: 'box-shadow 0.3s', display: 'inline-block', flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500 }}>Para patinadores</span>
              </div>
              <h3 className="arch" style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 14, lineHeight: 1.1 }}>
                Descubrir e inscribirse
              </h3>
              <p className="manrope" style={{ fontSize: 13, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, marginBottom: 24 }}>
                Los patinadores encuentran tu evento en la plataforma, se inscriben en sus categorías y lo comparten con la comunidad. Sin fricciones.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Vista pública del evento', 'Inscripción online', 'Compartir por redes'].map((f, i) => (
                  <div key={i} className="feature-item manrope" style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center' }}>{f}</div>
                ))}
              </div>
            </div>

            {/* Card 2 — Jueces */}
            <div
              ref={reveal(13, 120)}
              onMouseEnter={() => setCard2Hov(true)}
              onMouseLeave={() => setCard2Hov(false)}
              style={{ background: '#0a0a0a', padding: 'clamp(24px, 4vw, 40px)', border: `1px solid ${card2Hov ? GOLD + '55' : 'transparent'}`, transition: 'border-color 0.3s ease', cursor: 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: card2Hov ? `0 0 12px ${GOLD}` : 'none', transition: 'box-shadow 0.3s', display: 'inline-block', flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500 }}>Para jueces</span>
              </div>
              <h3 className="arch" style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 14, lineHeight: 1.1 }}>
                Puntuar en vivo
              </h3>
              <p className="manrope" style={{ fontSize: 13, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, marginBottom: 24 }}>
                El día del evento, los jueces invitados acceden desde su dispositivo y puntúan a cada participante en tiempo real. Resultados al instante.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Acceso por invitación', 'Puntuación en tiempo real', 'Ranking automático'].map((f, i) => (
                  <div key={i} className="feature-item manrope" style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center' }}>{f}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section style={{ borderTop: '1px solid #1f1f1f', padding: 'clamp(64px, 10vw, 120px) clamp(20px, 5vw, 80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

          {/* Glow radial */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 400, background: `radial-gradient(ellipse, ${GOLD}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <div ref={reveal(14)} style={{ position: 'relative', zIndex: 1 }}>
            <h2 className="arch" style={{ fontSize: 'clamp(32px, 6vw, 72px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#f4f1e8', lineHeight: 1, marginBottom: 20 }}>
              ¿Listo para tu próximo <span style={{ color: GOLD }}>evento?</span>
            </h2>
            <p className="manrope" style={{ fontSize: 16, color: '#8a8a82', marginBottom: 48, fontWeight: 300 }}>
              La comunidad de patín te espera.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              onMouseEnter={() => setBtnHov(true)}
              onMouseLeave={() => setBtnHov(false)}
            style={{
            background: btnHov ? GOLD_L : GOLD,
            border: 'none',
            padding: '18px 48px',
            color: '#000',
            fontWeight: 900,
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: "'Archivo Black', sans-serif",
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            transition: 'background 0.2s ease',
            } as React.CSSProperties}
            >
              Crear mi evento
              <span style={{ display: 'inline-block', transform: btnHov ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.2s ease', fontSize: 16 }}>→</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}