import { createServiceClient } from '@/lib/supabase/server'
import { sendViaProvider } from '@/lib/mailer'
import { unsubscribeUrl } from '@/lib/tokens'
import { NextResponse } from 'next/server'

// Cron IA Campaigns — envoie les emails des phases approuvées aux contacts en attente.
// Respecte la daily_limit du domaine. Avance la phase quand tous les contacts sont traités.
// Appelé après le cron send : 30 17 * * * (à ajouter dans vercel.json)

const BATCH_PER_RUN = 200

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now      = new Date().toISOString()
  const today    = now.split('T')[0]!

  const { data: campaigns } = await supabase
    .from('ia_campaigns')
    .select(`
      id, user_id, domain_id, current_phase, reached_count, total_contacts,
      domains(id, daily_limit, sent_today, status)
    `)
    .eq('status', 'active')

  if (!campaigns?.length) return NextResponse.json({ ok: true, sent: 0 })

  let totalSent = 0
  const domainSentAdded: Record<string, number> = {}

  for (const campaign of campaigns) {
    const domain = Array.isArray(campaign.domains) ? campaign.domains[0] : campaign.domains
    if (!domain || domain.status === 'blocked') continue

    // Cherche le contenu approuvé pour la phase courante
    const { data: contentReq } = await supabase
      .from('ia_content_requests')
      .select('final_subject, final_body')
      .eq('campaign_id', campaign.id)
      .eq('phase_id', campaign.current_phase)
      .eq('status', 'approved')
      .maybeSingle()

    if (!contentReq?.final_subject || !contentReq?.final_body) continue

    // Capacité restante pour ce domaine aujourd'hui
    const alreadySentThisRun = domainSentAdded[domain.id] ?? 0
    const remaining = (domain.daily_limit ?? 100) - (domain.sent_today ?? 0) - alreadySentThisRun
    if (remaining <= 0) continue

    // Contacts en attente pour cette campagne
    const { data: pendingContacts } = await supabase
      .from('ia_campaign_contacts')
      .select('id, contact_id, mailbox_id, contacts!inner(email, first_name, last_name, company, unsubscribed)')
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending')
      .limit(Math.min(remaining, BATCH_PER_RUN))

    if (!pendingContacts?.length) {
      // Plus de contacts en attente → passer à la phase suivante si possible
      if (campaign.current_phase < 5) {
        await supabase.from('ia_campaigns')
          .update({ current_phase: campaign.current_phase + 1 })
          .eq('id', campaign.id)
      } else {
        await supabase.from('ia_campaigns').update({ status: 'completed' }).eq('id', campaign.id)
      }
      continue
    }

    // Récupère la mailbox à utiliser (première mailbox du domaine active en warmup)
    const { data: mailbox } = await supabase
      .from('sender_identities')
      .select('id, email, display_name')
      .eq('domain_id', campaign.domain_id)
      .in('warmup_status', ['active', 'completed'])
      .limit(1)
      .maybeSingle()

    if (!mailbox) continue

    let sentForCampaign = 0

    for (const cc of pendingContacts) {
      const contact = Array.isArray(cc.contacts) ? cc.contacts[0] : cc.contacts
      if (!contact?.email || contact.unsubscribed) {
        await supabase.from('ia_campaign_contacts').update({ status: 'skipped' }).eq('id', cc.id)
        continue
      }

      const html    = interpolate(contentReq.final_body,    contact)
      const subject = interpolate(contentReq.final_subject, contact)

      try {
        await sendViaProvider(campaign.user_id, {
          from:           mailbox.email,
          fromName:       mailbox.display_name ?? mailbox.email,
          to:             contact.email,
          subject,
          htmlBody:       html,
          unsubscribeUrl: unsubscribeUrl(cc.contact_id, campaign.id),
        })

        await supabase.from('ia_campaign_contacts').update({
          status:    'sent',
          sent_at:   now,
          mailbox_id: mailbox.id,
          phase_sent: campaign.current_phase,
        }).eq('id', cc.id)

        void supabase.rpc('increment_warmup_log', { p_domain_id: domain.id, p_date: today })

        sentForCampaign++
        totalSent++
      } catch {
        // Laisse le contact en pending — sera retenté au prochain cron
      }
    }

    if (sentForCampaign > 0) {
      domainSentAdded[domain.id] = alreadySentThisRun + sentForCampaign
      await supabase.from('ia_campaigns')
        .update({ reached_count: campaign.reached_count + sentForCampaign })
        .eq('id', campaign.id)
    }
  }

  // Mise à jour sent_today par domaine
  await Promise.all(
    Object.entries(domainSentAdded).map(([domainId, added]) => {
      const campaign = campaigns.find(c => {
        const d = Array.isArray(c.domains) ? c.domains[0] : c.domains
        return d?.id === domainId
      })
      const domain = campaign ? (Array.isArray(campaign.domains) ? campaign.domains[0] : campaign.domains) : null
      return supabase.from('domains')
        .update({ sent_today: (domain?.sent_today ?? 0) + added })
        .eq('id', domainId)
    })
  )

  return NextResponse.json({ ok: true, sent: totalSent })
}

export const GET = POST

function interpolate(
  template: string,
  contact: { first_name?: string | null; last_name?: string | null; company?: string | null },
): string {
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name ?? '')
    .replace(/\{\{last_name\}\}/g,  contact.last_name  ?? '')
    .replace(/\{\{company\}\}/g,    contact.company    ?? '')
}
