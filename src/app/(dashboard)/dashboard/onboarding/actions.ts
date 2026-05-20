'use server'

import { anthropic, MODELS, type GeneratedSequence } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const SEQUENCE_SYSTEM_PROMPT = `Tu es un expert en cold email B2B avec 10 ans d'expérience en prospection commerciale.
Tu maîtrises les frameworks AIDA, Problem-Agitate-Solve et Value Ladder.
Tu écris uniquement en français, avec un style direct, humain, sans jargon corporatif.
Tu n'utilises JAMAIS de phrases génériques type "J'espère que ce message vous trouve bien" ou "Je me permets de vous contacter".

STRUCTURE OBLIGATOIRE DE LA SÉQUENCE :

Email 1 — ACCROCHE (J+0)
• 60-80 mots maximum
• Commence par un hook ancré sur un pain point SPÉCIFIQUE de la cible (pas générique)
• 1 seule idée, 1 seule question directe en fin d'email
• Objet : max 40 caractères, intrigant, pas clickbait

Email 2 — VALEUR + PREUVE (J+4)
• 100-130 mots
• Montre le ROI ou un résultat concret avec un chiffre (ex: "3h/semaine", "+28% de rétention")
• 1 preuve sociale (client type, cas d'usage, résultat mesuré)
• CTA clair : "Un call de 20min ?"

Email 3 — FOLLOW-UP LÉGER (J+10)
• 40-55 mots
• Ton légèrement plus détendu, presque informel
• Rebond sur l'email précédent ou question simple et ouverte
• Zéro pression

Email 4 — BREAK-UP (J+18)
• 30-40 mots
• Direct et honnête, laisse la porte ouverte
• Pas de culpabilisation

RÈGLES GÉNÉRALES :
• Variables disponibles : {{prenom}}, {{entreprise}}, {{poste}} — utiliser quand naturel
• Chaque email a un objectif unique, ne pas mélanger les messages
• L'objectif est toujours d'obtenir une RÉPONSE, pas de vendre immédiatement
• Les sujets ne contiennent jamais de point d'interrogation sauf si vraiment naturel
• Le corps HTML peut utiliser <p>, <strong>, <br> uniquement

RETOURNE UNIQUEMENT DU JSON VALIDE, sans markdown, sans explication autour :
{
  "strategy": "Description de la stratégie globale en 2-3 phrases. Pourquoi cette approche pour cette cible.",
  "sequence": [
    {
      "order": 1,
      "day_offset": 0,
      "email_type": "accroche",
      "subject": "Objet de l'email",
      "html_body": "<p>Corps HTML</p>",
      "text_body": "Corps en texte brut",
      "ai_tip": "Conseil opérationnel : pourquoi cet email fonctionne, comment le A/B tester, variante à essayer"
    }
  ]
}`

function buildUserMessage(input: {
  targetDescription: string
  whatYouSell: string
  mainArgument: string
  script?: string
}): string {
  return [
    `Ma cible : ${input.targetDescription}`,
    `Ce que je vends : ${input.whatYouSell}`,
    `Mon principal argument : ${input.mainArgument}`,
    input.script?.trim()
      ? `\nMon script existant à analyser, restructurer et améliorer :\n---\n${input.script}\n---`
      : '\nAucun script existant — génère une séquence complète depuis zéro en te basant sur les informations ci-dessus.',
  ].join('\n')
}

type GenerateResult =
  | { success: true; data: GeneratedSequence }
  | { success: false; error: string }

export async function generateSequence(input: {
  targetDescription: string
  whatYouSell: string
  mainArgument: string
  script?: string
}): Promise<GenerateResult> {
  try {
    const message = await anthropic.messages.create({
      model: MODELS.sequence,
      max_tokens: 4096,
      system: SEQUENCE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(input) }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Nettoie les éventuels blocs markdown autour du JSON
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed: GeneratedSequence = JSON.parse(cleaned)

    if (!parsed.sequence || !Array.isArray(parsed.sequence) || parsed.sequence.length === 0) {
      return { success: false, error: 'La réponse IA ne contient pas de séquence valide.' }
    }

    return { success: true, data: parsed }
  } catch (err) {
    console.error('[generateSequence]', err)
    if (err instanceof SyntaxError) {
      return { success: false, error: 'Réponse IA malformée. Réessaie.' }
    }
    return { success: false, error: 'Erreur lors de la génération IA. Vérifie ta clé ANTHROPIC_API_KEY.' }
  }
}

type CreateResult =
  | { success: true; campaignId: string }
  | { success: false; error: string }

export async function createCampaignFromSequence(input: {
  name: string
  senderIdentityId: string
  targetDescription: string
  aiStrategy: string
  sequence: GeneratedSequence['sequence']
}): Promise<CreateResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const firstEmail = input.sequence[0]
  if (!firstEmail) return { success: false, error: 'Séquence vide' }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      user_id:            user.id,
      name:               input.name,
      status:             'draft',
      subject:            firstEmail.subject,
      html_body:          firstEmail.html_body,
      text_body:          firstEmail.text_body,
      from_name:          input.name,
      sender_identity_id: input.senderIdentityId,
      sequence_data:      input.sequence,
      target_description: input.targetDescription,
      ai_strategy:        input.aiStrategy,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // Notification proactive
  await supabase.from('ai_notifications').insert({
    user_id:      user.id,
    type:         'success',
    title:        `Séquence "${input.name}" créée`,
    message:      `${input.sequence.length} emails planifiés. Importe tes contacts et lance la campagne.`,
    action_label: 'Voir la campagne',
    action_href:  `/dashboard/campagnes/${campaign.id}`,
  })

  return { success: true, campaignId: campaign.id }
}
