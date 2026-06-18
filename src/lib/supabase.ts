import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type Event = {
  id: string
  owner_id: string
  name: string
  description: string | null
  country: string
  city: string | null
  location_name: string | null
  address: string | null
  event_date: string | null
  event_time: string | null
  flyer_url: string | null
  status: 'draft' | 'published' | 'active' | 'finished'
  created_at: string
}

export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  country: string
}

export type Category = {
  id: string
  event_id: string
  name: string
  format: 'formal' | 'jam' | 'best_trick'
  max_runs: number
  consolidation: string
  weights: Record<string, number>
  has_final: boolean
  finalists_count: number
  has_best_trick_final: boolean
  phase: 'qualification' | 'final'
}

export type Participant = {
  id: string
  event_id: string
  category_id: string
  profile_id: string | null
  display_name: string
  is_finalist: boolean
  sort_order: number | null
  battery: number | null
  status: string
  email: string
}

export type Judge = {
  id: string
  event_id: string
  profile_id: string
  status: 'invited' | 'accepted' | 'declined'
  profiles?: Profile
}

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

export const REGLAMENTO_ESTANDAR_URL =
  'https://rselpwptmgytxlwjvxzu.supabase.co/storage/v1/object/public/documents/ReglamentoQuadSkatePlatform-v1.6.4.pdf'