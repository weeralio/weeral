import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { BOUNCE_RATE_THRESHOLD, COMPLAINT_RATE_THRESHOLD } from '@/lib/warmup'

// Configure this URL in Brevo: Settings → Transactional → Webhooks
// Events to subscribe: hard_bounce, soft_bounce, spam, unsubscribe, opened, click

export async function POST(request: Request) {
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event      = payload['event'] as string
  const messageId  = (payload['message-id'] as string ?? '').replace(/^<|>$/g, '')
  const email      = payload['email'] as string

  if (!messageId && !email) return NextResponse.json({ ok: true })

  const supabase = createServiceClient()

  // Find email record
  const { data: emailRecord } = await supabase
    .from('emails')
    .select('id, campaign_id, contact_id, domain_id, status')
    .eq('ses_message_id', messageId)
    .single()

  if (!emailRecord) return NextResponse.json({ ok: true })

  const today = new Date().toISOString().split('T')[0]

  if (event === 'hard_bounce' || event === 'soft_bounce') {
    await Promise.all([
      supabase.from('emails').update({ status: 'bounced' }).eq('id', emailRecord.id),
      supabase.from('campaign_contacts')
        .update({ status: 'bounced' })
        .eq('campaign_id', emailRecord.campaign_id)
        .eq('contact_id', emailRecord.contact_id),
      supabase.rpc('increment_warmup_log_bounces', { p_domain_id: emailRecord.domain_id, p_date: today }),
    ])
    await updateDomainRates(supabase, emailRecord.domain_id, today)
  }

  if (event === 'spam' || event === 'complaint') {
    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('emails').update({ status: 'complained' }).eq('id', emailRecord.id),
      supabase.from('campaign_contacts').update({ status: 'complained' }).eq('campaign_id', emailRecord.campaign_id).eq('contact_id', emailRecord.contact_id),
      supabase.from('campaign_contacts').update({ status: 'unsubscribed' }).eq('contact_id', emailRecord.contact_id).eq('status', 'pending'),
      supabase.from('sequence_enrollments').update({ status: 'completed', completed_at: now }).eq('contact_id', emailRecord.contact_id).eq('status', 'active'),
      supabase.from('contacts').update({ unsubscribed: true, unsubscribed_at: now }).eq('id', emailRecord.contact_id),
      supabase.rpc('increment_warmup_log_complaints', { p_domain_id: emailRecord.domain_id, p_date: today }),
    ])
    await updateDomainRates(supabase, emailRecord.domain_id, today)
  }

  if (event === 'unsubscribe') {
    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('contacts').update({ unsubscribed: true, unsubscribed_at: now }).eq('id', emailRecord.contact_id),
      supabase.from('campaign_contacts').update({ status: 'unsubscribed' }).eq('contact_id', emailRecord.contact_id).eq('status', 'pending'),
      supabase.from('sequence_enrollments').update({ status: 'completed', completed_at: now }).eq('contact_id', emailRecord.contact_id).eq('status', 'active'),
    ])
  }

  if (event === 'opened' && emailRecord.status === 'sent') {
    await supabase.from('emails')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('id', emailRecord.id)
  }

  if (event === 'click' && (emailRecord.status === 'sent' || emailRecord.status === 'opened')) {
    await supabase.from('emails')
      .update({ status: 'clicked', clicked_at: new Date().toISOString() })
      .eq('id', emailRecord.id)
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

  const bounceRate    = parseFloat(((logs.reduce((s, l) => s + l.bounces, 0) / totalSent) * 100).toFixed(2))
  const complaintRate = parseFloat(((logs.reduce((s, l) => s + l.complaints, 0) / totalSent) * 100).toFixed(2))
  const shouldBlock   = bounceRate > BOUNCE_RATE_THRESHOLD || complaintRate > COMPLAINT_RATE_THRESHOLD

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
