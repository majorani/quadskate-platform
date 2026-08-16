import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Carga manual de puntaje por parte del organizador (cuando los jueces ya no
// están disponibles). Se resuelve del lado del servidor con la service role
// key para evitar los problemas de RLS que aparecen al escribir en
// "scorecards" directamente desde el cliente con la sesión del organizador
// (las políticas de esa tabla están pensadas para que escriban los jueces).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Construye el campo "tricks" para que el promedio del formato de la
// categoría dé exactamente el valor cargado (un solo registro, sin trucos reales).
function buildManualTricks(format: string, value: number) {
  if (format === 'jam') return { tricks: [], fluidez: 5 + value, creatividad: 5 }
  return [{ intencion: true, dificultad: 0, ejecucion: 0, estilo: 0, secuencia: false, _score: value }]
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { eventId, categoryId, participantId, run, value } = await req.json()

  if (!eventId || !categoryId || !participantId || !run || value === undefined || value === null) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
  }

  const num = Number(value)
  if (isNaN(num)) return NextResponse.json({ error: 'Puntaje inválido' }, { status: 400 })

  // Verificar que el evento pertenece al usuario que hace el pedido
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single()
  if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  // Verificar que la categoría pertenece a ese evento y traer su formato
  const { data: category } = await supabaseAdmin
    .from('categories')
    .select('id, format')
    .eq('id', categoryId)
    .eq('event_id', eventId)
    .single()
  if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })

  // Verificar que el participante pertenece a esa categoría
  const { data: participant } = await supabaseAdmin
    .from('participants')
    .select('id')
    .eq('id', participantId)
    .eq('category_id', categoryId)
    .single()
  if (!participant) return NextResponse.json({ error: 'Participante no encontrado en esa categoría' }, { status: 404 })

  const tricks = buildManualTricks(category.format, num)

  const { data: existing } = await supabaseAdmin
    .from('scorecards')
    .select('id')
    .eq('judge_id', user.id)
    .eq('participant_id', participantId)
    .eq('run', run)
    .maybeSingle()

  const { error } = existing
    ? await supabaseAdmin.from('scorecards').update({ tricks, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : await supabaseAdmin.from('scorecards').insert({ event_id: eventId, category_id: categoryId, judge_id: user.id, participant_id: participantId, run, tricks })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
