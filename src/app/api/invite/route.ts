import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { email, displayName, eventId, role, categoryId } = await req.json()

  if (!email || !displayName || !eventId || !role) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
  }

  // Verificar que el evento pertenece al usuario
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single()

  if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  // Verificar si ya existe en participants/judges con ese email
  if (role === 'participant') {
    const { data: existing } = await supabaseAdmin
      .from('participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Ya existe un participante con ese email' }, { status: 400 })
  } else {
    const { data: existing } = await supabaseAdmin
      .from('judges')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Ya existe un juez con ese email' }, { status: 400 })
  }

  // Buscar si el email ya tiene cuenta
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  const roleLabel = role === 'judge' ? 'juez' : 'participante'

  if (role === 'participant') {
    await supabaseAdmin.from('participants').insert({
      event_id: eventId,
      category_id: categoryId || null,
      display_name: displayName,
      email: email,
      profile_id: authUser?.id ?? null,
      status: authUser ? 'confirmed' : 'pending',
    })
  } else {
    await supabaseAdmin.from('judges').insert({
      event_id: eventId,
      display_name: displayName,
      email: email,
      profile_id: authUser?.id ?? null,
      status: authUser ? 'confirmed' : 'pending',
    })
  }

  if (authUser) {
    // Tiene cuenta → notificación en app
    await supabaseAdmin.from('notifications').insert({
      user_id: authUser.id,
      type: role === 'judge' ? 'judge_invite' : 'participant_added',
      title: `Invitación a ${event.name}`,
      body: `Fuiste agregado como ${roleLabel} al evento "${event.name}".`,
      link: `/eventos/${eventId}`,
      read: false,
    })
    return NextResponse.json({ success: true, hadAccount: true })
  } else {
    // No tiene cuenta → crear invitación y mandar email
    const { data: invitation } = await supabaseAdmin
      .from('invitations')
      .insert({
        event_id: eventId,
        email,
        role,
        category_id: categoryId || null,
      })
      .select()
      .single()

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth?invite=${invitation?.token}`

    await resend.emails.send({
      from: 'Quad Skate Platform <onboarding@resend.dev>',
      to: 'info.majorani@gmail.com', // temporal sin dominio
      subject: `[PARA: ${email}] Te invitaron como ${roleLabel} a ${event.name}`,
      html: `
        <div style="background:#0a0a0a;color:#ffffff;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
          <h1 style="color:#C9A84C;font-weight:900;text-transform:uppercase;letter-spacing:2px;">QUAD SKATE PLATFORM</h1>
          <h2 style="color:#ffffff;text-transform:uppercase;">HOLA ${displayName.toUpperCase()}</h2>
          <p style="color:#aaaaaa;font-size:16px;">
            Fuiste invitado a <strong style="color:#ffffff;">${event.name}</strong> como <strong style="color:#C9A84C;">${roleLabel}</strong>.
          </p>
          <p style="color:#aaaaaa;font-size:16px;">
            Creá tu cuenta para confirmar tu participación:
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 28px;text-decoration:none;letter-spacing:1px;margin-top:16px;">
            CREAR CUENTA
          </a>
          <p style="color:#555555;font-size:12px;margin-top:40px;">Si no esperabas este mail, podés ignorarlo.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, hadAccount: false })
  }
}