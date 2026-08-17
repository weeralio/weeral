import { schedules } from '@trigger.dev/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { sendViaProvider } from '@/lib/mailer'
import { unsubscribeUrl } from '@/lib/tokens'

// Remplace le cron Vercel /api/cron/ia-campaigns (supprimé de vercel.json).
// La logique est inline — pas de fetch HTTP vers la route.
export const iaCampaignsCron = schedules.task({
  id: 'ia-campaigns-cron',
  cron: '30 17 * * *',  // 17:30 UTC — après le warmup (17:00) et le reset (01:00)
  run: async () => {
    const supabase = createServiceClient()
    const now   = new Date().toISOString()
    const today = now.split('T')[0]!
    const BATCH_PER_RUN = 200

    const { data: campaigns } = await supabase
      .from('ia_campaigns')
      .select(`
        id, user_id, domain_id, current_phase, reached_count, total_contacts,
        domains(id, daily_limit, sent_today, status)
      `)
      .eq('status', 'active')

    if (!campaigns?.length) return { ok: true, sent: 0 }

    let totalSent = 0
    const domainSentAdded: Record<string, number> = {}

    for (const campaign of campaigns) {
      const domain = Array.isArray(campaign.domains) ? campaign.domains[0] : campaign.domains
      if (!domain || (domain as { status: string }).status === 'blocked') continue

      const { data: contentReq } = await supabase
        .from('ia_content_requests')
        .select('final_subject, final_body')
        .eq('campaign_id', campaign.id)
        .eq('phase_id', campaign.current_phase)
        .eq('status', 'approved')
        .maybeSingle()

      if (!contentReq?.final_subject || !contentReq?.final_body) continue

      const alreadySentThisRun = domainSentAdded[(domain as { id: string }).id] ?? 0
      const remaining = ((domain as { daily_limit: number }).daily_limit ?? 100)
        - ((domain as { sent_today: number }).sent_today ?? 0)
        - alreadySentThisRun
      if (remaining <= 0) continue

      const { data: pendingContacts } = await supabase
        .from('ia_campaign_contacts')
        .select('id, contact_id, mailbox_id, contacts!inner(email, first_name, last_name, company, unsubscribed)')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .limit(Math.min(remaining, BATCH_PER_RUN))

      if (!pendingContacts?.length) {
        if (campaign.current_phase < 5) {
          await supabase.from('ia_campaigns')
            .update({ current_phase: campaign.current_phase + 1 })
            .eq('id', campaign.id)
        } else {
          await supabase.from('ia_campaigns').update({ status: 'completed' }).eq('id', campaign.id)
        }
        continue
      }

      const { data: mailbox } = await supabase
        .from('sender_identities')
        .select('id, email, display_name, domains!domain_id(mailgun_region)')
        .eq('domain_id', campaign.domain_id)
        .in('warmup_status', ['active', 'completed'])
        .limit(1)
        .maybeSingle()

      if (!mailbox) continue

      const mailboxDomain = Array.isArray(mailbox.domains) ? mailbox.domains[0] : mailbox.domains
      const mailgunRegion = (mailboxDomain as { mailgun_region?: string } | null)?.mailgun_region as 'us' | 'eu' | undefined

      let sentForCampaign = 0

      for (const cc of pendingContacts) {
        const contact = Array.isArray(cc.contacts) ? cc.contacts[0] : cc.contacts
        if (!contact?.email || (contact as { unsubscribed: boolean }).unsubscribed) {
          await supabase.from('ia_campaign_contacts').update({ status: 'skipped' }).eq('id', cc.id)
          continue
        }

        const html    = iaCampaignInterpolate(contentReq.final_body,    contact as { first_name?: string | null; last_name?: string | null; company?: string | null })
        const subject = iaCampaignInterpolate(contentReq.final_subject, contact as { first_name?: string | null; last_name?: string | null; company?: string | null })

        try {
          await sendViaProvider(campaign.user_id, {
            from:           mailbox.email,
            fromName:       mailbox.display_name ?? mailbox.email,
            to:             (contact as { email: string }).email,
            subject,
            htmlBody:       html,
            unsubscribeUrl: unsubscribeUrl(cc.contact_id, campaign.id),
            mailgunRegion,
          })

          await supabase.from('ia_campaign_contacts').update({
            status:      'sent',
            sent_at:     now,
            mailbox_id:  mailbox.id,
            phase_sent:  campaign.current_phase,
          }).eq('id', cc.id)

          void supabase.rpc('increment_warmup_log', { p_domain_id: (domain as { id: string }).id, p_date: today })

          sentForCampaign++
          totalSent++
        } catch {
          // Contact reste en pending → retenté au prochain cron
        }
      }

      if (sentForCampaign > 0) {
        domainSentAdded[(domain as { id: string }).id] = alreadySentThisRun + sentForCampaign
        await supabase.from('ia_campaigns')
          .update({ reached_count: campaign.reached_count + sentForCampaign })
          .eq('id', campaign.id)
      }
    }

    await Promise.all(
      Object.entries(domainSentAdded).map(([domainId, added]) => {
        const campaign = campaigns.find(c => {
          const d = Array.isArray(c.domains) ? c.domains[0] : c.domains
          return (d as { id?: string } | null)?.id === domainId
        })
        const d = campaign ? (Array.isArray(campaign.domains) ? campaign.domains[0] : campaign.domains) : null
        return supabase.from('domains')
          .update({ sent_today: ((d as { sent_today?: number } | null)?.sent_today ?? 0) + added })
          .eq('id', domainId)
      }),
    )

    return { ok: true, sent: totalSent }
  },
})

function iaCampaignInterpolate(
  template: string,
  contact: { first_name?: string | null; last_name?: string | null; company?: string | null },
): string {
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name ?? '')
    .replace(/\{\{last_name\}\}/g,  contact.last_name  ?? '')
    .replace(/\{\{company\}\}/g,    contact.company    ?? '')
}
