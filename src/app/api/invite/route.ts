import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Cliente admin con service role (solo server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { email, eventId, role, categoryId } = await req.json()

  // Verificar que el evento pertenece al usuario
  const { data: event } = await supabase
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

  // Buscar si el email tiene cuenta en auth.users
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = users.find(u => u.email === email)

  const roleLabel = role === 'judge' ? 'juez' : 'participante'
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invitacion/${invitation.token}`

  if (authUser) {
    // Tiene cuenta → notificación en app
    await supabaseAdmin.from('notifications').insert({
      user_id: authUser.id,
      title: `Invitación a ${event.name}`,
      message: `Fuiste invitado como ${roleLabel} al evento "${event.name}".`,
      link: `/invitacion/${invitation.token}`,
      read: false,
    })
    return NextResponse.json({ success: true, hadAccount: true })
  } else {
    // No tiene cuenta → email
    await resend.emails.send({
      from: 'Quad Skate Platform <onboarding@resend.dev>',
      to: email,
      subject: `Te invitaron como ${roleLabel} a ${event.name}`,
      html: `
        <div style="background:#0a0a0a;color:#ffffff;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
          <h1 style="color:#C9A84C;font-weight:900;text-transform:uppercase;letter-spacing:2px;">QUAD SKATE PLATFORM</h1>
          <h2 style="color:#ffffff;text-transform:uppercase;">TE INVITARON COMO ${roleLabel.toUpperCase()}</h2>
          <p style="color:#aaaaaa;font-size:16px;">
            Fuiste invitado a <strong style="color:#ffffff;">${event.name}</strong> como <strong style="color:#C9A84C;">${roleLabel}</strong>.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 28px;text-decoration:none;letter-spacing:1px;margin-top:16px;">
            ACEPTAR INVITACIÓN
          </a>
          <p style="color:#555555;font-size:12px;margin-top:40px;">Si no esperabas este mail, podés ignorarlo.</p>
        </div>
      `,
    })
    return NextResponse.json({ success: true, hadAccount: false })
  }
}