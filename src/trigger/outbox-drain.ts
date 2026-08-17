import { task, wait } from '@trigger.dev/sdk'
import { toZonedTime } from 'date-fns-tz'
import { createServiceClient } from '@/lib/supabase/server'
import { sendViaProvider } from '@/lib/mailer'
import { unsubscribeUrl } from '@/lib/tokens'

// Drain par boîte mail : boucle jusqu'à épuisement ou fin de fenêtre/quota.
// Throttle : colonnes throttle_* sur sender_identities.
// Avancement séquence : insère le prochain send après chaque envoi réussi.

const DRAIN_TIMEOUT_MS = 240_000  // 4 min ; 60s de marge avant le maxDuration du task

export const outboxDrain = task({
  id: 'outbox-drain',
  run: async (payload: { mailboxId: string }) => {
    const supabase   = createServiceClient()
    const drainStart = Date.now()
    let   totalSent  = 0

    // ── Boîte + domaine (chargé une fois) ─────────────────────────────────────
    const { data: mailbox } = await supabase
      .from('sender_identities')
      .select('id, email, display_name, user_id, domains!domain_id(id, mailgun_region, status)')
      .eq('id', payload.mailboxId)
      .single()

    if (!mailbox) return { sent: 0, error: 'mailbox_not_found' }

    const domain   = Array.isArray(mailbox.domains) ? mailbox.domains[0] : mailbox.domains
    const domainId = (domain as { id?: string } | null)?.id

    if ((domain as { status: string } | null)?.status === 'blocked') {
      return { sent: 0, error: 'domain_blocked' }
    }

    // ── Boucle de drain ────────────────────────────────────────────────────────
    while (Date.now() - drainStart < DRAIN_TIMEOUT_MS) {

      // Recharger l'état frais du throttle à chaque itération
      const { data: cfg } = await supabase
        .from('sender_identities')
        .select('throttle_daily_limit, throttle_sent_today, throttle_sent_date, next_available_at, min_interval_seconds, jitter_seconds, send_window_enabled, send_window_start, send_window_end, send_timezone, skip_weekend')
        .eq('id', payload.mailboxId)
        .single()

      if (!cfg) break

      const today = new Date().toISOString().split('T')[0]!

      // Filet de sécurité : reset si le cron daily-reset a raté
      if (cfg.throttle_sent_date && cfg.throttle_sent_date < today) {
        await supabase.from('sender_identities')
          .update({ throttle_sent_today: 0, throttle_sent_date: today })
          .eq('id', payload.mailboxId)
        cfg.throttle_sent_today = 0
      }

      // Limite quotidienne
      if ((cfg.throttle_sent_today ?? 0) >= (cfg.throttle_daily_limit ?? 50)) break

      const tz = cfg.send_timezone ?? 'Europe/Paris'

      // Jours ouvrés
      if (cfg.skip_weekend) {
        const day = toZonedTime(new Date(), tz).getDay()
        if (day === 0 || day === 6) break
      }

      // Fenêtre horaire (DST-safe via date-fns-tz)
      if (cfg.send_window_enabled) {
        if (!isWithinWindow(cfg.send_window_start ?? '09:00:00', cfg.send_window_end ?? '18:00:00', tz)) break
      }

      // Intervalle entre envois
      if (cfg.next_available_at) {
        const nextAvailMs = new Date(cfg.next_available_at).getTime() - Date.now()
        if (nextAvailMs > 0) {
          const remainingMs = DRAIN_TIMEOUT_MS - (Date.now() - drainStart)
          if (nextAvailMs >= remainingMs - 10_000) break  // pas assez de temps
          await wait.for({ seconds: Math.ceil(nextAvailMs / 1000) })
        }
      }

      // ── Claim atomique (SKIP LOCKED) ───────────────────────────────────────
      const { data: sends } = await supabase.rpc('claim_send_for_mailbox', { p_mailbox_id: payload.mailboxId })
      const send = (sends as unknown[])?.[0] as SendRow | undefined
      if (!send) break

      // ── Re-check annulation ────────────────────────────────────────────────
      const { data: fresh } = await supabase.from('sends').select('status').eq('id', send.id).single()
      if (fresh?.status === 'cancelling') {
        await supabase.from('sends').update({ status: 'cancelled' }).eq('id', send.id)
        continue
      }

      // ── Vérification de condition (séquences uniquement) ───────────────────
      if (send.source_type === 'sequence' && send.seq_enrollment_id) {
        const [{ data: enrollment }, { data: stepDef }] = await Promise.all([
          supabase.from('seq_enrollment').select('status').eq('id', send.seq_enrollment_id).single(),
          supabase.from('seq_step').select('send_condition').eq('seq_id', send.source_id).eq('step_number', send.step_number).single(),
        ])

        let conditionFailed = false
        if (enrollment && stepDef) {
          if (stepDef.send_condition === 'no_reply' && enrollment.status === 'replied') {
            conditionFailed = true
          }
          if (!conditionFailed && stepDef.send_condition === 'no_open') {
            const { count } = await supabase.from('sends')
              .select('*', { count: 'exact', head: true })
              .eq('seq_enrollment_id', send.seq_enrollment_id).not('opened_at', 'is', null)
            if ((count ?? 0) > 0) conditionFailed = true
          }
          if (!conditionFailed && stepDef.send_condition === 'no_click') {
            const { count } = await supabase.from('sends')
              .select('*', { count: 'exact', head: true })
              .eq('seq_enrollment_id', send.seq_enrollment_id).not('clicked_at', 'is', null)
            if ((count ?? 0) > 0) conditionFailed = true
          }
        }

        if (conditionFailed) {
          const ts = new Date().toISOString()
          await Promise.all([
            supabase.from('sends').update({ status: 'cancelled', last_error: `condition_not_met:${stepDef?.send_condition}` }).eq('id', send.id),
            supabase.from('seq_enrollment').update({ status: 'stopped', stop_reason: 'no_condition', stopped_at: ts }).eq('id', send.seq_enrollment_id),
          ])
          continue
        }
      }

      // ── Contact ────────────────────────────────────────────────────────────
      const { data: contact } = await supabase
        .from('contacts').select('email, first_name, last_name, company, unsubscribed')
        .eq('id', send.contact_id).single()

      if (!contact || contact.unsubscribed) {
        await supabase.from('sends').update({ status: 'cancelled', last_error: 'contact_unsubscribed_or_missing' }).eq('id', send.id)
        if (send.source_type === 'campaign') {
          await supabase.from('campaign_contacts').update({ status: 'failed' })
            .eq('campaign_id', send.source_id).eq('contact_id', send.contact_id).eq('status', 'pending')
        }
        continue
      }

      // ── Envoi ──────────────────────────────────────────────────────────────
      const subject  = interpolate(send.subject,   contact)
      const htmlBody = interpolate(send.body_html, contact)
      const textBody = send.body_text ? interpolate(send.body_text, contact) : undefined

      let msgId: string | null = null
      let sendSucceeded = false

      try {
        msgId = await sendViaProvider(send.user_id, {
          from:           mailbox.email,
          fromName:       mailbox.display_name ?? mailbox.email,
          to:             contact.email,
          replyTo:        send.reply_to ?? undefined,
          subject,
          htmlBody,
          textBody,
          unsubscribeUrl: unsubscribeUrl(send.contact_id, send.source_id),
          mailgunRegion:  (domain as { mailgun_region?: string } | null)?.mailgun_region as 'us' | 'eu' | undefined,
          sendTracking:   { sendId: send.id },
        })
        sendSucceeded = true
      } catch (err) {
        const errMsg     = err instanceof Error ? err.message : String(err)
        const nextStatus = send.attempt_count >= 3 ? 'failed' : 'pending'
        await supabase.from('sends').update({
          status:     nextStatus,
          claimed_at: nextStatus === 'pending' ? null : send.claimed_at,
          last_error: errMsg.slice(0, 500),
        }).eq('id', send.id)
      }

      // Bump next_available_at dans tous les cas (évite le retry immédiat)
      await bumpThrottle(supabase, payload.mailboxId, cfg, sendSucceeded)

      if (!sendSucceeded) continue

      // ── Post-send ──────────────────────────────────────────────────────────
      const now      = new Date().toISOString()
      const todayStr = now.split('T')[0]!

      await Promise.all([
        supabase.from('sends').update({ status: 'sent', sent_at: now, provider_msg_id: msgId!, last_error: null }).eq('id', send.id),
        send.source_type === 'campaign'
          ? supabase.from('campaign_contacts').update({ status: 'sent', sent_at: now })
              .eq('campaign_id', send.source_id).eq('contact_id', send.contact_id)
          : Promise.resolve(),
        domainId
          ? supabase.rpc('increment_warmup_log', { p_domain_id: domainId, p_date: todayStr })
          : Promise.resolve(),
      ])

      // ── Avancement séquence ────────────────────────────────────────────────
      if (send.source_type === 'sequence' && send.seq_enrollment_id) {
        const { data: nextStep } = await supabase
          .from('seq_step').select('step_number, delay_days, subject, body_html, body_text')
          .eq('seq_id', send.source_id).eq('step_number', send.step_number + 1).maybeSingle()

        if (!nextStep) {
          await supabase.from('seq_enrollment')
            .update({ status: 'completed', completed_at: now })
            .eq('id', send.seq_enrollment_id)
        } else {
          const nextScheduled = new Date()
          nextScheduled.setDate(nextScheduled.getDate() + nextStep.delay_days)
          await Promise.all([
            supabase.from('sends').insert({
              user_id:           send.user_id,
              mailbox_id:        send.mailbox_id,
              contact_id:        send.contact_id,
              source_type:       'sequence',
              source_id:         send.source_id,
              step_number:       nextStep.step_number,
              seq_enrollment_id: send.seq_enrollment_id,
              subject:           nextStep.subject,
              body_html:         nextStep.body_html,
              body_text:         nextStep.body_text ?? null,
              reply_to:          send.reply_to,
              scheduled_at:      nextScheduled.toISOString(),
              status:            'pending',
            }),
            supabase.from('seq_enrollment')
              .update({ current_step: nextStep.step_number })
              .eq('id', send.seq_enrollment_id),
          ])
        }
      }

      totalSent++
    }

    return { sent: totalSent }
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ThrottleCfg {
  throttle_daily_limit:  number | null
  throttle_sent_today:   number | null
  throttle_sent_date:    string | null
  next_available_at:     string | null
  min_interval_seconds:  number | null
  jitter_seconds:        number | null
  send_window_enabled:   boolean | null
  send_window_start:     string | null
  send_window_end:       string | null
  send_timezone:         string | null
  skip_weekend:          boolean | null
}

async function bumpThrottle(
  supabase:  ReturnType<typeof createServiceClient>,
  mailboxId: string,
  cfg:       ThrottleCfg,
  success:   boolean,
) {
  const interval  = cfg.min_interval_seconds ?? 300
  const maxJitter = cfg.jitter_seconds       ?? 60
  const jitter    = Math.floor(Math.random() * (maxJitter + 1))
  const nextAvail = new Date(Date.now() + (interval + jitter) * 1000)
  const today     = new Date().toISOString().split('T')[0]!

  await supabase.from('sender_identities').update({
    next_available_at:  nextAvail.toISOString(),
    ...(success
      ? { throttle_sent_today: (cfg.throttle_sent_today ?? 0) + 1, throttle_sent_date: today }
      : {}),
  }).eq('id', mailboxId)
}

function isWithinWindow(windowStart: string, windowEnd: string, tz: string): boolean {
  const zonedNow = toZonedTime(new Date(), tz)
  const h = zonedNow.getHours()
  const m = zonedNow.getMinutes()
  const s = zonedNow.getSeconds()
  const nowSec = h * 3600 + m * 60 + s

  const [sh = 9,  sm = 0] = windowStart.split(':').map(Number)
  const [eh = 18, em = 0] = windowEnd.split(':').map(Number)
  const startSec = sh * 3600 + sm * 60
  const endSec   = eh * 3600 + em * 60  // fin exclusive

  return nowSec >= startSec && nowSec < endSec
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SendRow {
  id:                string
  user_id:           string
  mailbox_id:        string
  contact_id:        string
  source_type:       string
  source_id:         string
  step_number:       number
  seq_enrollment_id: string | null
  subject:           string
  body_html:         string
  body_text:         string | null
  reply_to:          string | null
  scheduled_at:      string
  status:            string
  claimed_at:        string | null
  attempt_count:     number
  last_error:        string | null
  provider_msg_id:   string | null
}

function interpolate(
  template: string,
  contact:  { first_name?: string | null; last_name?: string | null; company?: string | null; email?: string | null },
): string {
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name ?? '')
    .replace(/\{\{last_name\}\}/g,  contact.last_name  ?? '')
    .replace(/\{\{company\}\}/g,    contact.company    ?? '')
    .replace(/\{\{email\}\}/g,      contact.email      ?? '')
}
