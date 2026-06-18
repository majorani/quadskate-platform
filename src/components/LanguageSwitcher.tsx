'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useTransition } from 'react'

const LOCALES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function switchLocale(next: string) {
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <div style={{ display: 'flex', gap: 1, background: '#1a1a1a' }}>
      {LOCALES.map(l => (
        <button
          key={l.code}
          onClick={() => switchLocale(l.code)}
          disabled={isPending}
          style={{
            background: locale === l.code ? '#D4B45A' : 'transparent',
            border: 'none',
            padding: '4px 8px',
            color: locale === l.code ? '#000' : '#555',
            fontWeight: 700,
            fontSize: 10,
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'all 0.15s ease',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}