import { createServiceClient } from '@/lib/supabase/server'
import { sendViaProvider } from '@/lib/mailer'
import { unsubscribeUrl } from '@/lib/tokens'
import { NextResponse } from 'next/server'

// Appelé toutes les heures par Trigger.dev
// Header requis : Authorization: Bearer <CRON_SECRET>
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Récupérer toutes les campagnes en cours
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      id, user_id, subject, body_html, body_text,
      sender_identities(email, display_name, domain_id,
        domains(id, daily_limit, sent_today, status))
    `)
    .eq('status', 'running')

  if (!campaigns?.length) return NextResponse.json({ ok: true, sent: 0 })

  let totalSent = 0
  // Track sends per domain across ALL campaigns in this run
  const domainSentAdded: Record<string, number> = {}
  const domainOriginalSentToday: Record<string, number> = {}

  const today = new Date().toISOString().split('T')[0]

  for (const campaign of campaigns) {
    const identity = Array.isArray(campaign.sender_identities)
      ? campaign.sender_identities[0]
      : campaign.sender_identities
    const domain = Array.isArray(identity?.domains) ? identity.domains[0] : identity?.domains

    if (!domain || domain.status === 'blocked' || domain.status === 'paused') continue

    // Record the DB value once per domain (subsequent campaigns reuse it)
    if (!(domain.id in domainOriginalSentToday)) {
      domainOriginalSentToday[domain.id] = domain.sent_today ?? 0
    }

    // Remaining capacity accounts for all sends already done this cron run
    const alreadySentThisRun = domainSentAdded[domain.id] ?? 0
    const remaining = (domain.daily_limit ?? 200) - (domainOriginalSentToday[domain.id] ?? 0) - alreadySentThisRun
    if (remaining <= 0) continue

    // Contacts à envoyer pour cette campagne (capped to actual remaining)
    const { data: pendingContacts } = await supabase
      .from('campaign_contacts')
      .select('id, contacts!inner(id, email, first_name, last_name, company, unsubscribed)')
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending')
      .eq('contacts.unsubscribed', false)
      .limit(remaining)

    if (!pendingContacts?.length) {
      // Plus de contacts en attente → campagne terminée
      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id)
      continue
    }

    let sentForCampaign = 0

    for (const cc of pendingContacts) {
      const contact = Array.isArray(cc.contacts) ? cc.contacts[0] : cc.contacts
      if (!contact?.email) continue

      const html = interpolate(campaign.body_html, contact)
      const subject = interpolate(campaign.subject, contact)

      try {
        const contactId = contact.id ?? ''
        const messageId = await sendViaProvider(campaign.user_id, {
          from: identity!.email,
          fromName: identity!.display_name ?? identity!.email,
          to: contact.email,
          subject,
          htmlBody: html,
          textBody: campaign.body_text ? interpolate(campaign.body_text, contact) : undefined,
          unsubscribeUrl: unsubscribeUrl(contactId, campaign.id),
          tracking: { contactId, campaignId: campaign.id },
        })

        await Promise.all([
          supabase.from('campaign_contacts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', cc.id),
          supabase.from('emails').insert({
            campaign_id: campaign.id,
            contact_id: contactId,
            domain_id: domain.id,
            ses_message_id: messageId,
            status: 'sent',
          }),
        ])
        // Analytics — non-blocking
        void supabase.rpc('increment_warmup_log', { p_domain_id: domain.id, p_date: today })

        sentForCampaign++
        totalSent++
      } catch {
        await supabase.from('campaign_contacts').update({ status: 'failed' }).eq('id', cc.id)
      }
    }

    // Accumulate cross-campaign per domain
    domainSentAdded[domain.id] = alreadySentThisRun + sentForCampaign
  }

  // Update sent_today once per domain at the end (no overwrite conflicts)
  if (Object.keys(domainSentAdded).length > 0) {
    await Promise.all(
      Object.entries(domainSentAdded).map(([domainId, added]) =>
        supabase.from('domains')
          .update({ sent_today: (domainOriginalSentToday[domainId] ?? 0) + added })
          .eq('id', domainId)
      )
    )
  }

  return NextResponse.json({ ok: true, sent: totalSent })
}

export const GET = POST

function interpolate(template: string, contact: { first_name?: string | null; last_name?: string | null; company?: string | null }): string {
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name ?? '')
    .replace(/\{\{last_name\}\}/g, contact.last_name ?? '')
    .replace(/\{\{company\}\}/g, contact.company ?? '')
}
