'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function JudgeButton({ eventId, ownerId }: { eventId: string, ownerId: string }) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { setLoading(false); return }
      const userId = data.session.user.id
      const userEmail = data.session.user.email

      if (userId === ownerId) { setShow(true); setLoading(false); return }

      const { data: judge } = await supabase
        .from('judges')
        .select('id')
        .eq('event_id', eventId)
        .or(`profile_id.eq.${userId},email.eq.${userEmail}`)
        .maybeSingle()

      if (judge) setShow(true)
      setLoading(false)
    }
    check()
  }, [eventId, ownerId])

  if (loading || !show) return null

  return (
    <button
      onClick={() => router.push('/jueces/' + eventId)}
      style={{
        background: '#C9A84C', border: 'none', padding: '12px 28px',
        color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer',
        letterSpacing: 3, textTransform: 'uppercase',
      }}
    >
      🛼 Acceder como juez
    </button>
  )
}