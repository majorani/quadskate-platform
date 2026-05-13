'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

const GOLD = '#C9A227'
const GOLD_L = '#E2BC4A'
const MAX_W = 1100

const STEPS = [
  {
    num: '01', label: 'ACCESO', title: 'Iniciar sesión',
    desc: 'Entra con tu cuenta, crea un evento y accedé al panel donde vivirán todos tus proyectos.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    num: '02', label: 'MODALIDAD', title: 'Elegir el tipo',
    desc: 'Competencia con categorías, jueces y puntaje completo, o un encuentro de comunidad más libre.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    num: '03', label: 'DATOS BASE', title: 'Formulario básico',
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
    desc: 'Definí el formato (Formal, Jam, Best Trick), invitá jueces por email y armá tu equipo.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
  {
    num: '06', label: 'LANZAMIENTO', title: 'Publicar',
    desc: 'Listo. Tu evento queda visible para toda la comunidad de patín y empieza a circular.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
  },
]

export default function ComoFuncionaPage() {
  const router = useRouter()
  const [hovered, setHovered] = useState<number | null>(null)
  const [btnHov, setBtnHov]   = useState(false)
  const elRefs = useRef<(HTMLDivElement | null)[]>(Array(10).fill(null))

  function setElRef(i: number) {
    return (el: HTMLDivElement | null) => { elRefs.current[i] = el }
  }

  useEffect(() => {
    elRefs.current.forEach((el, i) => {
      if (!el) return
      const d = i * 60
      el.style.opacity = '0'
      el.style.transform = 'translateY(20px)'
      el.style.transition = `opacity 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${d}ms, transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${d}ms`
    })
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
            obs.unobserve(el)
          }
        })
      },
      { threshold: 0.08 }
    )
    elRefs.current.forEach(el => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  const pad = 'clamp(20px, 4vw, 60px)'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f4f1e8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Manrope:wght@300;400;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .arch    { font-family: 'Archivo Black', sans-serif !important; }
        .mono    { font-family: 'JetBrains Mono', monospace !important; }
        .manrope { font-family: 'Manrope', sans-serif !important; }

        .step-card {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          border-right: 1px solid #1f1f1f;
          padding: 28px 18px;
          cursor: default;
          transition: flex 0.45s cubic-bezier(0.25,0.46,0.45,0.94), background 0.3s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 300px;
        }
        .step-card:last-child { border-right: none; }
        .step-card:hover { flex: 3.5 !important; background: #111 !important; }

        .step-expanded {
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          transition: opacity 0.3s ease 0.15s, max-height 0.4s ease;
          pointer-events: none;
        }
        .step-card:hover .step-expanded {
          opacity: 1;
          max-height: 300px;
          pointer-events: auto;
        }

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
          width: 18px;
          height: 1px;
          background: ${GOLD};
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .steps-row { flex-direction: column !important; }
          .step-card {
            flex: none !important;
            border-right: none !important;
            border-bottom: 1px solid #1f1f1f;
            padding: 24px 20px !important;
            min-height: unset !important;
          }
          .step-card:last-child { border-bottom: none; }
          .step-card:hover { flex: none !important; }
          .step-expanded {
            opacity: 1 !important;
            max-height: none !important;
            pointer-events: auto !important;
          }
          .published-strip { flex-direction: column !important; }
          .published-half-left { border-right: none !important; border-bottom: 1px solid #1f1f1f !important; }
        }
      `}</style>

      <Nav />

      {/* ── HERO ── */}
      <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: `clamp(56px, 8vw, 100px) ${pad}` }}>
        <div ref={setElRef(0)} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          <div style={{ width: 40, height: 1, background: GOLD }} />
          <span className="mono" style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.28em', color: GOLD, textTransform: 'uppercase' }}>Cómo funciona</span>
        </div>

        <div ref={setElRef(1)}>
          <h1 className="arch" style={{ fontSize: 'clamp(44px, 7vw, 88px)', lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: 28, color: '#f4f1e8' }}>
            De la idea<br />al<span style={{ color: GOLD }}> Podio.</span>
          </h1>
        </div>

        <div ref={setElRef(2)}>
          <p className="manrope" style={{ fontSize: 'clamp(14px, 1.8vw, 17px)', color: '#8a8a82', maxWidth: 480, lineHeight: 1.7, fontWeight: 300 }}>
            Creá tu evento de patín en minutos. <strong style={{ color: '#f4f1e8', fontWeight: 700 }}>Quad Skate Platform</strong> te simplifica todo lo que necesitás. Impulsemos juntos la comunidad.
          </p>
        </div>
      </div>

      {/* ── PASOS ── */}
      <div style={{ borderTop: '1px solid #1f1f1f' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: `clamp(28px, 4vw, 48px) ${pad} 0` }}>
          <div ref={setElRef(3)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            <h2 className="arch" style={{ fontSize: 'clamp(22px, 3vw, 38px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#f4f1e8', lineHeight: 1 }}>
              Gestión, <span style={{ color: GOLD }}>paso</span> a paso.
            </h2>
            <span className="mono" style={{ fontSize: 10, color: '#444', letterSpacing: '0.3em', textTransform: 'uppercase' }}>06 etapas</span>
          </div>
        </div>

        {/* Cards — dentro del maxWidth pero con borde full */}
        <div style={{ maxWidth: MAX_W, margin: '0 auto', borderTop: '1px solid #1f1f1f' }}>
          <div
            ref={setElRef(4)}
            className="steps-row"
            onMouseLeave={() => setHovered(null)}
            style={{ display: 'flex' }}
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
                  {/* Label — siempre visible */}
                  <div>
                    <div className="arch" style={{
                      fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: isHov ? '#f4f1e8' : '#555',
                      transition: 'color 0.3s ease',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {step.label}
                    </div>
                  </div>

                  {/* Contenido expandido */}
                  <div className="step-expanded">
                    <div style={{ marginTop: 24 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        border: `1px solid ${GOLD}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: GOLD, marginBottom: 16,
                      }}>
                        {step.icon}
                      </div>
                      <h3 className="arch" style={{
                        fontSize: 'clamp(15px, 1.6vw, 18px)', textTransform: 'uppercase',
                        letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 10, lineHeight: 1.1,
                      }}>
                        {step.title}
                      </h3>
                      <p className="manrope" style={{ fontSize: 12, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* Número grande — decorativo abajo */}
                  <div className="arch" style={{
                    fontSize: 72, lineHeight: 1, color: 'transparent',
                    WebkitTextStroke: `1px ${isHov ? GOLD + '55' : '#1e1e1e'}`,
                    transition: 'all 0.3s ease',
                    userSelect: 'none', pointerEvents: 'none',
                    letterSpacing: '-0.04em',
                    alignSelf: 'flex-end',
                  }}>
                    {step.num}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── UNA VEZ PUBLICADO ── */}
      <div style={{ borderTop: '1px solid #1f1f1f', marginTop: 'clamp(48px, 7vw, 80px)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: `clamp(40px, 6vw, 72px) ${pad}` }}>

          <div ref={setElRef(5)} style={{ textAlign: 'center', marginBottom: 'clamp(36px, 5vw, 56px)' }}>
            <div style={{ width: 64, height: 2, background: GOLD, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 14 }}>
              <div style={{ width: 32, height: 1, background: '#1f1f1f' }} />
              <span className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Una vez publicado</span>
              <div style={{ width: 32, height: 1, background: '#1f1f1f' }} />
            </div>
            <h2 className="arch" style={{ fontSize: 'clamp(22px, 3.5vw, 44px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#f4f1e8', lineHeight: 1 }}>
              La plataforma hace el resto.
            </h2>
          </div>

          {/* Franja editorial dividida */}
          <div ref={setElRef(6)} className="published-strip" style={{ display: 'flex', border: '1px solid #1f1f1f' }}>

            <div className="published-half-left" style={{ flex: 1, padding: 'clamp(28px, 4vw, 48px)', borderRight: '1px solid #1f1f1f' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, display: 'inline-block' }} />
                <span className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500 }}>Para patinadores</span>
              </div>
              <h3 className="arch" style={{ fontSize: 'clamp(18px, 2.2vw, 26px)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 14, lineHeight: 1 }}>
                Descubrir e inscribirse
              </h3>
              <p className="manrope" style={{ fontSize: 13, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, marginBottom: 28, maxWidth: 340 }}>
                Los patinadores encuentran tu evento, se inscriben en sus categorías y lo comparten con la comunidad. Sin fricciones.
              </p>
              {['Vista pública del evento', 'Inscripción online', 'Compartir por redes'].map((f, i) => (
                <div key={i} className="feature-row">{f}</div>
              ))}
            </div>

            <div style={{ flex: 1, padding: 'clamp(28px, 4vw, 48px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, display: 'inline-block' }} />
                <span className="mono" style={{ fontSize: 9, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500 }}>Para jueces</span>
              </div>
              <h3 className="arch" style={{ fontSize: 'clamp(18px, 2.2vw, 26px)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f1e8', marginBottom: 14, lineHeight: 1 }}>
                Puntuar en vivo
              </h3>
              <p className="manrope" style={{ fontSize: 13, color: '#8a8a82', lineHeight: 1.7, fontWeight: 300, marginBottom: 28, maxWidth: 340 }}>
                Los jueces invitados acceden desde cualquier dispositivo y puntúan en tiempo real. Resultados al instante con total transparencia.
              </p>
              {['Acceso por invitación', 'Puntuación en tiempo real', 'Ranking automático'].map((f, i) => (
                <div key={i} className="feature-row">{f}</div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ borderTop: '1px solid #1f1f1f' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: `clamp(56px, 8vw, 100px) ${pad}`, textAlign: 'center' }}>
          <div ref={setElRef(7)}>
            <h2 className="arch" style={{ fontSize: 'clamp(28px, 5vw, 64px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#f4f1e8', lineHeight: 1, marginBottom: 18 }}>
              ¿Listo para tu próximo <span style={{ color: GOLD }}>evento?</span>
            </h2>
            <p className="manrope" style={{ fontSize: 15, color: '#8a8a82', marginBottom: 40, fontWeight: 300 }}>
              La comunidad de quad skate te espera.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              onMouseEnter={() => setBtnHov(true)}
              onMouseLeave={() => setBtnHov(false)}
              style={{
                background: btnHov ? GOLD_L : GOLD,
                border: 'none', padding: '16px 44px', color: '#000',
                fontWeight: 900, fontSize: 12, cursor: 'pointer',
                letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: "'Archivo Black', sans-serif",
                display: 'inline-flex', alignItems: 'center', gap: 10,
                transition: 'background 0.2s ease',
              }}
            >
              Crear mi evento
              <span style={{ transform: btnHov ? 'translateX(4px)' : 'none', transition: 'transform 0.2s ease', fontSize: 15 }}>→</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}