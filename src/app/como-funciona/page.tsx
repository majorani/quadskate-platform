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
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    num: '02', label: 'MODALIDAD', title: 'Elegir el tipo',
    desc: 'Competencia con categorías, jueces y puntaje completo, o un encuentro de comunidad más libre.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    num: '03', label: 'DATOS BASE', title: 'Formulario base',
    desc: 'Nombre, ciudad, lugar, fecha y hora. Todo lo necesario para que el evento tome forma.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    num: '04', label: 'IDENTIDAD', title: 'Flyer y descripción',
    desc: 'Subí el flyer oficial y contale a la comunidad de qué se trata tu evento.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>,
  },
  {
    num: '05', label: 'ESTRUCTURA', title: 'Categorías y jueces',
    desc: 'Definí formatos (Formal, Jam, Mixto, Best Trick), invitá jueces por email y armá tu equipo.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
  {
    num: '06', label: 'LANZAMIENTO', title: 'Publicar',
    desc: 'Listo. Tu evento queda visible para toda la comunidad de patín y empieza a circular.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
  },
]

const DELAYS = [0, 80, 160, 240, 0, 0, 0, 0, 0, 0, 0, 0, 0]

export default function ComoFuncionaPage() {
  const router = useRouter()
  const [hovered, setHovered] = useState<number | null>(null)
  const [btnHov, setBtnHov]   = useState(false)
  const elRefs = useRef<(HTMLDivElement | null)[]>(Array(15).fill(null))

  function setElRef(index: number) {
    return (el: HTMLDivElement | null) => { elRefs.current[index] = el }
  }

  useEffect(() => {
    elRefs.current.forEach((el, i) => {
      if (!el) return
      const d = DELAYS[i] ?? 0
      el.style.opacity = '0'
      el.style.transform = 'translateY(24px)'
      el.style.transition = `opacity 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${d}ms, transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${d}ms`
    })
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.08 }
    )
    elRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f4f1e8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Manrope:wght@300;400;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .arch    { font-family: 'Archivo Black', sans-serif !important; }
        .mono    { font-family: 'JetBrains Mono', monospace !important; }
        .manrope { font-family: 'Manrope', sans-serif !important; }

        /* Expanding step cards */
        .step-card {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          border-right: 1px solid #1f1f1f;
          padding: 32px 20px;
          cursor: default;
          transition: flex 0.45s cubic-bezier(0.25,0.46,0.45,0.94), background 0.3s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .step-card:last-child { border-right: none; }
        .step-card:hover { flex: 3.5 !important; background: #111 !important; }

        /* Collapsed content: always visible */
        .step-collapsed { flex-shrink: 0; }

        /* Expanded content: fade in on hover */
        .step-expanded {
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          transition: opacity 0.3s ease 0.1s, max-height 0.4s ease;
          pointer-events: none;
        }
        .step-card:hover .step-expanded {
          opacity: 1;
          max-height: 300px;
          pointer-events: auto;
        }

        /* Mobile: stack vertically */
        @media (max-width: 768px) {
          .steps-container { flex-direction: column !important; }
          .step-card {
            flex: none !important;
            border-right: none !important;
            border-bottom: 1px solid #1f1f1f;
            padding: 24px 20px !important;
          }
          .step-card:last-child { border-bottom: none; }
          .step-card:hover { flex: none !important; }
          .step-expanded {
            opacity: 1 !important;
            max-height: none !important;
            pointer-events: auto !important;
          }
        }

        /* "Una vez publicado" strip */
        .published-strip {
          display: flex;
          border-top: 1px solid #1f1f1f;
          border-bottom: 1px solid #1f1f1f;
        }
        .published-half {
          flex: 1;
          padding: clamp(32px, 5vw, 64px);
          transition: background 0.3s ease;
        }
        .published-half:first-child {
          border-right: 1px solid #1f1f1f;
        }
        .published-half:hover { background: #0e0e0e; }
        .feature-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #555;
          font-family: 'Manrope', sans-serif;
          margin-bottom: 10px;
        }
        .feature-row::before {
          content: '';
          width: 20px;
          height: 1px;
          background: ${GOLD};
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .published-strip { flex-direction: column; }
          .published-half:first-child { border-right: none; border-bottom: 1px solid #1f1f1f; }
        }
      `}</style>

      {/* Grain */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.035, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px' }} />

      <Nav />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── HERO ── */}
        <section style={{ padding: 'clamp(64px, 10vw, 120px) clamp(20px, 5vw, 80px)', maxWidth: 1100, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <div ref={setElRef(0)} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            <div style={{ width: 48, height: 1, background: GOLD }} />
            <span className="mono" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.28em', color: GOLD, textTransform: 'uppercase' }}>Cómo funciona</span>
          </div>

          <div ref={setElRef(1)}>
            <h1 className="arch" style={{ fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: 32, color: '#f4f1e8' }}>
              De la idea<br />al podio en<br /><span style={{ color: GOLD }}>6 pasos.</span>
            </h1>
          </div>

          <div ref={setElRef(2)}>
            <p className="manrope" style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#8a8a82', maxWidth: 540, lineHeight: 1.7, fontWeight: 300, marginBottom: 56 }}>
              Creá tu evento de patín en minutos. <strong style={{ color: '#f4f1e8', fontWeight: 700 }}>Quad Circuit</strong> te simplifica todo lo que necesitás — impulsemos juntos la comunidad.
            </p>
          </div>

          <div ref={setElRef(3)} style={{ borderTop: '1px solid #1f1f1f', paddingTop: 28, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
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

        {/* ── PASOS — expanding cards ── */}
        <section style={{ borderTop: '1px solid #1f1f1f' }}>
          {/* Header */}
          <div ref={setElRef(4)} style={{ padding: 'clamp(32px, 5vw, 56px) clamp(20px, 5vw, 80px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <h2 className="arch" style={{ fontSize: 'clamp(24px, 3.5vw, 42px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#f4f1e8', lineHeight: 1 }}>
              El flujo, <span style={{ color: GOLD }}>paso</span> a paso.
            </h2>
            <div className="mono" style={{ fontSize: 10, color: '#444', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
              06 etapas
            </div>
          </div>

          {/* Cards expandibles */}
          <div
            ref={setElRef(5)}
            className="steps-container"
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex',
              borderTop: '1px solid #1f1f1f',
              minHeight: 320,
            }}
          >
            {STEPS.map((step, i) => {
              const isHov = hovered === i
              return (
                <div
                  key={i}
                  className="step-card"
                  onMouseEnter={() => setHovered(i)}
                  style={{ background: isHov ? '#111' : '#0a0a0a' }}
                >
                  {/* Siempre visible */}
                  <div className="step-collapsed">
                    <div className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 500 }}>
                      {step.num}
                    </div>
                    <div className="arch" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: isHov ? '#f4f1e8' : '#555', lineHeight: 1.2, transition: 'color 0.3s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.label}
                    </div>
                  </div>

                  {/* Solo visible en hover */}
                  <div className="step-expanded">
                    <div style={{ marginTop: 28, marginBottom: 20 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        border: `1px solid ${GOLD}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: GOLD, marginBottom: 20,
                      }}>
                        {step.icon}
                      </div>
                      <h3 className="arch" style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 12, lineHeight: 1.1 }}>
                        {step.title}
                      </h3>
                      <p className="manrope" style={{ fontSize: 13, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* Número decorativo bottom */}
                  <div className="arch" style={{
                    fontSize: 80, lineHeight: 1, color: 'transparent',
                    WebkitTextStroke: `1px ${isHov ? GOLD + '44' : '#1a1a1a'}`,
                    transition: 'all 0.3s ease',
                    userSelect: 'none', pointerEvents: 'none',
                    letterSpacing: '-0.04em', marginTop: 'auto',
                    alignSelf: 'flex-end',
                  }}>
                    {step.num}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── UNA VEZ PUBLICADO — franja editorial ── */}
        <section style={{ borderTop: '1px solid #1f1f1f', padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 80px)' }}>

          {/* Header centrado */}
          <div ref={setElRef(6)} style={{ textAlign: 'center', marginBottom: 'clamp(40px, 6vw, 64px)' }}>
            <div style={{ width: 80, height: 2, background: GOLD, margin: '0 auto 24px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 40, height: 1, background: '#1f1f1f' }} />
              <span className="mono" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Una vez publicado</span>
              <div style={{ width: 40, height: 1, background: '#1f1f1f' }} />
            </div>
            <h2 className="arch" style={{ fontSize: 'clamp(24px, 4vw, 48px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#f4f1e8', lineHeight: 1 }}>
              La plataforma hace el resto.
            </h2>
          </div>

          {/* Franja dividida — opción C */}
          <div ref={setElRef(7)} className="published-strip">

            {/* Mitad izquierda — Patinadores */}
            <div className="published-half">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'inline-block', flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500 }}>Para patinadores</span>
              </div>

              <h3 className="arch" style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 16, lineHeight: 1 }}>
                Descubrir e inscribirse
              </h3>

              <p className="manrope" style={{ fontSize: 14, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, marginBottom: 32, maxWidth: 360 }}>
                Los patinadores encuentran tu evento, se inscriben en sus categorías y lo comparten con la comunidad. Sin fricciones.
              </p>

              <div>
                {['Vista pública del evento', 'Inscripción online', 'Compartir por redes'].map((f, i) => (
                  <div key={i} className="feature-row">{f}</div>
                ))}
              </div>
            </div>

            {/* Mitad derecha — Jueces */}
            <div className="published-half">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'inline-block', flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500 }}>Para jueces</span>
              </div>

              <h3 className="arch" style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 16, lineHeight: 1 }}>
                Puntuar en vivo
              </h3>

              <p className="manrope" style={{ fontSize: 14, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, marginBottom: 32, maxWidth: 360 }}>
                Los jueces invitados acceden desde cualquier dispositivo y puntúan a cada participante en tiempo real. Resultados al instante.
              </p>

              <div>
                {['Acceso por invitación', 'Puntuación en tiempo real', 'Ranking automático'].map((f, i) => (
                  <div key={i} className="feature-row">{f}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section style={{ borderTop: '1px solid #1f1f1f', padding: 'clamp(64px, 10vw, 120px) clamp(20px, 5vw, 80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 400, background: `radial-gradient(ellipse, ${GOLD}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div ref={setElRef(8)} style={{ position: 'relative', zIndex: 1 }}>
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
              }}
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