import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const accessToken = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitación inválida o ya usada' }, { status: 404 })
  }

  await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('token', token)

  if (invitation.role === 'judge') {
    await supabaseAdmin.from('judges').insert({
      event_id: invitation.event_id,
      profile_id: user.id,
      status: 'confirmed',
    })
  } else {
    await supabaseAdmin.from('participants').insert({
      event_id: invitation.event_id,
      profile_id: user.id,
      category_id: invitation.category_id,
      status: 'confirmed',
    })
  }

  return NextResponse.json({ success: true, role: invitation.role, eventId: invitation.event_id })
}