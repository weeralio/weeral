'use server'

import { createClient } from '@/lib/supabase/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { getDailyVolumeForMailbox } from '@/lib/warmup'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type WarmupPhase = 'j4_j8' | 'j9' | 'j10_j14'

interface MessageVariant {
  subject: string
  body_html: string
}

async function aiGeneratePhaseMessages(
  objective: string,
  ctaUrl: string | null,
  phase: WarmupPhase,
  variantCount: number,
): Promise<MessageVariant[]> {
  const phaseInstructions: Record<WarmupPhase, string> = {
    j4_j8: `Phase J4–J8 : échauffement sans lien.
RÈGLES ABSOLUES :
- Aucun lien dans le message (pas de http://, pas de URL)
- Ton naturel, humain, conversationnel — aucun template commercial
- 3 à 5 phrases maximum
- Objet court (< 8 mots)
- ${variantCount} variantes légèrement différentes (angle, formulation, style)`,

    j9: `Phase J9 : introduction d'un premier lien neutre.
RÈGLES :
- 1 seul lien vers du contenu utile ou éditorial (PAS une page produit)
- Lien à insérer : ${ctaUrl ?? '[URL à définir par l\'utilisateur]'}
- Présentation naturelle du lien, aucun pitch direct
- 4 à 6 phrases
- Objet court et intrigant
- ${variantCount} variantes`,

    j10_j14: `Phase J10–J14 : message de campagne avec CTA.
RÈGLES :
- Message de prospection complet avec appel à l'action clair
- CTA URL : ${ctaUrl ?? '[URL à définir par l\'utilisateur]'}
- Personnalisation {{first_name}} recommandée
- Objet engageant
- ${variantCount} variantes`,
  }

  const prompt = `Objectif de l'expéditeur : ${objective}

${phaseInstructions[phase]}

Retourne UNIQUEMENT ce JSON sans markdown :
{
  "variants": [
    { "subject": "...", "body_html": "<p>...</p>" }
  ]
}`

  const response = await anthropic.messages.create({
    model: MODELS.chat,
    max_tokens: 2500,
    system: 'Tu es un expert en cold emailing et délivrabilité. Réponds UNIQUEMENT en JSON valide, sans markdown.',
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(text)
  return (parsed.variants as MessageVariant[]).slice(0, variantCount)
}

// ─── Create warmup campaign ───────────────────────────────────────────────────

export async function createWarmupCampaign(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const name        = formData.get('name') as string
  const domainId    = formData.get('domain_id') as string
  const objective   = formData.get('cta_objective') as string
  const ctaUrl      = (formData.get('cta_url') as string | null) || null
  const listIds: string[]   = JSON.parse((formData.get('list_ids') as string) || '[]')
  const mailboxIds: string[] = JSON.parse((formData.get('mailbox_ids') as string) || '[]')

  if (!name || !domainId || mailboxIds.length === 0) {
    return { error: 'Nom, domaine et au moins une boîte mail sont requis' }
  }

  const { data: campaign, error } = await supabase
    .from('warmup_campaigns')
    .insert({
      user_id:       user.id,
      domain_id:     domainId,
      name,
      cta_objective: objective || null,
      cta_url:       ctaUrl,
      list_ids:      listIds,
      mailbox_ids:   mailboxIds,
    })
    .select('id')
    .single()

  if (error || !campaign) return { error: error?.message ?? 'Erreur création' }

  // Initialise les boîtes : démarre leur warmup depuis le début
  if (mailboxIds.length > 0) {
    await supabase
      .from('sender_identities')
      .update({ warmup_status: 'waiting', warmup_day: 1, sent_today: 0, daily_volume: 0 })
      .in('id', mailboxIds)
      .eq('user_id', user.id)
  }

  // AI-generate messages for all 3 phases if objective provided
  if (objective) {
    const variantCount = Math.max(1, Math.min(mailboxIds.length, 3))
    const phases: WarmupPhase[] = ['j4_j8', 'j9', 'j10_j14']

    for (const phase of phases) {
      try {
        const variants = await aiGeneratePhaseMessages(objective, ctaUrl, phase, variantCount)
        const rows = variants.map((v, i) => ({
          warmup_campaign_id: campaign.id,
          user_id:            user.id,
          phase,
          variant_index:      i,
          subject:            v.subject,
          body_html:          v.body_html,
          has_link:           phase !== 'j4_j8',
          ai_generated:       true,
        }))
        await supabase.from('warmup_messages').insert(rows)
      } catch (err) {
        console.error(`[createWarmupCampaign] AI error phase ${phase}:`, err)
      }
    }
  }

  redirect(`/dashboard/warmup/${campaign.id}`)
}

// ─── Regenerate messages for one phase ───────────────────────────────────────

export async function generateMessagesForPhase(
  campaignId: string,
  phase: WarmupPhase,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: campaign } = await supabase
    .from('warmup_campaigns')
    .select('cta_objective, cta_url, mailbox_ids')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return { error: 'Campagne introuvable' }
  if (!campaign.cta_objective) return { error: 'Objectif requis pour la génération IA' }

  try {
    const variantCount = Math.max(1, Math.min((campaign.mailbox_ids as string[]).length, 3))
    const variants = await aiGeneratePhaseMessages(
      campaign.cta_objective,
      campaign.cta_url ?? null,
      phase,
      variantCount,
    )

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]!
      await supabase.from('warmup_messages').upsert({
        warmup_campaign_id: campaignId,
        user_id:            user.id,
        phase,
        variant_index:      i,
        subject:            v.subject,
        body_html:          v.body_html,
        has_link:           phase !== 'j4_j8',
        ai_generated:       true,
      }, { onConflict: 'warmup_campaign_id,phase,variant_index' })
    }

    revalidatePath(`/dashboard/warmup/${campaignId}`)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur génération IA' }
  }
}

