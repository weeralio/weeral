import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { BOUNCE_RATE_THRESHOLD, COMPLAINT_RATE_THRESHOLD } from '@/lib/warmup'

// Configure this URL in Mailgun: Sending → Webhooks → Add webhook
// Events: bounced, complained, unsubscribed, opened, clicked
// Mailgun sends JSON with event-data wrapper (API v3)

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventData = body['event-data'] as Record<string, unknown> | undefined
  if (!eventData) return NextResponse.json({ ok: true })

  const event     = eventData['event'] as string
  const recipient = eventData['recipient'] as string
  const msgHeaders = (eventData['message'] as Record<string, unknown> | undefined)?.['headers'] as Record<string, string> | undefined
  // Strip angle brackets Mailgun adds around the message ID
  const messageId = (msgHeaders?.['message-id'] ?? '').replace(/^<|>$/g, '')

  if (!messageId) return NextResponse.json({ ok: true })

  const supabase = createServiceClient()

  const { data: emailRecord } = await supabase
    .from('emails')
    .select('id, campaign_id, contact_id, domain_id, status')
    .eq('ses_message_id', messageId)
    .single()

  if (!emailRecord) {
    // Séquence ou warmup — pas de record dans `emails`.
    // Pour bounces et complaints, blacklister le contact et stopper ses enrollments.
    const isBounce    = event === 'permanent_fail' || event === 'bounced'
    const isComplaint = event === 'complained'

    if ((isBounce || isComplaint) && recipient) {
      const now = new Date().toISOString()

      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', recipient)
        .maybeSingle()

      await supabase.from('contacts')
        .update({ unsubscribed: true, unsubscribed_at: now })
        .eq('email', recipient)
        .eq('unsubscribed', false)

      if (contact) {
        if (isBounce) {
          // Marquer le dernier envoi de chaque séquence active comme bounced avant de clore
          const { data: activeEnrollments } = await supabase
            .from('sequence_enrollments')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('status', 'active')
          if (activeEnrollments?.length) {
            await Promise.all(activeEnrollments.map(async (enrollment) => {
              const { data: latest } = await supabase
                .from('sequence_sends')
                .select('id')
                .eq('enrollment_id', enrollment.id)
                .eq('status', 'sent')
                .order('sent_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              if (latest) {
                await supabase.from('sequence_sends').update({ status: 'bounced' }).eq('id', latest.id)
              }
            }))
          }
        }
        // Arrêter immédiatement les enrollments actifs du contact
        await supabase.from('sequence_enrollments')
          .update({ status: 'completed', completed_at: now })
          .eq('contact_id', contact.id)
          .eq('status', 'active')
      }

      // Mise à jour warmup_logs pour les bounces/plaintes séquences et warmup
      const sender = eventData['sender'] as string | undefined
      if (sender) {
        const senderDomainName = sender.split('@')[1]
        if (senderDomainName) {
          const { data: domainRecord } = await supabase
            .from('domains')
            .select('id')
            .eq('domain', senderDomainName)
            .maybeSingle()
          if (domainRecord) {
            const webhookDate = new Date().toISOString().split('T')[0]!
            await (isBounce
              ? supabase.rpc('increment_warmup_log_bounces',    { p_domain_id: domainRecord.id, p_date: webhookDate })
              : supabase.rpc('increment_warmup_log_complaints', { p_domain_id: domainRecord.id, p_date: webhookDate })
            )
            await updateDomainRates(supabase, domainRecord.id, webhookDate)
          }
        }
      }
    }
    return NextResponse.json({ ok: true })
  }

  const today = new Date().toISOString().split('T')[0]

  if (event === 'permanent_fail' || event === 'temporary_fail' || event === 'bounced') {
    const severity = event === 'temporary_fail' ? 'temporary' : 'permanent'
    await Promise.all([
      supabase.from('emails').update({ status: 'bounced' }).eq('id', emailRecord.id),
      supabase.from('campaign_contacts')
        .update({ status: severity === 'permanent' ? 'bounced' : 'sent' })
        .eq('campaign_id', emailRecord.campaign_id)
        .eq('contact_id', emailRecord.contact_id),
      supabase.rpc('increment_warmup_log_bounces', { p_domain_id: emailRecord.domain_id, p_date: today }),
    ])
    await updateDomainRates(supabase, emailRecord.domain_id, today)
  }

  if (event === 'complained') {
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

  if (event === 'unsubscribed') {
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

  if (event === 'clicked' && (emailRecord.status === 'sent' || emailRecord.status === 'opened')) {
    await supabase.from('emails')
      .update({ status: 'clicked', clicked_at: new Date().toISOString() })
      .eq('id', emailRecord.id)
  }

  void recipient // used in future for logging

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
