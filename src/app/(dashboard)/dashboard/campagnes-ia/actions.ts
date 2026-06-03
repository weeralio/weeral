'use server'

import { createClient } from '@/lib/supabase/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// ─── Phase definitions ────────────────────────────────────────────────────────

const PHASES = [
  null, // index 0 unused
  {
    phase_id: 1,
    phase_name: 'Silence',
    day_start: 1,
    brief: 'Période de repos — aucun email envoyé.',
    requirements: [] as string[],
  },
  {
    phase_id: 2,
    phase_name: 'Échauffement',
    day_start: 4,
    brief: "Écris un message conversationnel court (3–5 phrases) pour une première prise de contact naturelle. Le message doit sembler humain, sans accroche commerciale, sans lien, sans call-to-action direct.",
    requirements: [
      'Ton naturel et personnel — pas de template',
      'Aucun lien dans le message',
      'Pas de pitch produit, pas de CTA',
      '3 à 5 phrases maximum',
      'Objet court et naturel (< 8 mots)',
    ],
  },
  {
    phase_id: 3,
    phase_name: 'Activation',
    day_start: 9,
    brief: "Écris un message avec un lien vers une ressource non commerciale (article, étude, outil gratuit) qui apportera de la valeur à ton prospect. Le but : tester le taux de clic avec un lien neutre.",
    requirements: [
      '1 seul lien — vers du contenu éditorial ou utile (pas une landing page)',
      'Présentation naturelle du lien, pas de forçage',
      'Pas de pitch produit direct',
      '4 à 6 phrases',
    ],
  },
  {
    phase_id: 4,
    phase_name: 'Test A/B',
    day_start: 10,
    brief: "Écris ton message de campagne réel. L'IA testera 2 variantes d'objet. Fournis un objet principal et un objet alternatif.",
    requirements: [
      'Message de campagne complet avec CTA clair',
      '2 objets différents pour le test A/B (principal + alternatif)',
      'Lien de désabonnement ajouté automatiquement',
      'Personnalisation {{prenom}} recommandée si disponible',
    ],
  },
  {
    phase_id: 5,
    phase_name: 'Décollage',
    day_start: 12,
    brief: "Phase de montée en volume — la meilleure variante du test A/B sera utilisée automatiquement. Soumets une nouvelle version uniquement si tu veux changer le message.",
    requirements: [
      'Message optimisé basé sur les résultats A/B',
      'CTA direct autorisé',
      'Lien de désabonnement obligatoire (ajouté automatiquement)',
    ],
  },
]

async function createContentRequest(
  supabase: SupabaseClient,
  campaignId: string,
  userId: string,
  phaseId: number,
) {
  const phase = PHASES[phaseId]
  if (!phase || phaseId === 1) return

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 2)

  await supabase.from('ia_content_requests').insert({
    campaign_id: campaignId,
    user_id: userId,
    phase_id: phase.phase_id,
    phase_name: phase.phase_name,
    day_start: phase.day_start,
    brief: phase.brief,
    requirements: phase.requirements,
    due_date: dueDate.toISOString().split('T')[0],
  })
}

// ─── Create campaign ──────────────────────────────────────────────────────────

