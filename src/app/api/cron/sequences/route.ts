import { createClient } from '@/lib/supabase/server'
import { sendViaProvider } from '@/lib/mailer'
import { NextResponse } from 'next/server'

// Appelé toutes les heures par Trigger.dev (même schedule que /api/cron/send)
// Header requis : Authorization: Bearer <CRON_SECRET>
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  // Fetch enrollments due for sending
  const { data: dueEnrollments } = await supabase
    .from('sequence_enrollments')
    .select(`
      id, sequence_id, contact_id, current_step, sender_identity_id,
      sequences(user_id, name),
      contacts(email, first_name, last_name, company),
      sender_identities(email, display_name, domain_id,
        domains(id, daily_limit, sent_today, status))
    `)
    .eq('status', 'active')
    .lte('next_send_at', now)
    .limit(200)

  if (!dueEnrollments?.length) return NextResponse.json({ ok: true, sent: 0 })

  let totalSent = 0

  for (const enrollment of dueEnrollments) {
    const sequence = Array.isArray(enrollment.sequences) ? enrollment.sequences[0] : enrollment.sequences
    const contact = Array.isArray(enrollment.contacts) ? enrollment.contacts[0] : enrollment.contacts
    const identity = Array.isArray(enrollment.sender_identities) ? enrollment.sender_identities[0] : enrollment.sender_identities
    const domain = Array.isArray(identity?.domains) ? identity.domains[0] : identity?.domains

    if (!contact?.email || !identity?.email || !sequence?.user_id) continue
    if (!domain || domain.status === 'blocked') continue

    // Domain daily limit check
    const remaining = (domain.daily_limit ?? 100) - (domain.sent_today ?? 0)
    if (remaining <= 0) continue

    // Get the current step
    const { data: step } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', enrollment.sequence_id)
      .eq('step_number', enrollment.current_step)
      .single()

    if (!step) {
      // No more steps — mark as completed
      await supabase
        .from('sequence_enrollments')
        .update({ status: 'completed', completed_at: now })
        .eq('id', enrollment.id)
      continue
    }

    // Check send_condition
    if (step.send_condition === 'no_reply') {
      const { count } = await supabase
        .from('sequence_sends')
        .select('*', { count: 'exact', head: true })
        .eq('enrollment_id', enrollment.id)
        .eq('status', 'replied')
      if ((count ?? 0) > 0) {
        // Contact replied — stop sequence
        await supabase
          .from('sequence_enrollments')
          .update({ status: 'replied', completed_at: now })
          .eq('id', enrollment.id)
        continue
      }
    }

    const html = interpolate(step.body_html, contact)
    const subject = interpolate(step.subject, contact)

    try {
      await sendViaProvider(sequence.user_id, {
        from: identity.email,
        fromName: identity.display_name ?? identity.email,
        to: contact.email,
        subject,
        htmlBody: html,
        textBody: step.body_text ? interpolate(step.body_text, contact) : undefined,
      })

      // Get next step to schedule it
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
        nextSendAt = null
        nextStatus = 'completed'
        completedAt = now
      }

      const today = new Date().toISOString().split('T')[0]

      await Promise.all([
        // Log the send
        supabase.from('sequence_sends').insert({
          enrollment_id: enrollment.id,
          step_id: step.id,
          step_number: step.step_number,
          status: 'sent',
        }),
        // Advance enrollment
        supabase.from('sequence_enrollments').update({
          current_step: enrollment.current_step + 1,
          status: nextStatus,
          next_send_at: nextSendAt,
          completed_at: completedAt,
        }).eq('id', enrollment.id),
        // Update domain sent_today
        supabase.from('domains').update({ sent_today: (domain.sent_today ?? 0) + 1 }).eq('id', domain.id),
        // Warmup log
        supabase.rpc('increment_warmup_log', { p_domain_id: domain.id, p_date: today }),
      ])

      totalSent++
    } catch (err) {
      console.error(`[sequences cron] Failed to send enrollment ${enrollment.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, sent: totalSent })
}

function interpolate(
  template: string,
  contact: { first_name?: string | null; last_name?: string | null; company?: string | null },
): string {
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name ?? '')
    .replace(/\{\{last_name\}\}/g, contact.last_name ?? '')
    .replace(/\{\{company\}\}/g, contact.company ?? '')
}
