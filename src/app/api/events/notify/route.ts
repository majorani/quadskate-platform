import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  const { eventId } = await req.json()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .single()

  if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  // Traer todos los usuarios de auth
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()

  if (!users || users.length === 0) return NextResponse.json({ success: true, sent: 0 })

  // Notificación en app para todos (usando profiles)
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id')
  if (profiles && profiles.length > 0) {
    const notifications = profiles.map((p: { id: string }) => ({
      user_id: p.id,
      type: 'event_published',
      title: `Nuevo evento: ${event.name}`,
      body: `Se publicó un nuevo evento en ${event.city}. ¡Anotate!`,
      link: `/eventos/${event.id}`,
      read: false,
    }))
    await supabaseAdmin.from('notifications').insert(notifications)
  }

  // Email masivo usando los emails de auth.users
  const emailList = users.map(u => u.email).filter(Boolean) as string[]
  const batchSize = 50

  for (let i = 0; i < emailList.length; i += batchSize) {
    const batch = emailList.slice(i, i + batchSize)
    await resend.emails.send({
      from: 'Quad Skate Platform <onboarding@resend.dev>',
      to: batch,
      subject: `Nuevo evento: ${event.name}`,
      html: `
        <div style="background:#0a0a0a;color:#ffffff;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
          <h1 style="color:#C9A84C;font-weight:900;text-transform:uppercase;letter-spacing:2px;">QUAD SKATE PLATFORM</h1>
          <h2 style="color:#ffffff;text-transform:uppercase;">NUEVO EVENTO PUBLICADO</h2>
          <h3 style="color:#C9A84C;text-transform:uppercase;">${event.name}</h3>
          <p style="color:#aaaaaa;">
            📍 ${event.city}${event.country ? `, ${event.country}` : ''}<br/>
            📅 ${new Date(event.event_date).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          ${event.description ? `<p style="color:#cccccc;">${event.description}</p>` : ''}
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/eventos/${event.id}"
             style="display:inline-block;background:#C9A84C;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 28px;text-decoration:none;letter-spacing:1px;margin-top:16px;">
            VER EVENTO
          </a>
        </div>
      `,
    })
  }

  return NextResponse.json({ success: true, sent: emailList.length })
}