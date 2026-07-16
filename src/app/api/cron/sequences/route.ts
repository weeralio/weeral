import { createServiceClient } from '@/lib/supabase/server'
import { sendViaProvider } from '@/lib/mailer'
import { unsubscribeUrl } from '@/lib/tokens'
import { NextResponse } from 'next/server'

// Appelé toutes les heures par Vercel cron (vercel.json)
// Header requis : Authorization: Bearer <CRON_SECRET>
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data: dueEnrollments } = await supabase
    .from('sequence_enrollments')
    .select(`
      id, sequence_id, contact_id, current_step, sender_identity_id,
      sequences(user_id, name),
      contacts(email, first_name, last_name, company, unsubscribed),
      sender_identities(email, display_name, domain_id,
        domains(id, daily_limit, sent_today, status))
    `)
    .eq('status', 'active')
    .lte('next_send_at', now)
    .limit(200)

  if (!dueEnrollments?.length) return NextResponse.json({ ok: true, sent: 0 })

  let totalSent = 0
  const domainSentAdded: Record<string, number> = {}
  const userProviders: Record<string, string | null> = {}

  for (const enrollment of dueEnrollments) {
    const sequence = Array.isArray(enrollment.sequences) ? enrollment.sequences[0] : enrollment.sequences
    const contact  = Array.isArray(enrollment.contacts)  ? enrollment.contacts[0]  : enrollment.contacts
    const identity = Array.isArray(enrollment.sender_identities) ? enrollment.sender_identities[0] : enrollment.sender_identities
    const domain   = Array.isArray(identity?.domains) ? identity.domains[0] : identity?.domains

    if (!contact?.email || !identity?.email || !sequence?.user_id) continue

    if (contact.unsubscribed) {
      await supabase.from('sequence_enrollments')
        .update({ status: 'completed', completed_at: now })
        .eq('id', enrollment.id)
      continue
    }

    if (!domain || domain.status === 'blocked') continue

    const alreadySentThisRun = domainSentAdded[domain.id] ?? 0
    const remaining = (domain.daily_limit ?? 100) - (domain.sent_today ?? 0) - alreadySentThisRun
    if (remaining <= 0) continue

    const { data: step } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', enrollment.sequence_id)
      .eq('step_number', enrollment.current_step)
      .single()

    if (!step) {
      await supabase.from('sequence_enrollments')
        .update({ status: 'completed', completed_at: now })
        .eq('id', enrollment.id)
      continue
    }

    // ── Vérification des conditions d'envoi ────────────────────────────────────

    if (step.send_condition === 'no_reply') {
      const { count } = await supabase
        .from('sequence_sends')
        .select('*', { count: 'exact', head: true })
        .eq('enrollment_id', enrollment.id)
        .eq('status', 'replied')
      if ((count ?? 0) > 0) {
        await supabase.from('sequence_enrollments')
          .update({ status: 'replied', completed_at: now })
          .eq('id', enrollment.id)
        continue
      }
    }

    if (step.send_condition === 'no_open') {
      const { count } = await supabase
        .from('sequence_sends')
        .select('*', { count: 'exact', head: true })
        .eq('enrollment_id', enrollment.id)
        .not('opened_at', 'is', null)
      if ((count ?? 0) > 0) {
        // Contact a ouvert un email → il est engagé, on arrête la relance
        await supabase.from('sequence_enrollments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', enrollment.id)
        continue
      }
    }

    if (step.send_condition === 'no_click') {
      const { count } = await supabase
        .from('sequence_sends')
        .select('*', { count: 'exact', head: true })
        .eq('enrollment_id', enrollment.id)
        .not('clicked_at', 'is', null)
      if ((count ?? 0) > 0) {
        // Contact a cliqué → il est engagé, on arrête la relance
        await supabase.from('sequence_enrollments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', enrollment.id)
        continue
      }
    }

    // ── Envoi ──────────────────────────────────────────────────────────────────

    const html    = interpolate(step.body_html, contact)
    const subject = interpolate(step.subject, contact)

    if (!(sequence.user_id in userProviders)) {
      const { data: cfg } = await supabase
        .from('provider_configs')
        .select('id')
        .eq('user_id', sequence.user_id)
        .eq('provider', 'mailgun')
        .maybeSingle()
      userProviders[sequence.user_id] = cfg ? 'mailgun' : null
    }

    const senderDomain = identity.email.split('@')[1]
    const replyTo = userProviders[sequence.user_id] === 'mailgun'
      ? `r+${enrollment.id}@reply.${senderDomain}`
      : undefined

    try {
      await sendViaProvider(sequence.user_id, {
        from:     identity.email,
        fromName: identity.display_name ?? identity.email,
        to:       contact.email,
        replyTo,
        subject,
        htmlBody:       html,
        textBody:       step.body_text ? interpolate(step.body_text, contact) : undefined,
        unsubscribeUrl: unsubscribeUrl(enrollment.contact_id, enrollment.sequence_id),
        // enrollment.id comme campaignId pour le tracking open/click
        tracking: { contactId: enrollment.contact_id, campaignId: enrollment.id },
      })

      const { data: nextStep } = await supabase
        .from('sequence_steps')
        .select('step_number, delay_days')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_number', enrollment.current_step + 1)
        .single()

      let nextStatus: string
      let nextSendAt: string | null
      let completedAt: string | null = null

      if (nextStep) {
        const dt = new Date()
        dt.setDate(dt.getDate() + (nextStep.delay_days ?? 1))
        nextSendAt = dt.toISOString()
        nextStatus = 'active'
      } else {
        nextSendAt  = null
        nextStatus  = 'completed'
        completedAt = now
      }

      await Promise.all([
        supabase.from('sequence_sends').insert({
          enrollment_id: enrollment.id,
          step_id:       step.id,
          step_number:   step.step_number,
          status:        'sent',
        }),
        supabase.from('sequence_enrollments').update({
          current_step: enrollment.current_step + 1,
          status:       nextStatus,
          next_send_at: nextSendAt,
          completed_at: completedAt,
        }).eq('id', enrollment.id),
      ])

      domainSentAdded[domain.id] = (domainSentAdded[domain.id] ?? 0) + 1
      totalSent++
    } catch (err) {
      console.error(`[sequences cron] Failed enrollment ${enrollment.id}:`, err)
    }
  }

  // Mise à jour sent_today par domaine
  await Promise.all(
    Object.entries(domainSentAdded).map(([domainId, added]) => {
      const enrollment = dueEnrollments.find(e => {
        const id = Array.isArray(e.sender_identities) ? e.sender_identities[0] : e.sender_identities
        const d  = Array.isArray(id?.domains) ? id.domains[0] : id?.domains
        return d?.id === domainId
      })
      const identity   = enrollment ? (Array.isArray(enrollment.sender_identities) ? enrollment.sender_identities[0] : enrollment.sender_identities) : null
      const domainData = identity   ? (Array.isArray(identity.domains) ? identity.domains[0] : identity.domains) : null
      return supabase.from('domains')
        .update({ sent_today: (domainData?.sent_today ?? 0) + added })
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
