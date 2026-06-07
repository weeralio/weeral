import { createServiceClient } from '@/lib/supabase/server'
import {
  getDailyVolumeForMailbox,
  getContentType,
  requiresControlledBoxes,
  getEffectiveVolume,
  checkMonitoring,
  canResume,
  SUSPENSION_COOLDOWN_DAYS,
  isWarmupComplete,
  type SuspensionStep,
  type MailboxMetrics,
} from '@/lib/warmup'
import { sendViaProvider } from '@/lib/mailer'
import { NextResponse } from 'next/server'

// ─── Warmup send helpers ──────────────────────────────────────────────────────

type SendJob = {
  mailboxId:    string
  userId:       string
  domainId:     string
  email:        string
  displayName:  string | null
  warmupDay:    number
  volume:       number
}

async function processWarmupSend(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  job: SendJob,
): Promise<number> {
  const phase =
    job.warmupDay <= 8  ? 'j4_j8' :
    job.warmupDay === 9 ? 'j9' : 'j10_j14'

  // Find active warmup campaign for this mailbox
  const { data: campaigns } = await supabase
    .from('warmup_campaigns')
    .select('id, list_ids, mailbox_ids, cta_url')
    .eq('user_id', job.userId)
    .eq('status', 'active')
    .contains('mailbox_ids', [job.mailboxId])
    .limit(1)

  const campaign = campaigns?.[0]
  if (!campaign) return 0

  // Get mailbox index within the campaign to pick the right variant
  const mailboxIds = campaign.mailbox_ids as string[]
  const mailboxIndex = mailboxIds.indexOf(job.mailboxId)

  // Get available messages for this phase
  const { data: msgs } = await supabase
    .from('warmup_messages')
    .select('id, subject, body_html, variant_index')
    .eq('warmup_campaign_id', campaign.id)
    .eq('phase', phase)
    .order('variant_index')

  if (!msgs?.length) return 0

  // Pick variant based on mailbox position (round-robin)
  const msg = msgs[mailboxIndex % msgs.length]
  if (!msg) return 0

  // Get already-sent contact IDs for this mailbox
  const { data: sentRows } = await supabase
    .from('warmup_sends')
    .select('contact_id')
    .eq('warmup_campaign_id', campaign.id)
    .eq('mailbox_id', job.mailboxId)

  const sentIds = (sentRows ?? []).map((r: { contact_id: string }) => r.contact_id)

  // Get unsent contacts from configured lists
  const listIds = campaign.list_ids as string[]
  let query

  if (listIds.length > 0) {
    let membersQuery = supabase
      .from('contact_list_members')
      .select('contact_id, contacts!inner(id, email, first_name, last_name, company, unsubscribed)')
      .in('list_id', listIds)
      .eq('contacts.unsubscribed', false)
      .limit(job.volume)
    if (sentIds.length > 0) {
      membersQuery = membersQuery.not('contact_id', 'in', `(${sentIds.join(',')})`)
    }
    const { data: members } = await membersQuery
    query = members
  } else {
    // All contacts
    let q = supabase
      .from('contacts')
      .select('id, email, first_name, last_name, company')
      .eq('user_id', job.userId)
      .eq('unsubscribed', false)
      .limit(job.volume)
    if (sentIds.length > 0) {
      q = q.not('id', 'in', `(${sentIds.join(',')})`)
    }
    const { data } = await q
    query = data?.map((c: { id: string; email: string; first_name: string | null; last_name: string | null; company: string | null }) => ({ contact_id: c.id, contacts: c }))
  }

  const contactRows = query ?? []
  if (!contactRows.length) return 0

  let sent = 0
  for (const row of contactRows) {
    const contactRaw = row.contacts ?? row
    const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw
    if (!contact?.email) continue

    const subject = interpolateWarmup(msg.subject, contact)
    const bodyHtml = interpolateWarmup(msg.body_html, contact)

    try {
      await sendViaProvider(job.userId, {
        from:       job.email,
        fromName:   job.displayName ?? job.email,
        to:         contact.email,
        subject,
        htmlBody:   bodyHtml,
      })

      await supabase.from('warmup_sends').insert({
        warmup_campaign_id: campaign.id,
        mailbox_id:         job.mailboxId,
        contact_id:         row.contact_id ?? contact.id,
        user_id:            job.userId,
        warmup_day:         job.warmupDay,
      })

      sent++
    } catch (err) {
      console.error(`[warmup-send] Failed to send to ${contact.email}:`, err)
    }
  }

  // sent_today was reset to 0 in step E before sends run, so absolute assignment is correct
  if (sent > 0) {
    await supabase
      .from('sender_identities')
      .update({ sent_today: sent })
      .eq('id', job.mailboxId)
  }

  return sent
}

