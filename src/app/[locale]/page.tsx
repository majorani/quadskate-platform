import { supabase } from '@/lib/supabase'
import { setRequestLocale } from 'next-intl/server'
import type { Event } from '@/lib/supabase'
import HomePageClient from './HomePageClient'

export const revalidate = 60

async function getUpcomingEvents(): Promise<Event[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('status', ['published', 'active'])
    .order('event_date', { ascending: true })
    .limit(6)
  return data ?? []
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const events = await getUpcomingEvents()
  return <HomePageClient events={events} />
}