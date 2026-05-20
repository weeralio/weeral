import { schedules } from '@trigger.dev/sdk/v3'

// Tourne tous les jours à 5h du matin UTC
// Avance le warmup, reset sent_today, bloque si seuils dépassés
export const warmupTask = schedules.task({
  id: 'daily-warmup',
  cron: '0 5 * * *',
  run: async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    const secret = process.env.CRON_SECRET

    const response = await fetch(`${baseUrl}/api/cron/warmup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    })

    const result = await response.json()
    return result
  },
})
