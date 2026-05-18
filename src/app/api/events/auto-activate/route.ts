import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function activate(eventId?: string) {
  let query = supabaseAdmin
    .from('events')
    .select('id, event_date, event_time')
    .eq('status', 'published')

  if (eventId) query = (query as any).eq('id', eventId)

  const { data: events, error } = await query
  if (error) return { error: error.message, activated: 0 }

  const now = new Date()
  const toActivate = (events ?? []).filter((ev: any) => {
    if (!ev.event_date) return false
    const timeStr = ev.event_time ? ev.event_time.slice(0, 5) : '00:00'
    return new Date(`${ev.event_date}T${timeStr}:00`) <= now
  })

  if (!toActivate.length) return { activated: 0 }

  const ids = toActivate.map((e: any) => e.id)
  const { error: updateError } = await supabaseAdmin
    .from('events').update({ status: 'active' }).in('id', ids)

  if (updateError) return { error: updateError.message, activated: 0 }
  return { activated: ids.length, ids }
}

// POST — page load con eventId específico
// Solo el owner del evento puede activarlo
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))

    // Si viene eventId, verificar que el evento pertenece al usuario
    if (body.eventId) {
      const { data: event } = await supabaseAdmin
        .from('events')
        .select('id, owner_id')
        .eq('id', body.eventId)
        .single()

      if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
      if (event.owner_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const result = await activate(body.eventId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — cron de Vercel (protegido con CRON_SECRET)
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const result = await activate()
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}