// ─── Save a single message variant ───────────────────────────────────────────

export async function saveWarmupMessage(
  campaignId: string,
  phase: WarmupPhase,
  variantIndex: number,
  subject: string,
  bodyHtml: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('warmup_messages').upsert({
    warmup_campaign_id: campaignId,
    user_id:            user.id,
    phase,
    variant_index:      variantIndex,
    subject,
    body_html:          bodyHtml,
    has_link:           phase !== 'j4_j8',
    ai_generated:       false,
  }, { onConflict: 'warmup_campaign_id,phase,variant_index' })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/warmup/${campaignId}`)
  return {}
}

// ─── Update contact lists ─────────────────────────────────────────────────────

export async function updateWarmupLists(
  campaignId: string,
  listIds: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('warmup_campaigns')
    .update({ list_ids: listIds })
    .eq('id', campaignId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/warmup/${campaignId}`)
  return {}
}

// ─── Adjust warmup day manually ──────────────────────────────────────────────

export async function adjustWarmupDay(
  mailboxId: string,
  targetDay: number,
  campaignId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Verify the mailbox belongs to the user
  const { data: mb } = await supabase
    .from('sender_identities')
    .select('id')
    .eq('id', mailboxId)
    .eq('user_id', user.id)
    .single()

  if (!mb) return { error: 'Boîte introuvable' }

  const day = Math.max(1, Math.min(14, targetDay))
  const warmupStatus =
    day >= 14 ? 'completed' :
    day >= 4  ? 'active' :
    'resting'

  const { error } = await supabase
    .from('sender_identities')
    .update({
      warmup_day:    day,
      warmup_status: warmupStatus,
      daily_volume:  getDailyVolumeForMailbox(day),
      sent_today:    0,
    })
    .eq('id', mailboxId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/warmup/${campaignId}`)
  return {}
}

// ─── Pause / resume / delete ──────────────────────────────────────────────────

export async function pauseWarmupCampaign(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  const { error } = await supabase.from('warmup_campaigns').update({ status: 'paused' }).eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/warmup/${id}`)
  revalidatePath('/dashboard/warmup')
  return {}
}

export async function resumeWarmupCampaign(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  const { error } = await supabase.from('warmup_campaigns').update({ status: 'active' }).eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/warmup/${id}`)
  revalidatePath('/dashboard/warmup')
  return {}
}

export async function deleteWarmupCampaign(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard/warmup')

  // Fetch mailbox list before deleting (for state reset)
  const { data: campaign } = await supabase
    .from('warmup_campaigns')
    .select('mailbox_ids')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) redirect('/dashboard/warmup')

  await supabase.from('warmup_campaigns').delete().eq('id', id).eq('user_id', user.id)

  // Reset mailboxes to initial state so they can be reused in another campaign
  const mailboxIds = campaign.mailbox_ids as string[]
  if (mailboxIds.length > 0) {
    await supabase
      .from('sender_identities')
      .update({ warmup_status: 'waiting', warmup_day: 1, daily_volume: 0, sent_today: 0 })
      .in('id', mailboxIds)
      .eq('user_id', user.id)
  }

  redirect('/dashboard/warmup')
}
