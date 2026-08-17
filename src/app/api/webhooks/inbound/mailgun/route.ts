import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Mailgun Inbound Route forwards POSTs here when someone replies to a sequence email.
// Reply-To format: r+{enrollmentId}@reply.{senderDomain}
// Auth: ?secret=CRON_SECRET (embedded in the Mailgun Route URL we create)

function parseFrom(fromHeader: string | null, senderHeader: string | null) {
  let email = senderHeader ?? ''
  let name: string | null = null
  if (fromHeader) {
    const nameMatch = fromHeader.match(/^([^<]+)</)
    if (nameMatch) name = nameMatch[1].trim().replace(/^"|"$/g, '')
    const emailMatch = fromHeader.match(/<([^>]+)>/)
    if (emailMatch) email = emailMatch[1]
    else if (!senderHeader) email = fromHeader.trim()
  }
  return { email, name }
}

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

  // Lookup v2 : seq_enrollment (nouveau modèle)
  const { data: enrollment } = await supabase
    .from('seq_enrollment')
    .select('id, status, seq_id, contact_id, mailbox_id, seq!seq_id(user_id, name)')
    .eq('id', enrollmentId)
    .single()

  // Fallback v1 : sequence_enrollments (ancien modèle, backward compat)
  if (!enrollment) {
    const { data: legacyEnrollment } = await supabase
      .from('sequence_enrollments')
      .select('id, status, sequence_id, contact_id, sender_identity_id, sequences(user_id, name)')
      .eq('id', enrollmentId)
      .single()
    if (!legacyEnrollment || legacyEnrollment.status === 'replied') return NextResponse.json({ ok: true })
    const seq = Array.isArray(legacyEnrollment.sequences) ? legacyEnrollment.sequences[0] : legacyEnrollment.sequences
    if (!seq?.user_id) return NextResponse.json({ ok: true })
    await supabase.from('sequence_enrollments').update({ status: 'replied', completed_at: new Date().toISOString() }).eq('id', enrollmentId)
    return NextResponse.json({ ok: true })
  }

  if (enrollment.status === 'replied') return NextResponse.json({ ok: true })

  const seqMeta = Array.isArray(enrollment.seq) ? enrollment.seq[0] : enrollment.seq
  if (!seqMeta?.user_id) return NextResponse.json({ ok: true })

  const { email: fromEmail, name: fromName } = parseFrom(
    formData.get('from') as string | null,
    formData.get('sender') as string | null,
  )

  const now = new Date().toISOString()

  await Promise.all([
    // Marque l'enrollment replied — le drain verra ce statut et n'enverra plus les étapes no_reply
    supabase.from('seq_enrollment')
      .update({ status: 'replied', completed_at: now })
      .eq('id', enrollmentId),
    supabase.from('inbound_emails').insert({
      user_id:            seqMeta.user_id,
      enrollment_id:      enrollmentId,
      sender_identity_id: enrollment.mailbox_id ?? null,
      from_email:         fromEmail,
      from_name:          fromName,
      subject:            (formData.get('subject') as string | null) ?? null,
      body_plain:         (formData.get('body-plain') as string | null) ?? null,
      body_html:          (formData.get('body-html') as string | null) ?? null,
      received_at:        now,
    }),
    supabase.from('ai_notifications').insert({
      user_id:      seqMeta.user_id,
      type:         'success',
      title:        'Réponse reçue',
      message:      `Un contact a répondu à ta séquence "${seqMeta.name}".`,
      action_label: 'Voir la boîte de réception',
      action_href:  '/dashboard/boite-reception',
    }),
  ])

  return NextResponse.json({ ok: true })
}