export async function createIACampaign(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const name = formData.get('name') as string
  const goal = formData.get('goal') as string
  const domainId = formData.get('domain_id') as string
  const listIdsRaw = formData.get('list_ids') as string | null
  const listIds: string[] = listIdsRaw ? JSON.parse(listIdsRaw) : []

  if (!name || !domainId) return { error: 'Nom et domaine obligatoires' }

  // Résoudre les contacts selon les listes sélectionnées
  let contactIds: string[] = []
  if (listIds.length > 0) {
    const { data: members } = await supabase
      .from('contact_list_members')
      .select('contact_id, contacts!inner(id, unsubscribed)')
      .in('list_id', listIds)
      .eq('contacts.user_id', user.id)
      .eq('contacts.unsubscribed', false)
    const seen = new Set<string>()
    for (const m of members ?? []) {
      if (!seen.has(m.contact_id)) { seen.add(m.contact_id); contactIds.push(m.contact_id) }
    }
  } else {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('unsubscribed', false)
    contactIds = (data ?? []).map(c => c.id)
  }

  const { data: campaign, error } = await supabase
    .from('ia_campaigns')
    .insert({
      user_id: user.id,
      domain_id: domainId,
      name,
      goal: goal || null,
      total_contacts: contactIds.length,
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !campaign) return { error: error?.message ?? 'Erreur création' }

  if (contactIds.length > 0) {
    await supabase.from('ia_campaign_contacts').insert(
      contactIds.map((id) => ({ campaign_id: campaign.id, contact_id: id }))
    )
  }

  await createContentRequest(supabase, campaign.id, user.id, 2)

  redirect(`/dashboard/campagnes-ia/${campaign.id}`)
}

// ─── Submit content for AI analysis ──────────────────────────────────────────

export interface AnalysisResult {
  score: number
  checks: { label: string; passed: boolean; detail: string }[]
  issues: string[]
  improvements: string[]
  final_subject: string
  final_body: string
}

export async function submitContent(
  requestId: string,
  userMessage: string,
): Promise<{ error?: string } & Partial<AnalysisResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: req } = await supabase
    .from('ia_content_requests')
    .select('*')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()

  if (!req) return { error: 'Demande introuvable' }

  const requirements = (req.requirements as string[])
    .map((r, i) => `${i + 1}. ${r}`)
    .join('\n')

  const userPrompt = `Phase : ${req.phase_name} (Jour ${req.day_start})
Brief : ${req.brief}

Règles :
${requirements}

Message soumis :
---
${userMessage}
---

Analyse et retourne UNIQUEMENT ce JSON (sans markdown) :
{
  "score": <0-100>,
  "checks": [{ "label": "<règle>", "passed": <true|false>, "detail": "<explication>" }],
  "issues": ["<problème>"],
  "improvements": ["<amélioration>"],
  "final_subject": "<objet optimisé>",
  "final_body": "<corps optimisé, HTML simple, toutes règles respectées>"
}`

  let result: AnalysisResult
  try {
    const response = await anthropic.messages.create({
      model: MODELS.chat,
      max_tokens: 2000,
      system: "Tu es un expert en cold emailing et deliverability. Réponds UNIQUEMENT en JSON valide, sans markdown.",
      messages: [{ role: 'user', content: userPrompt }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    // Strip markdown code fences if Claude wraps the JSON despite instructions
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    result = JSON.parse(text)
  } catch (err) {
    console.error('[submitContent] Anthropic error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Erreur analyse IA : ${msg}` }
  }

  const isApproved = result.score >= 70

  await supabase.from('ia_content_requests').update({
    user_raw_input: userMessage,
    ai_score: result.score,
    ai_checks: result.checks,
    ai_issues: result.issues,
    ai_improvements: result.improvements,
    final_subject: result.final_subject,
    final_body: result.final_body,
    status: isApproved ? 'approved' : 'needs_revision',
    submitted_at: new Date().toISOString(),
    approved_at: isApproved ? new Date().toISOString() : null,
  }).eq('id', requestId)

  revalidatePath('/dashboard/campagnes-ia')

  return { ...result }
}

// ─── Force approve (after revision) ──────────────────────────────────────────

export async function approveContent(requestId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('ia_content_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/campagnes-ia')
  return {}
}

// ─── Pause / resume ───────────────────────────────────────────────────────────

export async function pauseIACampaign(campaignId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('ia_campaigns')
    .update({ status: 'paused' })
    .eq('id', campaignId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/campagnes-ia')
  return {}
}

export async function resumeIACampaign(campaignId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('ia_campaigns')
    .update({ status: 'active' })
    .eq('id', campaignId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/campagnes-ia')
  return {}
}
