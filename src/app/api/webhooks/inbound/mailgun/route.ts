import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Mailgun Inbound Route forwards POSTs here when someone replies to a sequence email.
// Reply-To format: r+{enrollmentId}@reply.{senderDomain}
// Auth: ?secret=CRON_SECRET (embedded in the Mailgun Route URL we create)

export async function POST(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const recipient = formData.get('recipient') as string | null
  if (!recipient) return NextResponse.json({ ok: true })

  // Extract enrollment ID from r+{UUID}@reply.{domain}
  const match = recipient.match(/^r\+([0-9a-f-]{36})@/i)
  if (!match) return NextResponse.json({ ok: true })

  const enrollmentId = match[1]
  const supabase = createServiceClient()

  // Fetch enrollment + its sequence (to get user_id for the notification)
  const { data: enrollment } = await supabase
    .from('sequence_enrollments')
    .select('id, status, sequence_id, contact_id, sequences(user_id, name)')
    .eq('id', enrollmentId)
    .single()

  if (!enrollment || enrollment.status === 'replied') {
    return NextResponse.json({ ok: true })
  }

  const sequence = Array.isArray(enrollment.sequences) ? enrollment.sequences[0] : enrollment.sequences
  if (!sequence?.user_id) return NextResponse.json({ ok: true })

  const now = new Date().toISOString()

  // Mark most recent sequence_send as replied
  const { data: latestSend } = await supabase
    .from('sequence_sends')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .single()

  await Promise.all([
    latestSend
      ? supabase.from('sequence_sends').update({ status: 'replied' }).eq('id', latestSend.id)
      : Promise.resolve(),
    supabase.from('sequence_enrollments')
      .update({ status: 'replied', completed_at: now })
      .eq('id', enrollmentId),
    supabase.from('ai_notifications').insert({
      user_id: sequence.user_id,
      type: 'success',
      title: 'Réponse reçue',
      message: `Un contact a répondu à ta séquence "${sequence.name}".`,
      action_label: 'Voir la séquence',
      action_href: `/dashboard/sequences/${enrollment.sequence_id}`,
    }),
  ])

  return NextResponse.json({ ok: true })
}
