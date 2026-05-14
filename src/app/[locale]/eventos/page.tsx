import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/supabase'
import { setRequestLocale } from 'next-intl/server'
import EventosPageClient from './EventosPageClient'

export const revalidate = 60

async function getAllEvents(): Promise<Event[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('status', ['published', 'active', 'finished'])
    .order('event_date', { ascending: false })
  return data ?? []
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