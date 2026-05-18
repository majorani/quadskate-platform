import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/supabase'
import { setRequestLocale } from 'next-intl/server'
import EventosPageClient from './EventosPageClient'

export const revalidate = 60

const STATUS_ORDER: Record<string, number> = { active: 0, published: 1, finished: 2 }

async function getAllEvents(): Promise<Event[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('status', ['published', 'active', 'finished'])
    .order('created_at', { ascending: false })
  if (!data) return []
  return data.sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1)
    if (statusDiff !== 0) return statusDiff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export default async function EventosPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const events = await getAllEvents()

  return <EventosPageClient events={events} />
}