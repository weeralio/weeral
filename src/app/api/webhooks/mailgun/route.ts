import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { BOUNCE_RATE_THRESHOLD, COMPLAINT_RATE_THRESHOLD } from '@/lib/warmup'

// Webhook Mailgun : bounced, complained, unsubscribed, opened, clicked
// Lookup principal : sends.provider_msg_id (source de vérité pour tous les envois)
// Fallback        : emails.provider_msg_id (anciens envois campagnes pré-refonte)

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventData  = body['event-data'] as Record<string, unknown> | undefined
  if (!eventData) return NextResponse.json({ ok: true })

  const event      = eventData['event'] as string
  const recipient  = eventData['recipient'] as string
  const msgHeaders = (eventData['message'] as Record<string, unknown> | undefined)
    ?.['headers'] as Record<string, string> | undefined
  const messageId  = (msgHeaders?.['message-id'] ?? '').replace(/^<|>$/g, '')

  if (!messageId) return NextResponse.json({ ok: true })

  const supabase = createServiceClient()
  const today    = new Date().toISOString().split('T')[0]!

  // ── Lookup 1 : table sends (envois refontés — campagnes + séquences) ──────────
  const { data: sendRecord } = await supabase
    .from('sends')
    .select('id, user_id, contact_id, mailbox_id, source_type, source_id, seq_enrollment_id, status, opened_at, clicked_at')
    .eq('provider_msg_id', messageId)
    .maybeSingle()

  if (sendRecord) {
    const domainId = await getMailboxDomainId(supabase, sendRecord.mailbox_id)
    await handleSendEvent(supabase, event, sendRecord, domainId, today, recipient)
    return NextResponse.json({ ok: true })
  }

  // ── Lookup 2 : table emails (anciens envois pré-refonte, campagnes classiques) ──
  const { data: emailRecord } = await supabase
    .from('emails')
    .select('id, campaign_id, contact_id, domain_id, status')
    .eq('provider_msg_id', messageId)
    .maybeSingle()

  if (emailRecord) {
    await handleLegacyEmailEvent(supabase, event, emailRecord, today, recipient)
    return NextResponse.json({ ok: true })
  }

  // ── Aucun record trouvé — warmup ou envoi sans tracking ───────────────────────
  await handleOrphanEvent(supabase, event, recipient, eventData, today)
  return NextResponse.json({ ok: true })
}

// ─── Handler : sends table ────────────────────────────────────────────────────

async function handleSendEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: string,
  send: { id: string; contact_id: string; source_type: string; source_id: string; seq_enrollment_id: string | null; status: string; opened_at: string | null; clicked_at: string | null },
  domainId: string | null,
  today: string,
  recipient: string,
) {
  const now = new Date().toISOString()

  if (event === 'permanent_fail' || event === 'bounced') {
    await Promise.all([
      supabase.from('sends').update({ status: 'failed', last_error: `bounce:${event}` }).eq('id', send.id),
      supabase.from('contacts').update({ unsubscribed: true, unsubscribed_at: now }).eq('id', send.contact_id),
      send.seq_enrollment_id
        ? supabase.from('seq_enrollment')
            .update({ status: 'bounced', stop_reason: 'bounced', stopped_at: now })
            .eq('id', send.seq_enrollment_id)
            .eq('status', 'active')
        : Promise.resolve(),
      domainId ? supabase.rpc('increment_warmup_log_bounces', { p_domain_id: domainId, p_date: today }) : Promise.resolve(),
    ])
    if (domainId) await updateDomainRates(supabase, domainId, today)
  }

  if (event === 'complained') {
    await Promise.all([
      supabase.from('sends').update({ status: 'failed', last_error: 'complaint' }).eq('id', send.id),
      supabase.from('contacts').update({ unsubscribed: true, unsubscribed_at: now }).eq('id', send.contact_id),
      domainId ? supabase.rpc('increment_warmup_log_complaints', { p_domain_id: domainId, p_date: today }) : Promise.resolve(),
    ])
    if (domainId) await updateDomainRates(supabase, domainId, today)
  }

  if (event === 'unsubscribed') {
    await supabase.from('contacts')
      .update({ unsubscribed: true, unsubscribed_at: now })
      .eq('id', send.contact_id)
  }

  if (event === 'opened' && !send.opened_at) {
    await supabase.from('sends').update({ opened_at: now }).eq('id', send.id)
  }

  if (event === 'clicked' && !send.clicked_at) {
    await supabase.from('sends').update({ clicked_at: now }).eq('id', send.id)
  }

  void recipient
}

// ─── Handler : emails table (legacy) ─────────────────────────────────────────

