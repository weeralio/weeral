'use server'

import { createClient } from '@/lib/supabase/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── AI sequence generation ───────────────────────────────────────────────────

export interface GeneratedStep {
  step_number: number
  delay_days: number
  subject: string
  body_html: string
  send_condition: 'always' | 'no_reply' | 'no_open' | 'no_click'
  objective: string
  ai_tip: string
}

export interface GeneratedSequence {
  description: string
  steps: GeneratedStep[]
}

export async function generateSequenceWithAI(
  goal: string,
  audience: string,
  stepsCount: number,
  tone: string,
): Promise<{ error?: string; data?: GeneratedSequence }> {
  const prompt = `Tu es un expert en cold emailing et en séquences de prospection. Génère une séquence de ${stepsCount} emails pour la situation suivante.

Objectif : ${goal}
Cible : ${audience}
Ton : ${tone}

Règles à respecter :
- Email 1 : toujours conversationnel, pas de pitch direct, établir la confiance
- Email 2-3 : apporter de la valeur, partager une insight ou ressource utile
- Avant-dernier : montrer le bénéfice concret, CTA doux
- Dernier : "breakup email" bref et direct
- Délais réalistes (J0, J3, J7, J12, J18...)
- send_condition = "no_reply" sur tous les emails sauf le premier (ne pas relancer si déjà répondu)
- Corps en HTML simple (pas de markdown), avec {{first_name}} pour la personnalisation
- Objets courts, naturels, pas de spam triggers (GRATUIT, URGENT, !!!, etc.)

Retourne UNIQUEMENT ce JSON valide (sans markdown) :
{
  "description": "<stratégie en 1-2 phrases>",
  "steps": [
    {
      "step_number": 1,
      "delay_days": 0,
      "subject": "<objet>",
      "body_html": "<p>...</p>",
      "send_condition": "always",
      "objective": "<ce que cet email cherche à accomplir>",
      "ai_tip": "<conseil précis pour maximiser l'impact>"
    }
  ]
}`

  try {
    const response = await anthropic.messages.create({
      model: MODELS.sequence,
      max_tokens: 4000,
      system: "Tu es un expert en cold emailing. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.",
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const data: GeneratedSequence = JSON.parse(text)
    return { data }
  } catch (err) {
    console.error('[generateSequenceWithAI]', err)
    return { error: err instanceof Error ? err.message : 'Erreur génération IA' }
  }
}

// ─── Save sequence + steps ────────────────────────────────────────────────────

export async function createSequence(
  name: string,
  goal: string,
  description: string,
  steps: GeneratedStep[],
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: seq, error } = await supabase
    .from('sequences')
    .insert({ user_id: user.id, name, goal: goal || null, description: description || null, steps_count: steps.length })
    .select('id')
    .single()

  if (error || !seq) return { error: error?.message ?? 'Erreur création' }

  const { error: stepsError } = await supabase.from('sequence_steps').insert(
    steps.map(s => ({
      sequence_id: seq.id,
      step_number: s.step_number,
      delay_days: s.delay_days,
      subject: s.subject,
      body_html: s.body_html,
      send_condition: s.send_condition,
      objective: s.objective,
      ai_tip: s.ai_tip,
    }))
  )

  if (stepsError) return { error: stepsError.message }

  revalidatePath('/dashboard/sequences')
  redirect(`/dashboard/sequences/${seq.id}`)
}

// ─── Update a single step ─────────────────────────────────────────────────────

export async function updateStep(
  stepId: string,
  data: { subject?: string; body_html?: string; delay_days?: number; send_condition?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('sequence_steps')
    .update(data)
    .eq('id', stepId)
    .filter('sequence_id', 'in', `(SELECT id FROM sequences WHERE user_id = '${user.id}')`)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/sequences')
  return {}
}

// ─── Delete a step ────────────────────────────────────────────────────────────

export async function deleteStep(stepId: string, sequenceId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Verify sequence ownership before deleting a step
  const { data: seq } = await supabase.from('sequences').select('id').eq('id', sequenceId).eq('user_id', user.id).single()
  if (!seq) return { error: 'Séquence introuvable' }

  await supabase.from('sequence_steps').delete().eq('id', stepId).eq('sequence_id', sequenceId)

  // Recount and update steps_count
  const { count } = await supabase
    .from('sequence_steps')
    .select('*', { count: 'exact', head: true })
    .eq('sequence_id', sequenceId)

  await supabase.from('sequences').update({ steps_count: count ?? 0 }).eq('id', sequenceId)

  revalidatePath(`/dashboard/sequences/${sequenceId}`)
  return {}
}

// ─── Enroll contacts in sequence ──────────────────────────────────────────────

export async function enrollContacts(
  sequenceId: string,
  listIds: string[],
  senderIdentityId: string,
): Promise<{ error?: string; enrolled?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Fetch contacts filtered by lists (or all active contacts if no lists selected)
  let contacts: { id: string }[] | null = null
  if (listIds.length > 0) {
    const { data: members } = await supabase
      .from('contact_list_members')
      .select('contact_id, contacts!inner(id, unsubscribed)')
      .in('list_id', listIds)
      .eq('contacts.user_id', user.id)
      .eq('contacts.unsubscribed', false)
    const seen = new Set<string>()
    contacts = []
    for (const m of members ?? []) {
      if (!seen.has(m.contact_id)) { seen.add(m.contact_id); contacts.push({ id: m.contact_id }) }
    }
  } else {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('unsubscribed', false)
    contacts = data
  }

  if (!contacts?.length) return { error: 'Aucun contact actif trouvé' }

  // Get first step delay
  const { data: firstStep } = await supabase
    .from('sequence_steps')
    .select('delay_days')
    .eq('sequence_id', sequenceId)
    .eq('step_number', 1)
    .single()

  const delayDays = firstStep?.delay_days ?? 0
  const nextSendAt = new Date()
  if (delayDays > 0) {
    nextSendAt.setDate(nextSendAt.getDate() + delayDays)
  } else {
    nextSendAt.setHours(nextSendAt.getHours() + 1)
  }

  const rows = contacts.map(c => ({
    sequence_id: sequenceId,
    contact_id: c.id,
    sender_identity_id: senderIdentityId,
    current_step: 1,
    next_send_at: nextSendAt.toISOString(),
  }))

  // Upsert in batches of 500 to avoid request size limits
  let enrolled = 0
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { data, error } = await supabase
      .from('sequence_enrollments')
      .upsert(batch, { onConflict: 'sequence_id,contact_id', ignoreDuplicates: true })
      .select('id')
    if (error) return { error: error.message }
    enrolled += data?.length ?? 0
  }

  revalidatePath(`/dashboard/sequences/${sequenceId}`)
  return { enrolled }
}

// ─── Auto-responders ──────────────────────────────────────────────────────────

export async function createAutoResponder(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('auto_responders').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    trigger_event: formData.get('trigger_event') as string,
    delay_minutes: parseInt(formData.get('delay_minutes') as string) || 0,
    sender_identity_id: (formData.get('sender_identity_id') as string) || null,
    subject: formData.get('subject') as string,
    body_html: formData.get('body_html') as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/repondeurs')
  return {}
}

export async function toggleAutoResponder(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('auto_responders')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/repondeurs')
  return {}
}

export async function deleteAutoResponder(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('auto_responders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/repondeurs')
  return {}
}
