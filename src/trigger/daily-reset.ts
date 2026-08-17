import { schedules } from '@trigger.dev/sdk'
import { createServiceClient } from '@/lib/supabase/server'

// Tourne à 01:00 UTC (02:00 CET) chaque nuit
// Reset throttle_sent_today sur sender_identities.
// NE touche PAS sent_today / daily_volume (propriété du warmup cron).
export const dailyReset = schedules.task({
  id: 'daily-reset',
  cron: '0 1 * * *',
  run: async () => {
    const supabase = createServiceClient()
    const { data: count } = await supabase.rpc('daily_reset_throttle_counters')
    return { reset: count ?? 0 }
  },
})
