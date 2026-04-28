import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Verificar auth via header Authorization
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { email, eventId, role, categoryId } = await req.json()

  // Verificar que el evento pertenece al usuario
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single()

  if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  // Verificar si ya existe invitación
  const { data: existing } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('event_id', eventId)
    .eq('email', email)
    .eq('role', role)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Ya existe una invitación para este email' }, { status: 400 })

  // Crear la invitación
  const { data: invitation, error: invError } = await supabaseAdmin
    .from('invitations')
    .insert({ event_id: eventId, email, role, category_id: categoryId || null })
    .select()
    .single()

  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 })

  // Buscar si el email tiene cuenta
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = users.find(u => u.email === email)

  const roleLabel = role === 'judge' ? 'juez' : 'participante'
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invitacion/${invitation.token}`

  if (authUser) {
    await supabaseAdmin.from('notifications').insert({
      user_id: authUser.id,
      title: `Invitación a ${event.name}`,
      message: `Fuiste invitado como ${roleLabel} al evento "${event.name}".`,
      link: `/invitacion/${invitation.token}`,
      read: false,
    })
    return NextResponse.json({ success: true, hadAccount: true })
  } else {
    await resend.emails.send({
        from: 'Quad Skate Platform <onboarding@resend.dev>',
        to: 'info.majorani@gmail.com', // ← fijo mientras no tenés dominio
        subject: `[PARA: ${email}] Te invitaron como ${roleLabel} a ${event.name}`,
        html: `...`
    })
    return NextResponse.json({ success: true, hadAccount: false })
  }
}