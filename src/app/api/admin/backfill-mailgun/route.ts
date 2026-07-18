import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { NextResponse } from 'next/server'

// One-shot backfill : récupère 48h d'events Mailgun et upsert dans warmup_logs.
// Appel : POST /api/admin/backfill-mailgun  Authorization: Bearer <CRON_SECRET>
// Peut être relancé sans risque (upsert idempotent).

type MgEvent = { timestamp: number; event: string; severity?: string }
type MgResponse = { items?: MgEvent[]; paging?: { next?: string } }

async function fetchAllEvents(
  apiKey: string,
  domain: string,
  eventType: string,
  beginTs: number,
  cb: (ev: MgEvent) => void,
): Promise<void> {
  const auth = `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`

  for (const base of ['https://api.mailgun.net', 'https://api.eu.mailgun.net']) {
    let url: string | null =
      `${base}/v3/${domain}/events?event=${eventType}&begin=${beginTs}&ascending=yes&limit=300`
    let regionHit = false

    while (url) {
      const res = await fetch(url, { headers: { Authorization: auth } })

      // Domain not in US region → try EU
      if ((res.status === 404 || res.status === 401) && base === 'https://api.mailgun.net') break

      if (!res.ok) return // skip silently on error

      regionHit = true
      const data = await res.json() as MgResponse
      for (const item of data.items ?? []) cb(item)
      url = (data.items?.length ?? 0) > 0 ? (data.paging?.next ?? null) : null
    }

    if (regionHit) return // found in this region, done
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const beginTs  = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000)

  const { data: configs } = await supabase
    .from('provider_configs')
    .select('user_id, api_key_encrypted')
    .eq('provider', 'mailgun')

  if (!configs?.length) return NextResponse.json({ ok: true, accounts: 0, message: 'Aucun compte Mailgun configuré' })

  type DayStat = { sent: number; bounces: number; complaints: number }
  const summary: { domain: string; days: number; totalSent: number; totalBounces: number; totalComplaints: number }[] = []

  for (const cfg of configs) {
    const apiKey = decrypt(cfg.api_key_encrypted)

    const { data: domains } = await supabase
      .from('domains')
      .select('id, domain')
      .eq('user_id', cfg.user_id)

    if (!domains?.length) continue

    for (const dom of domains) {
      const byDate: Record<string, DayStat> = {}

      const touch = (ts: number): DayStat => {
        const date = new Date(ts * 1000).toISOString().split('T')[0]!
        if (!byDate[date]) byDate[date] = { sent: 0, bounces: 0, complaints: 0 }
        return byDate[date]!
      }

      await fetchAllEvents(apiKey, dom.domain, 'accepted',  beginTs, ev => { touch(ev.timestamp).sent++ })
      await fetchAllEvents(apiKey, dom.domain, 'failed',    beginTs, ev => { if (ev.severity === 'permanent') touch(ev.timestamp).bounces++ })
      await fetchAllEvents(apiKey, dom.domain, 'complained', beginTs, ev => { touch(ev.timestamp).complaints++ })

      let upserted = 0
      let totalSent = 0, totalBounces = 0, totalComplaints = 0

      for (const [date, stats] of Object.entries(byDate)) {
        // Upsert : Mailgun est source de vérité → on écrase les valeurs existantes
        await supabase.from('warmup_logs').upsert(
          { domain_id: dom.id, date, emails_sent: stats.sent, bounces: stats.bounces, complaints: stats.complaints },
          { onConflict: 'domain_id,date' },
        )
        upserted++
        totalSent       += stats.sent
        totalBounces    += stats.bounces
        totalComplaints += stats.complaints
      }

      summary.push({ domain: dom.domain, days: upserted, totalSent, totalBounces, totalComplaints })
    }
  }

  return NextResponse.json({ ok: true, accounts: configs.length, summary })
}

export const GET = POST