async function handleLegacyEmailEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: string,
  emailRecord: { id: string; campaign_id: string; contact_id: string; domain_id: string; status: string },
  today: string,
  _recipient: string,
) {
  const now = new Date().toISOString()

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
    await Promise.all([
      supabase.from('emails').update({ status: 'complained' }).eq('id', emailRecord.id),
      supabase.from('campaign_contacts').update({ status: 'complained' }).eq('campaign_id', emailRecord.campaign_id).eq('contact_id', emailRecord.contact_id),
      supabase.from('campaign_contacts').update({ status: 'unsubscribed' }).eq('contact_id', emailRecord.contact_id).eq('status', 'pending'),
      supabase.from('contacts').update({ unsubscribed: true, unsubscribed_at: now }).eq('id', emailRecord.contact_id),
      supabase.rpc('increment_warmup_log_complaints', { p_domain_id: emailRecord.domain_id, p_date: today }),
    ])
    await updateDomainRates(supabase, emailRecord.domain_id, today)
  }

  if (event === 'unsubscribed') {
    await Promise.all([
      supabase.from('contacts').update({ unsubscribed: true, unsubscribed_at: now }).eq('id', emailRecord.contact_id),
      supabase.from('campaign_contacts').update({ status: 'unsubscribed' }).eq('contact_id', emailRecord.contact_id).eq('status', 'pending'),
    ])
  }

  if (event === 'opened' && emailRecord.status === 'sent') {
    await supabase.from('emails').update({ status: 'opened', opened_at: now }).eq('id', emailRecord.id)
  }

  if (event === 'clicked' && (emailRecord.status === 'sent' || emailRecord.status === 'opened')) {
    await supabase.from('emails').update({ status: 'clicked', clicked_at: now }).eq('id', emailRecord.id)
  }
}

// ─── Handler : aucun record (warmup, orphelin) ────────────────────────────────

async function handleOrphanEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: string,
  recipient: string,
  eventData: Record<string, unknown>,
  today: string,
) {
  const isBounce    = event === 'permanent_fail' || event === 'bounced'
  const isComplaint = event === 'complained'
  if (!(isBounce || isComplaint) || !recipient) return

  const now = new Date().toISOString()
  await supabase.from('contacts')
    .update({ unsubscribed: true, unsubscribed_at: now })
    .eq('email', recipient)
    .eq('unsubscribed', false)

  const sender = eventData['sender'] as string | undefined
  if (!sender) return

  const senderDomain = sender.split('@')[1]
  if (!senderDomain) return

  const { data: domainRecord } = await supabase
    .from('domains')
    .select('id')
    .eq('domain', senderDomain)
    .maybeSingle()

  if (!domainRecord) return

  await (isBounce
    ? supabase.rpc('increment_warmup_log_bounces',    { p_domain_id: domainRecord.id, p_date: today })
    : supabase.rpc('increment_warmup_log_complaints', { p_domain_id: domainRecord.id, p_date: today })
  )
  await updateDomainRates(supabase, domainRecord.id, today)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getMailboxDomainId(
  supabase: ReturnType<typeof createServiceClient>,
  mailboxId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('sender_identities')
    .select('domain_id')
    .eq('id', mailboxId)
    .single()
  return data?.domain_id ?? null
}

async function updateDomainRates(
  supabase: ReturnType<typeof createServiceClient>,
  domainId: string,
  today: string,
) {
  const { data: logs } = await supabase
    .from('warmup_logs')
    .select('emails_sent, bounces, complaints')
    .eq('domain_id', domainId)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .lte('date', today)

  if (!logs?.length) return

  const totalSent = logs.reduce((s, l) => s + l.emails_sent, 0)
  if (totalSent === 0) return

  const bounceRate    = parseFloat(((logs.reduce((s, l) => s + l.bounces, 0)    / totalSent) * 100).toFixed(2))
  const complaintRate = parseFloat(((logs.reduce((s, l) => s + l.complaints, 0) / totalSent) * 100).toFixed(2))
  const shouldBlock   = bounceRate > BOUNCE_RATE_THRESHOLD || complaintRate > COMPLAINT_RATE_THRESHOLD

  await supabase.from('domains').update({
    bounce_rate:    bounceRate,
    complaint_rate: complaintRate,
    ...(shouldBlock && {
      status:         'blocked',
      blocked_reason: bounceRate > BOUNCE_RATE_THRESHOLD
        ? `Bounce rate trop élevé (${bounceRate}%)`
        : `Complaint rate trop élevé (${complaintRate}%)`,
    }),
  }).eq('id', domainId)
}

export const GET = POST