function interpolateWarmup(
  template: string,
  contact: { first_name?: string | null; last_name?: string | null; company?: string | null },
): string {
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name ?? '')
    .replace(/\{\{last_name\}\}/g,  contact.last_name  ?? '')
    .replace(/\{\{company\}\}/g,    contact.company    ?? '')
}

// Cron : 5h UTC chaque jour via Trigger.dev
// Authorization: Bearer <CRON_SECRET>

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Reset domains.sent_today once per day (warmup runs at 5h UTC, before send/sequences at 8h)
  await supabase.from('domains').update({ sent_today: 0 }).gt('sent_today', 0)

  // ── 1. Fetch all active mailboxes with warmup state ────────────────────────
  const { data: mailboxes, error: mbError } = await supabase
    .from('sender_identities')
    .select(`
      id, email, display_name, user_id, domain_id,
      warmup_day, warmup_status, daily_volume,
      hard_bounce_rate, soft_bounce_rate, open_rate, click_rate,
      complaint_rate, unsub_rate,
      suspension_step, suspended_until, ses_verified,
      domains!inner(id, status, user_id)
    `)
    .in('warmup_status', ['waiting', 'resting', 'active', 'restricted', 'resuming'])

  if (mbError) return NextResponse.json({ error: mbError.message }, { status: 500 })

  // ── 2. Per-user: count controlled reply boxes ──────────────────────────────
  const userIds = [...new Set((mailboxes ?? []).map(m => m.user_id))]
  const replyBoxMap: Record<string, number> = {}

  if (userIds.length > 0) {
    const { data: replyBoxes } = await supabase
      .from('warmup_reply_boxes')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_active', true)

    for (const rb of replyBoxes ?? []) {
      replyBoxMap[rb.user_id] = (replyBoxMap[rb.user_id] ?? 0) + 1
    }
  }

  // ── 3. Fetch yesterday's events for open/click drop detection ─────────────
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const mailboxIds = (mailboxes ?? []).map(m => m.id)
  const { data: prevEvents } = mailboxIds.length > 0
    ? await supabase
        .from('warmup_mailbox_events')
        .select('mailbox_id, open_rate, click_rate, status')
        .in('mailbox_id', mailboxIds)
        .eq('date', yesterdayStr)
    : { data: [] }

  const prevEventMap = Object.fromEntries(
    (prevEvents ?? []).map(e => [e.mailbox_id, e])
  )

  // ── 4. Fetch consecutive low-performance counts ────────────────────────────
  const { data: recentEvents } = mailboxIds.length > 0
    ? await supabase
        .from('warmup_mailbox_events')
        .select('mailbox_id, open_rate, click_rate, status')
        .in('mailbox_id', mailboxIds)
        .in('status', ['completed'])
        .gte('date', new Date(Date.now() - 3 * 86400_000).toISOString().split('T')[0])
        .order('date', { ascending: false })
    : { data: [] }

  // Group by mailbox
  type RecentEvent = { mailbox_id: string; open_rate: number | null; click_rate: number | null; status: string }
  const recentByMailbox: Record<string, RecentEvent[]> = {}
  for (const ev of (recentEvents as RecentEvent[] | null) ?? []) {
    if (!recentByMailbox[ev.mailbox_id]) recentByMailbox[ev.mailbox_id] = []
    recentByMailbox[ev.mailbox_id]!.push(ev)
  }

  // ── 5. Process each mailbox ────────────────────────────────────────────────
  const stats = { processed: 0, resting: 0, suspended: 0, restricted: 0, active: 0, alerts: 0, emailsSent: 0 }
  // Supabase builders are thenables but not typed as Promise<unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbUpdates: PromiseLike<any>[] = []
  const sendJobs: SendJob[] = []

  for (const mailbox of mailboxes ?? []) {
    const nextDay = (mailbox.warmup_day ?? 1) + 1

    // ─── A. Handle resumption ──────────────────────────────────────────────
    if (mailbox.warmup_status === 'resuming') {
      const suspendedUntil = mailbox.suspended_until ? new Date(mailbox.suspended_until) : null
      if (!canResume(suspendedUntil)) {
        stats.suspended++
        continue  // Still cooling down
      }
      // Resume: reset to restricted, knock back 5 days as warmup restart
      const resumeDay = Math.max(1, (mailbox.warmup_day ?? 1) - 5)
      dbUpdates.push(
        supabase.from('sender_identities').update({
          warmup_status: 'active',
          warmup_day: resumeDay,
          suspension_step: 0,
          suspended_until: null,
          suspension_reason: null,
          daily_volume: getDailyVolumeForMailbox(resumeDay),
          sent_today: 0,
          last_warmup_at: new Date().toISOString(),
        }).eq('id', mailbox.id)
      )
      dbUpdates.push(insertAlert(supabase, mailbox.id, mailbox.domain_id, mailbox.user_id, {
        alert_level: 'resumed',
        metric: 'system',
        metric_value: 0,
        threshold: 0,
        message: `Reprise du warmup depuis le jour ${resumeDay}`,
        recommendation: 'Surveillance renforcée pendant les 7 premiers jours de reprise.',
      }))
      stats.active++
      continue
    }

    // ─── B. Rest period J1–J3 ─────────────────────────────────────────────
    if (nextDay <= 3) {
      dbUpdates.push(
        supabase.from('sender_identities').update({
          warmup_status: 'resting',
          warmup_day: nextDay,
          daily_volume: 0,
          sent_today: 0,
        }).eq('id', mailbox.id)
      )
      dbUpdates.push(upsertEvent(supabase, {
        mailbox_id: mailbox.id,
        domain_id: mailbox.domain_id,
        user_id: mailbox.user_id,
        date: today,
        warmup_day: nextDay,
        planned_volume: 0,
        status: 'skipped',
        skip_reason: 'resting',
      }))
      stats.resting++
      continue
    }

    // ─── C. Monitoring check ───────────────────────────────────────────────
    const prev = prevEventMap[mailbox.id]
    const recent = recentByMailbox[mailbox.id] ?? []

    const consecutiveLowOpens = recent.filter(e => (e.open_rate ?? 0) < 5).length
    const consecutiveLowClicks = recent.filter(e => (e.click_rate ?? 0) < 0.5).length

    const metrics: MailboxMetrics = {
      hard_bounce_rate:      mailbox.hard_bounce_rate ?? 0,
      soft_bounce_rate:      mailbox.soft_bounce_rate ?? 0,
      complaint_rate:        mailbox.complaint_rate ?? 0,
      unsub_rate:            mailbox.unsub_rate ?? 0,
      open_rate:             mailbox.open_rate ?? 0,
      click_rate:            mailbox.click_rate ?? 0,
      open_rate_previous:    prev?.open_rate ?? undefined,
      click_rate_previous:   prev?.click_rate ?? undefined,
      consecutive_low_opens: consecutiveLowOpens,
      consecutive_low_clicks: consecutiveLowClicks,
      current_step:          (mailbox.suspension_step ?? 0) as SuspensionStep,
    }

    const monitoringResult = checkMonitoring(metrics)

    if (monitoringResult) {
      stats.alerts++
      const newStep = monitoringResult.nextStep

      // Write alert to DB
      dbUpdates.push(insertAlert(supabase, mailbox.id, mailbox.domain_id, mailbox.user_id, {
        alert_level: monitoringResult.level,
        metric: monitoringResult.metric,
        metric_value: monitoringResult.value,
        threshold: monitoringResult.threshold,
        message: monitoringResult.message,
        recommendation: monitoringResult.recommendation,
      }))

      // Also create ai_notification for the user
      dbUpdates.push(
        supabase.from('ai_notifications').insert({
          user_id: mailbox.user_id,
          type: newStep >= 3 ? 'alert' : newStep >= 2 ? 'warning' : 'tip',
          title: newStep >= 3 ? `⛔ ${mailbox.email} suspendu` : newStep >= 2 ? `⚠ ${mailbox.email} restreint` : `📊 Alerte warmup — ${mailbox.email}`,
          message: monitoringResult.message,
          action_label: 'Voir le détail',
          action_href: `/dashboard/domaines/${mailbox.domain_id}`,
        })
      )

      if (newStep >= 3) {
        // Suspended: stop sends, set cooldown
        const suspendedUntil = new Date()
        suspendedUntil.setDate(suspendedUntil.getDate() + SUSPENSION_COOLDOWN_DAYS)
        dbUpdates.push(
          supabase.from('sender_identities').update({
            warmup_status: 'suspended',
            suspension_step: newStep,
            suspended_until: suspendedUntil.toISOString(),
            suspension_reason: monitoringResult.message,
            daily_volume: 0,
            sent_today: 0,
          }).eq('id', mailbox.id)
        )
        dbUpdates.push(upsertEvent(supabase, {
          mailbox_id: mailbox.id, domain_id: mailbox.domain_id, user_id: mailbox.user_id,
          date: today, warmup_day: nextDay, planned_volume: 0,
          status: 'skipped', skip_reason: 'suspended',
        }))
        stats.suspended++
        continue
      } else {
        // Alert (step 1) or Restricted (step 2): update step only, continue processing
        dbUpdates.push(
          supabase.from('sender_identities').update({ suspension_step: newStep }).eq('id', mailbox.id)
        )
        if (newStep >= 2) stats.restricted++
      }
    } else if ((mailbox.suspension_step ?? 0) > 0) {
      // Metrics back to normal — downgrade step by 1
      const clearedStep = Math.max(0, (mailbox.suspension_step ?? 0) - 1) as SuspensionStep
      dbUpdates.push(
        supabase.from('sender_identities').update({ suspension_step: clearedStep }).eq('id', mailbox.id)
      )
    }

    // ─── D. Compute today's volume ─────────────────────────────────────────
    const planned = getDailyVolumeForMailbox(nextDay, mailbox.daily_volume ?? 5)
    const suspStep = (monitoringResult?.nextStep ?? mailbox.suspension_step ?? 0) as SuspensionStep
    const effective = getEffectiveVolume(planned, suspStep)
    const contentType = getContentType(nextDay)
    const needsControlled = requiresControlledBoxes(nextDay)
    const controlledBoxCount = replyBoxMap[mailbox.user_id] ?? 0

    // Warn if controlled boxes needed but missing
    if (needsControlled && controlledBoxCount === 0) {
      dbUpdates.push(insertAlert(supabase, mailbox.id, mailbox.domain_id, mailbox.user_id, {
        alert_level: 'info',
        metric: 'controlled_boxes',
        metric_value: 0,
        threshold: 1,
        message: `Boîtes de contrôle manquantes pour ${mailbox.email}`,
        recommendation: 'Ajoute au moins 1 boîte de contrôle pour optimiser la délivrabilité du warmup J4–J11.',
      }))
    }

    const controlledPct = needsControlled && controlledBoxCount > 0 ? 50 : 0
    const newStatus = isWarmupComplete(nextDay) ? 'completed' : 'active'

    // ─── E. Advance mailbox to next day ───────────────────────────────────
    dbUpdates.push(
      supabase.from('sender_identities').update({
        warmup_day:    nextDay,
        warmup_status: newStatus,
        daily_volume:  effective,
        sent_today:    0,
        last_warmup_at: new Date().toISOString(),
      }).eq('id', mailbox.id)
    )

    // ─── E2. Queue email sends ─────────────────────────────────────────────
    if (effective > 0 && newStatus !== 'completed') {
      sendJobs.push({
        mailboxId:   mailbox.id,
        userId:      mailbox.user_id,
        domainId:    mailbox.domain_id,
        email:       mailbox.email,
        displayName: (mailbox as { display_name?: string | null }).display_name ?? null,
        warmupDay:   nextDay,
        volume:      effective,
      })
    }

    // ─── F. Create today's event record ───────────────────────────────────
    dbUpdates.push(upsertEvent(supabase, {
      mailbox_id:      mailbox.id,
      domain_id:       mailbox.domain_id,
      user_id:         mailbox.user_id,
      date:            today,
      warmup_day:      nextDay,
      planned_volume:  effective,
      controlled_pct:  controlledPct,
      content_type:    contentType,
      ab_variant:      nextDay >= 10 ? (Math.random() < 0.5 ? 'A' : 'B') : null,
      status:          'pending',
    }))

    stats.active++
    stats.processed++
  }

  // ── 6. Domain-level: check if multiple mailboxes suspended → domain suspend ─
  // Group suspended mailboxes by domain
  const suspendedByDomain: Record<string, string[]> = {}
  for (const mb of mailboxes ?? []) {
    if (mb.warmup_status === 'suspended' || (mb.suspension_step ?? 0) >= 3) {
      if (!suspendedByDomain[mb.domain_id]) suspendedByDomain[mb.domain_id] = []
      suspendedByDomain[mb.domain_id]!.push(mb.id)
    }
  }

  // Domain-level counts
  const domainMailboxCount: Record<string, number> = {}
  for (const mb of mailboxes ?? []) {
    domainMailboxCount[mb.domain_id] = (domainMailboxCount[mb.domain_id] ?? 0) + 1
  }

  for (const [domainId, suspendedIds] of Object.entries(suspendedByDomain)) {
    const total = domainMailboxCount[domainId] ?? 1
    if (suspendedIds.length / total >= 0.5) {
      // More than 50% of mailboxes suspended → domain step 4
      const domainMailbox = mailboxes?.find(m => m.domain_id === domainId)
      if (domainMailbox) {
        dbUpdates.push(
          supabase.from('domains').update({ status: 'blocked', blocked_reason: `${suspendedIds.length}/${total} boîtes suspendues` }).eq('id', domainId)
        )
        dbUpdates.push(insertAlert(supabase, null, domainId, domainMailbox.user_id, {
          alert_level: 'domain_suspended',
          metric: 'suspended_mailboxes',
          metric_value: suspendedIds.length,
          threshold: Math.ceil(total * 0.5),
          message: `Domaine suspendu : ${suspendedIds.length}/${total} boîtes en échec`,
          recommendation: 'Audit complet requis : vérification DNS, qualité de liste, réputation IP. Contacte le support si le problème persiste.',
        }))
      }
    }
  }

  await Promise.allSettled(dbUpdates)

  // ── 7. Mark domains as warmed_up when all mailboxes reach J14 ─────────────
  const completedByDomain: Record<string, string> = {}
  for (const mb of mailboxes ?? []) {
    if (mb.warmup_status === 'completed' || (mb.warmup_day ?? 0) >= 14) {
      completedByDomain[mb.domain_id] = mb.user_id
    }
  }
  for (const [domainId, userId] of Object.entries(completedByDomain)) {
    const allForDomain = (mailboxes ?? []).filter(m => m.domain_id === domainId)
    const allComplete  = allForDomain.every(m => (m.warmup_day ?? 0) >= 14 || m.warmup_status === 'completed')
    if (allComplete && allForDomain.length > 0) {
      await supabase
        .from('domains')
        .update({ status: 'warmed_up' })
        .eq('id', domainId)
        .neq('status', 'blocked')
        .neq('status', 'warmed_up')
      try {
        await supabase.from('ai_notifications').insert({
          user_id:      userId,
          type:         'tip',
          title:        'Domaine warmé avec succès',
          message:      `Le warmup de ton domaine est terminé. Tu peux maintenant lancer tes campagnes cold email.`,
          action_label: 'Voir le domaine',
          action_href:  `/dashboard/domaines/${domainId}`,
        })
      } catch { /* notification non critique */ }
    }
  }

  // ── 8. Execute warmup email sends ─────────────────────────────────────────
  const sentPerMailbox: Record<string, number> = {}
  for (const job of sendJobs) {
    const sent = await processWarmupSend(supabase, job)
    stats.emailsSent += sent
    sentPerMailbox[job.mailboxId] = sent
  }

  // Update actual_volume and status on events
  if (sendJobs.length > 0) {
    for (const job of sendJobs) {
      const actualSent = sentPerMailbox[job.mailboxId] ?? 0
      await supabase
        .from('warmup_mailbox_events')
        .update({
          actual_volume: actualSent,
          status: actualSent > 0 ? 'completed' : 'skipped',
          skip_reason: actualSent === 0 ? 'no_contacts' : null,
          completed_at: new Date().toISOString(),
        })
        .eq('mailbox_id', job.mailboxId)
        .eq('date', today)
        .eq('status', 'pending')
    }
  }

  return NextResponse.json({ ok: true, date: today, stats })
}

