'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { revalidatePath } from 'next/cache'

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

  const { data: seqRow, error } = await supabase
    .from('seq')
    .insert({ user_id: user.id, name, goal: goal || null, description: description || null })
    .select('id')
    .single()

  if (error || !seqRow) return { error: error?.message ?? 'Erreur création' }

  if (steps.length > 0) {
    const { error: stepsError } = await supabase.from('seq_step').insert(
      steps.map(s => ({
        seq_id: seqRow.id,
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
  }

  revalidatePath('/dashboard/sequences')
  return { id: seqRow.id }
}

// ─── Manage mailboxes assigned to a sequence ──────────────────────────────────

export async function addSeqMailbox(
  sequenceId: string,
  mailboxId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('seq_mailbox')
    .upsert({ seq_id: sequenceId, mailbox_id: mailboxId }, { ignoreDuplicates: true })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/sequences/${sequenceId}`)
  return {}
}

export async function addAllSeqMailboxes(
  sequenceId: string,
  mailboxIds: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('seq_mailbox')
    .upsert(mailboxIds.map(id => ({ seq_id: sequenceId, mailbox_id: id })), { ignoreDuplicates: true })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/sequences/${sequenceId}`)
  return {}
}

export async function removeSeqMailbox(
  sequenceId: string,
  mailboxId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('seq_mailbox')
    .delete()
    .eq('seq_id', sequenceId)
    .eq('mailbox_id', mailboxId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/sequences/${sequenceId}`)
  return {}
}

// ─── Update a single step ─────────────────────────────────────────────────────

export async function updateStep(
  stepId: string,
  data: { subject?: string; body_html?: string; delay_days?: number; send_condition?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // RLS sur seq_step vérifie seq.user_id = auth.uid() — pas besoin de filtre manuel
  const { error } = await supabase
    .from('seq_step')
    .update(data)
    .eq('id', stepId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/sequences')
  return {}
}

// ─── Delete a step ────────────────────────────────────────────────────────────

export async function deleteStep(stepId: string, sequenceId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: seqCheck } = await supabase.from('seq').select('id').eq('id', sequenceId).eq('user_id', user.id).single()
  if (!seqCheck) return { error: 'Séquence introuvable' }

  await supabase.from('seq_step').delete().eq('id', stepId).eq('seq_id', sequenceId)

  revalidatePath(`/dashboard/sequences/${sequenceId}`)
  return {}
}

// ─── Enroll contacts in sequence ──────────────────────────────────────────────

export async function enrollContacts(
  sequenceId: string,
  listIds: string[],
  startAt?: string,
): Promise<{ error?: string; enrolled?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Verify ownership
  const { data: seqRow } = await supabase.from('seq').select('id').eq('id', sequenceId).eq('user_id', user.id).single()
  if (!seqRow) return { error: 'Séquence introuvable' }

  // Load assigned mailboxes (round-robin source)
  const { data: mailboxIds } = await supabase
    .from('seq_mailbox')
    .select('mailbox_id')
    .eq('seq_id', sequenceId)
  if (!mailboxIds?.length) return { error: 'Aucune boîte d\'envoi assignée à cette séquence.' }

  const { data: mailboxes } = await supabase
    .from('sender_identities')
    .select('id, email, domains!domain_id(domain)')
    .in('id', mailboxIds.map(r => r.mailbox_id))
    .eq('user_id', user.id)
  if (!mailboxes?.length) return { error: 'Boîtes d\'envoi introuvables.' }

  // Load first step
  const { data: firstStep } = await supabase
    .from('seq_step')
    .select('step_number, delay_days, subject, body_html, body_text')
    .eq('seq_id', sequenceId)
    .eq('step_number', 1)
    .single()
  if (!firstStep) return { error: 'La séquence ne contient aucune étape.' }

  // Load contacts
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
    const { data } = await supabase.from('contacts').select('id').eq('user_id', user.id).eq('unsubscribed', false)
    contacts = data
  }
  if (!contacts?.length) return { error: 'Aucun contact actif trouvé' }

  // Base date: explicit start or now
  const scheduledAt = startAt ? new Date(startAt) : new Date()
  if (firstStep.delay_days > 0) {
    scheduledAt.setDate(scheduledAt.getDate() + firstStep.delay_days)
  } else if (!startAt) {
    // No explicit start: schedule 5 min ahead so the next tick picks it up immediately
    scheduledAt.setMinutes(scheduledAt.getMinutes() + 5)
  }

  const serviceClient = createServiceClient()
  let enrolled = 0

  for (let i = 0; i < contacts.length; i += 200) {
    const batch = contacts.slice(i, i + 200)

    const enrollmentInserts = batch.map((c, j) => ({
      seq_id:       sequenceId,
      contact_id:   c.id,
      mailbox_id:   mailboxes[(i + j) % mailboxes.length].id,
      current_step: 1,
      status:       'active' as const,
    }))

    const { data: inserted } = await serviceClient
      .from('seq_enrollment')
      .upsert(enrollmentInserts, { onConflict: 'seq_id,contact_id', ignoreDuplicates: true })
      .select('id, contact_id, mailbox_id')

    if (!inserted?.length) continue
    enrolled += inserted.length

    const sendInserts = inserted.map(enrollment => ({
      user_id:           user.id,
      mailbox_id:        enrollment.mailbox_id,
      contact_id:        enrollment.contact_id,
      source_type:       'sequence' as const,
      source_id:         sequenceId,
      step_number:       1,
      seq_enrollment_id: enrollment.id,
      subject:           firstStep.subject,
      body_html:         firstStep.body_html,
      body_text:         firstStep.body_text ?? null,
      reply_to:          null,
      scheduled_at:      scheduledAt.toISOString(),
      status:            'pending' as const,
    }))

    await serviceClient.from('sends').insert(sendInserts)
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

// ─── Enrollment list types ────────────────────────────────────────────────────

export interface EnrollmentContact {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  prospect_status: string | null
}

export interface LastSendEvent {
  seq_enrollment_id: string
  status: string
  opened_at: string | null
  clicked_at: string | null
  step_number: number
  scheduled_at: string
  last_error: string | null
}

export interface EnrollmentRow {
  id: string
  contact_id: string
  mailbox_id: string | null
  current_step: number
  status: string
  stop_reason: string | null
  stopped_at: string | null
  enrolled_at: string
  completed_at: string | null
  contact: EnrollmentContact | null
  lastEvent: LastSendEvent | null
}

// ─── Sequence lifecycle controls ──────────────────────────────────────────────

export async function pauseSequence(seqId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: seq } = await supabase.from('seq').select('id').eq('id', seqId).eq('user_id', user.id).single()
  if (!seq) return { error: 'Séquence introuvable' }

  const { data: active } = await supabase.from('seq_enrollment').select('id').eq('seq_id', seqId).eq('status', 'active')
  const ids = active?.map(e => e.id) ?? []

  await supabase.from('seq').update({ status: 'paused' }).eq('id', seqId)

  if (ids.length) {
    const service = createServiceClient()
    // Freeze pending sends by pushing scheduled_at into far future — drain ignores them
    await service.from('sends')
      .update({ scheduled_at: '2099-01-01T00:00:00.000Z' })
      .in('seq_enrollment_id', ids)
      .eq('status', 'pending')
  }

  revalidatePath(`/dashboard/sequences/${seqId}`)
  return {}
}

export async function resumeSequence(seqId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: seq } = await supabase.from('seq').select('id').eq('id', seqId).eq('user_id', user.id).single()
  if (!seq) return { error: 'Séquence introuvable' }

  const { data: active } = await supabase.from('seq_enrollment').select('id').eq('seq_id', seqId).eq('status', 'active')
  const ids = active?.map(e => e.id) ?? []

  await supabase.from('seq').update({ status: 'active' }).eq('id', seqId)

  if (ids.length) {
    const service = createServiceClient()
    // Restore only sends frozen by pause (scheduled in 2099)
    await service.from('sends')
      .update({ scheduled_at: new Date().toISOString() })
      .in('seq_enrollment_id', ids)
      .eq('status', 'pending')
      .gt('scheduled_at', '2098-01-01T00:00:00.000Z')
  }

  revalidatePath(`/dashboard/sequences/${seqId}`)
  return {}
}

export async function stopSequence(seqId: string): Promise<{ error?: string; stopped?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: seq } = await supabase.from('seq').select('id').eq('id', seqId).eq('user_id', user.id).single()
  if (!seq) return { error: 'Séquence introuvable' }

  const { data: active } = await supabase.from('seq_enrollment').select('id').eq('seq_id', seqId).eq('status', 'active')
  const ids = active?.map(e => e.id) ?? []

  const service = createServiceClient()
  if (ids.length) {
    await service.from('seq_enrollment')
      .update({ status: 'stopped', stop_reason: 'manual', stopped_at: new Date().toISOString() })
      .in('id', ids)
    await service.from('sends')
      .update({ status: 'cancelling' })
      .in('seq_enrollment_id', ids)
      .eq('status', 'pending')
  }

  await supabase.from('seq').update({ status: 'stopped' }).eq('id', seqId)

  revalidatePath(`/dashboard/sequences/${seqId}`)
  return { stopped: ids.length }
}

export async function deleteSequence(seqId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('seq').delete().eq('id', seqId).eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/sequences')
  return {}
}

// ─── Enrollment list (paginated) ──────────────────────────────────────────────

export async function getEnrollmentsPage(
  seqId: string,
  page: number,
  perPage = 20,
  search?: string,
): Promise<{ error?: string; enrollments?: EnrollmentRow[]; total?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: seq } = await supabase.from('seq').select('id').eq('id', seqId).eq('user_id', user.id).single()
  if (!seq) return { error: 'Séquence introuvable' }

  const offset = (page - 1) * perPage

  // If search provided, resolve matching contact IDs first
  let contactFilter: string[] | null = null
  const term = search?.trim()
  if (term) {
    // PostgREST uses * as wildcard inside .or() (not %)
    const { data: matches } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .or(`email.ilike.*${term}*,first_name.ilike.*${term}*,last_name.ilike.*${term}*`)
      .limit(300)
    contactFilter = matches?.map(c => c.id) ?? []
    if (!contactFilter.length) return { total: 0, enrollments: [] }
  }

  let q = supabase
    .from('seq_enrollment')
    .select(
      'id, contact_id, mailbox_id, current_step, status, stop_reason, stopped_at, enrolled_at, completed_at, contacts!contact_id(id, email, first_name, last_name, prospect_status)',
      { count: 'exact' },
    )
    .eq('seq_id', seqId)
    .order('enrolled_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (contactFilter) q = q.in('contact_id', contactFilter)

  const { data: rows, count } = await q

  if (!rows) return { total: 0, enrollments: [] }

  const enrollmentIds = rows.map(r => r.id)
  const { data: events } = enrollmentIds.length > 0
    ? await supabase
        .from('sends')
        .select('seq_enrollment_id, status, opened_at, clicked_at, step_number, scheduled_at, last_error')
        .in('seq_enrollment_id', enrollmentIds)
        .order('created_at', { ascending: false })
    : { data: [] as LastSendEvent[] }

  const lastEventMap: Record<string, LastSendEvent> = {}
  for (const s of events ?? []) {
    const e = s as LastSendEvent
    const existing = lastEventMap[e.seq_enrollment_id]
    if (!existing) {
      lastEventMap[e.seq_enrollment_id] = e
    } else if (
      (e.clicked_at && !existing.clicked_at) ||
      (e.opened_at && !existing.clicked_at && !existing.opened_at)
    ) {
      lastEventMap[e.seq_enrollment_id] = e
    }
  }

  return {
    total: count ?? 0,
    enrollments: rows.map(r => {
      const contact = (Array.isArray(r.contacts) ? r.contacts[0] : r.contacts) as EnrollmentContact | null
      return {
        id:          r.id,
        contact_id:  r.contact_id,
        mailbox_id:  r.mailbox_id,
        current_step: r.current_step,
        status:      r.status,
        stop_reason: r.stop_reason,
        stopped_at:  r.stopped_at,
        enrolled_at: r.enrolled_at,
        completed_at: r.completed_at,
        contact:     contact,
        lastEvent:   lastEventMap[r.id] ?? null,
      }
    }),
  }
}

export async function cancelEnrollment(enrollmentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.rpc('cancel_seq_enrollment', {
    p_enrollment_id: enrollmentId,
    p_stop_reason:   'manual',
  })
  if (error) return { error: error.message }
  return {}
}

export async function setContactStatusFromSeq(
  contactId: string,
  status: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('contacts').update({ prospect_status: status }).eq('id', contactId).eq('user_id', user.id)
  if (error) return { error: error.message }

  if (status === 'refused' || status === 'converted') {
    await supabase.rpc('cancel_contact_sequences', { p_contact_id: contactId, p_stop_reason: status })
  }
  return {}
}

// ─── Mailbox quota (éditable depuis la page séquence) ────────────────────────

export async function updateMailboxQuota(
  identityId: string,
  dailyLimit: number,
  intervalMinutes: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const limit   = Math.max(1, Math.min(500, Math.round(dailyLimit)))
  const seconds = Math.max(60, Math.min(86400, Math.round(intervalMinutes * 60)))

  const { error } = await supabase
    .from('sender_identities')
    .update({ throttle_daily_limit: limit, min_interval_seconds: seconds })
    .eq('id', identityId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return {}
}

export async function addContactTagFromSeq(
  contactId: string,
  tag: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.rpc('add_contact_tag', { p_contact_id: contactId, p_tag: tag.trim() })
  if (error) return { error: error.message }
  return {}
}
