import { schedules, tasks } from '@trigger.dev/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import type { outboxDrain } from './outbox-drain'

// Tick toutes les 5 minutes — seul scheduler des envois (plus de Vercel cron pour /api/cron/send)
// Rôle : enqueuer les contacts des campagnes en cours + déclencher un drain par boîte active
export const outboxTick = schedules.task({
  id: 'outbox-tick',
  cron: '*/5 * * * *',
  run: async () => {
    const supabase = createServiceClient()
    let enqueued = 0

    // ── 1. Recovery des sends coincés ──────────────────────────────────────────
    // 'sending' depuis >10 min → pending (worker mort)
    // 'cancelling' depuis >10 min → cancelled (invariant : jamais ressusciter en pending)
    await supabase.rpc('recover_stuck_sends')

    // ── 2. Enqueue les contacts des campagnes en cours ─────────────────────────
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('status', 'running')

    for (const campaign of campaigns ?? []) {
      const { data: count } = await supabase.rpc('enqueue_campaign_sends', {
        p_campaign_id: campaign.id,
      })
      enqueued += (count as number | null) ?? 0

      // Marquer la campagne terminée si plus aucun contact pending
      const { count: remaining } = await supabase
        .from('campaign_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')

      if ((remaining ?? 0) === 0) {
        await supabase
          .from('campaigns')
          .update({ status: 'completed' })
          .eq('id', campaign.id)
          .eq('status', 'running')
      }
    }

    // ── 3. Déclencher un drain par boîte ayant des sends pending ───────────────
    const { data: mailboxRows } = await supabase.rpc('get_mailboxes_with_pending_sends')
    const mailboxIds = (mailboxRows as string[] | null) ?? []

    if (mailboxIds.length > 0) {
      await tasks.batchTrigger<typeof outboxDrain>(
        'outbox-drain',
        mailboxIds.map(mailboxId => ({ payload: { mailboxId } })),
      )
    }

    return { enqueued, drains: mailboxIds.length }
  },
})