export const GET = POST

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

function insertAlert(
  supabase: SupabaseClient,
  mailboxId: string | null,
  domainId: string,
  userId: string,
  data: {
    alert_level: string; metric: string; metric_value: number; threshold: number;
    message: string; recommendation?: string;
  }
) {
  return supabase.from('warmup_alerts').insert({
    mailbox_id:     mailboxId,
    domain_id:      domainId,
    user_id:        userId,
    alert_level:    data.alert_level,
    metric:         data.metric,
    metric_value:   data.metric_value,
    threshold:      data.threshold,
    message:        data.message,
    recommendation: data.recommendation ?? null,
  })
}

function upsertEvent(
  supabase: SupabaseClient,
  data: {
    mailbox_id: string; domain_id: string; user_id: string; date: string;
    warmup_day: number; planned_volume: number; status: string;
    skip_reason?: string | null; controlled_pct?: number | null;
    content_type?: string | null; ab_variant?: string | null;
  }
) {
  return supabase.from('warmup_mailbox_events').upsert({
    mailbox_id:     data.mailbox_id,
    domain_id:      data.domain_id,
    user_id:        data.user_id,
    date:           data.date,
    warmup_day:     data.warmup_day,
    planned_volume: data.planned_volume,
    actual_volume:  0,
    status:         data.status,
    skip_reason:    data.skip_reason ?? null,
    controlled_pct: data.controlled_pct ?? null,
    content_type:   data.content_type ?? null,
    ab_variant:     data.ab_variant ?? null,
  }, { onConflict: 'mailbox_id,date' })
}
