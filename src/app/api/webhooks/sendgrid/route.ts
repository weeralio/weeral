import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { BOUNCE_RATE_THRESHOLD, COMPLAINT_RATE_THRESHOLD } from '@/lib/warmup'

// Configure this URL in SendGrid: Settings → Mail Settings → Event Webhook
// Events: bounce, spamreport, unsubscribe, open, click
// SendGrid sends an array of event objects

interface SendGridEvent {
  event: string
  email: string
  sg_message_id: string  // format: "messageId.filterId"
  timestamp: number
  url?: string           // for click events
}

export async function POST(request: Request) {
  let events: SendGridEvent[]
  try {
    events = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(events)) return NextResponse.json({ ok: true })

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  for (const ev of events) {
    // SendGrid message ID format: "actualMessageId.filterName" — strip the filter suffix
    const messageId = (ev.sg_message_id ?? '').split('.')[0]
    if (!messageId) continue

    const { data: emailRecord } = await supabase
      .from('emails')
      .select('id, campaign_id, contact_id, domain_id, status')
      .eq('ses_message_id', messageId)
      .single()

    if (!emailRecord) continue

    if (ev.event === 'bounce' || ev.event === 'dropped') {
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

    if (ev.event === 'spamreport') {
      await Promise.all([
        supabase.from('emails').update({ status: 'complained' }).eq('id', emailRecord.id),
        supabase.from('campaign_contacts')
          .update({ status: 'complained' })
          .eq('campaign_id', emailRecord.campaign_id)
          .eq('contact_id', emailRecord.contact_id),
        supabase.from('contacts')
          .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
          .eq('id', emailRecord.contact_id),
        supabase.rpc('increment_warmup_log_complaints', { p_domain_id: emailRecord.domain_id, p_date: today }),
      ])
      await updateDomainRates(supabase, emailRecord.domain_id, today)
    }

    if (ev.event === 'unsubscribe' || ev.event === 'group_unsubscribe') {
      await Promise.all([
        supabase.from('contacts')
          .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
          .eq('id', emailRecord.contact_id),
        supabase.from('campaign_contacts')
          .update({ status: 'unsubscribed' })
          .eq('campaign_id', emailRecord.campaign_id)
          .eq('contact_id', emailRecord.contact_id),
      ])
    }

    if (ev.event === 'open' && emailRecord.status === 'sent') {
      await supabase.from('emails')
        .update({ status: 'opened', opened_at: new Date().toISOString() })
        .eq('id', emailRecord.id)
    }

    if (ev.event === 'click' && (emailRecord.status === 'sent' || emailRecord.status === 'opened')) {
      await supabase.from('emails')
        .update({ status: 'clicked', clicked_at: new Date().toISOString() })
        .eq('id', emailRecord.id)
    }
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
