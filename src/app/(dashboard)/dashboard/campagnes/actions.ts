'use server'

import { createClient } from '@/lib/supabase/server'
import { sendViaProvider } from '@/lib/mailer'
import { unsubscribeUrl } from '@/lib/tokens'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type State = { error: string } | null

export async function createCampaign(prevState: State, formData: FormData): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const name = formData.get('name') as string
  const senderIdentityId = formData.get('sender_identity_id') as string
  const subject = formData.get('subject') as string
  const bodyRaw = formData.get('body_html') as string

  if (!name || !senderIdentityId || !subject || !bodyRaw) {
    return { error: 'Tous les champs obligatoires doivent être remplis' }
  }

  // Si l'utilisateur a écrit du texte brut (pas de balise HTML), on le convertit
  const isHtml = /<[a-z][\s\S]*>/i.test(bodyRaw)
  const bodyHtml = isHtml
    ? bodyRaw
    : bodyRaw.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '<br>').join('')
  const bodyText = isHtml ? undefined : bodyRaw

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
      sender_identity_id: senderIdentityId,
      name,
      subject,
      body_html: bodyHtml,
      body_text: bodyText ?? null,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Ajouter tous les contacts actifs de l'utilisateur
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', user.id)
    .eq('unsubscribed', false)

  if (contacts?.length) {
    await supabase.from('campaign_contacts').insert(
      contacts.map(c => ({ campaign_id: campaign.id, contact_id: c.id, status: 'pending' }))
    )
  }

  redirect(`/dashboard/campagnes/${campaign.id}`)
}

export async function launchCampaign(campaignId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'running' })
    .eq('id', campaignId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/campagnes/${campaignId}`)
  return {}
}

export async function pauseCampaign(campaignId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'paused' })
    .eq('id', campaignId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/campagnes/${campaignId}`)
  return {}
}

export async function triggerSend(campaignId: string): Promise<{ sent?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, subject, body_html, body_text, status, sender_identities(id, email, display_name, domain_id, domains(id, daily_limit, sent_today, status))')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return { error: 'Campagne introuvable' }
  if (campaign.status !== 'running') return { error: 'La campagne doit être en cours (statut "running")' }

  const identity = Array.isArray(campaign.sender_identities) ? campaign.sender_identities[0] : campaign.sender_identities
  const domain = Array.isArray(identity?.domains) ? identity.domains[0] : identity?.domains

  if (!domain) return { error: 'Domaine introuvable' }
  if (domain.status === 'blocked') return { error: 'Domaine bloqué' }

  const remaining = domain.daily_limit - domain.sent_today
  if (remaining <= 0) return { error: 'Quota journalier atteint pour ce domaine' }

  const { data: pendingContacts } = await supabase
    .from('campaign_contacts')
    .select('id, contact_id, contacts(email, first_name, last_name, company)')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .limit(remaining)

  if (!pendingContacts?.length) {
    await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
    revalidatePath(`/dashboard/campagnes/${campaignId}`)
    return { sent: 0 }
  }

  let sent = 0
  const today = new Date().toISOString().split('T')[0]

  for (const cc of pendingContacts) {
    const contact = Array.isArray(cc.contacts) ? cc.contacts[0] : cc.contacts
    if (!contact?.email) continue

    const subject = interpolate(campaign.subject, contact)
    const html = interpolate(campaign.body_html, contact)
    const text = campaign.body_text ? interpolate(campaign.body_text, contact) : undefined

    try {
      const messageId = await sendViaProvider(user.id, {
        from: identity!.email,
        fromName: identity!.display_name ?? identity!.email,
        to: contact.email,
        subject,
        htmlBody: html,
        textBody: text,
        unsubscribeUrl: unsubscribeUrl(cc.contact_id, campaignId),
      })

      await Promise.all([
        supabase.from('campaign_contacts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', cc.id),
        supabase.from('emails').insert({
          campaign_id: campaignId,
          contact_id: cc.contact_id,
          domain_id: domain.id,
          ses_message_id: messageId,
          status: 'sent',
        }),
        supabase.from('domains').update({ sent_today: domain.sent_today + sent + 1 }).eq('id', domain.id),
        supabase.rpc('increment_warmup_log', { p_domain_id: domain.id, p_date: today }),
      ])
      sent++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      await supabase.from('campaign_contacts').update({ status: 'failed' }).eq('id', cc.id)
      revalidatePath(`/dashboard/campagnes/${campaignId}`)
      return { error: `Échec envoi à ${contact.email} : ${msg}` }
    }
  }

  revalidatePath(`/dashboard/campagnes/${campaignId}`)
  return { sent }
}

function interpolate(template: string, contact: { first_name?: string | null; last_name?: string | null; company?: string | null }): string {
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name ?? '')
    .replace(/\{\{last_name\}\}/g, contact.last_name ?? '')
    .replace(/\{\{company\}\}/g, contact.company ?? '')
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('campaigns').delete().eq('id', campaignId)
  revalidatePath('/dashboard/campagnes')
  redirect('/dashboard/campagnes')
}
