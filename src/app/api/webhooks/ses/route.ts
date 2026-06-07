import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { BOUNCE_RATE_THRESHOLD, COMPLAINT_RATE_THRESHOLD } from '@/lib/warmup'

// Webhook SNS pour les bounces et complaints SES
// L'URL de ce webhook doit être configurée dans AWS SNS
export async function POST(request: Request) {
  const body = await request.text()
  let payload: Record<string, unknown>

  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Confirmation d'abonnement SNS
  if (payload.Type === 'SubscriptionConfirmation') {
    const url = payload.SubscribeURL as string
    if (url) await fetch(url)
    return NextResponse.json({ ok: true })
  }

  if (payload.Type !== 'Notification') {
    return NextResponse.json({ ok: true })
  }

  let notification: Record<string, unknown>
  try {
    notification = JSON.parse(payload.Message as string)
  } catch {
    return NextResponse.json({ error: 'Invalid notification' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const notifType = notification.notificationType as string
  const mail = notification.mail as Record<string, unknown>
  const sesMessageId = mail?.messageId as string

  if (!sesMessageId) return NextResponse.json({ ok: true })

  // Retrouver l'email via le messageId SES
  const { data: email } = await supabase
    .from('emails')
    .select('id, campaign_id, contact_id, domain_id')
    .eq('ses_message_id', sesMessageId)
    .single()

  if (!email) return NextResponse.json({ ok: true })

  const today = new Date().toISOString().split('T')[0]

  if (notifType === 'Bounce') {
    const bounceType = (notification.bounce as Record<string, unknown>)?.bounceType as string
    const status = bounceType === 'Permanent' ? 'bounced' : 'sent'

    await Promise.all([
      supabase.from('emails').update({ status: 'bounced' }).eq('id', email.id),
      supabase.from('campaign_contacts').update({ status }).eq('campaign_id', email.campaign_id).eq('contact_id', email.contact_id),
      supabase.rpc('increment_warmup_log_bounces', { p_domain_id: email.domain_id, p_date: today }),
    ])

    // Recalculer bounce_rate et bloquer si nécessaire
    await updateDomainRates(supabase, email.domain_id, today)
  }

  if (notifType === 'Complaint') {
    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('emails').update({ status: 'complained' }).eq('id', email.id),
      supabase.from('campaign_contacts').update({ status: 'complained' }).eq('campaign_id', email.campaign_id).eq('contact_id', email.contact_id),
      // Cancel all other pending sends for this contact across all campaigns
      supabase.from('campaign_contacts').update({ status: 'unsubscribed' }).eq('contact_id', email.contact_id).eq('status', 'pending'),
      // Cancel active sequence enrollments
      supabase.from('sequence_enrollments').update({ status: 'completed', completed_at: now }).eq('contact_id', email.contact_id).eq('status', 'active'),
      supabase.from('contacts').update({ unsubscribed: true, unsubscribed_at: now }).eq('id', email.contact_id),
      supabase.rpc('increment_warmup_log_complaints', { p_domain_id: email.domain_id, p_date: today }),
    ])

    await updateDomainRates(supabase, email.domain_id, today)
  }

  return NextResponse.json({ ok: true })
}

async function updateDomainRates(supabase: ReturnType<typeof createServiceClient>, domainId: string, today: string) {
  const { data: logs } = await supabase
    .from('warmup_logs')
    .select('emails_sent, bounces, complaints')
    .eq('domain_id', domainId)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .lte('date', today)

  if (!logs?.length) return

  const totalSent = logs.reduce((s, l) => s + l.emails_sent, 0)
  if (totalSent === 0) return

  const totalBounces = logs.reduce((s, l) => s + l.bounces, 0)
  const totalComplaints = logs.reduce((s, l) => s + l.complaints, 0)

  const bounceRate = parseFloat(((totalBounces / totalSent) * 100).toFixed(2))
  const complaintRate = parseFloat(((totalComplaints / totalSent) * 100).toFixed(2))

  const shouldBlock = bounceRate > BOUNCE_RATE_THRESHOLD || complaintRate > COMPLAINT_RATE_THRESHOLD

  await supabase.from('domains').update({
    bounce_rate: bounceRate,
    complaint_rate: complaintRate,
    ...(shouldBlock && {
      status: 'blocked',
      blocked_reason: bounceRate > BOUNCE_RATE_THRESHOLD
        ? `Bounce rate trop élevé (${bounceRate}%)`
        : `Complaint rate trop élevé (${complaintRate}%)`,
    }),
  }).eq('id', domainId)
}
