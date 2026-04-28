import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
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

  // Buscar la invitación
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', params.token)
    .eq('status', 'pending')
    .single()

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitación inválida o ya usada' }, { status: 404 })
  }

  // Marcar como aceptada
  await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('token', params.token)

  // Agregar al evento según el rol
  if (invitation.role === 'judge') {
    await supabase.from('judges').insert({
      event_id: invitation.event_id,
      user_id: user.id,
      status: 'confirmed',
    })
  } else {
    await supabase.from('participants').insert({
      event_id: invitation.event_id,
      user_id: user.id,
      category_id: invitation.category_id,
      status: 'confirmed',
    })
  }

  return NextResponse.json({ success: true, role: invitation.role, eventId: invitation.event_id })
}