import { schedules } from '@trigger.dev/sdk/v3'

// Tourne toutes les heures pour envoyer les emails des campagnes en cours
export const sendTask = schedules.task({
  id: 'hourly-send',
  cron: '0 * * * *',
  run: async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    const secret = process.env.CRON_SECRET

    const response = await fetch(`${baseUrl}/api/cron/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    })

    const result = await response.json()
    return result
  },
})
