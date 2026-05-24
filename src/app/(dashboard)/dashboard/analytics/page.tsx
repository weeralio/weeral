import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function MiniBar({ value, max, color = 'bg-gradient-to-t from-violet-700 to-purple-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-1 h-20 justify-end">
      <div className="w-full flex flex-col justify-end h-16">
        <div
          className={`w-full rounded-sm ${color} transition-all`}
          style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="text-[10px] text-[#475569] tabular-nums">{value}</span>
    </div>
  )
}

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-[#1e1e3f] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-white w-10 text-right tabular-nums shrink-0">{value.toFixed(1)}%</span>
    </div>
  )
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const since = new Date()
  since.setDate(since.getDate() - 13)
  const sinceStr = since.toISOString().split('T')[0]

  const [{ data: domains }, { data: campaigns }] = await Promise.all([
    supabase.from('domains').select('id, domain, status, bounce_rate, complaint_rate, sent_today, daily_limit').eq('user_id', user!.id),
    supabase.from('campaigns').select('id, name, status').eq('user_id', user!.id).order('created_at', { ascending: false }),
  ])

  const domainIds  = (domains ?? []).map(d => d.id)
  const campaignIds = (campaigns ?? []).map(c => c.id)

  const [{ data: warmupLogs }, { data: emailRows }] = await Promise.all([
    domainIds.length > 0
      ? supabase.from('warmup_logs').select('domain_id, date, emails_sent, bounces, complaints').gte('date', sinceStr).in('domain_id', domainIds)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase.from('emails').select('campaign_id, status').in('campaign_id', campaignIds)
      : Promise.resolve({ data: [] }),
  ])

  // ── Daily volume chart ────────────────────────────────────────────────────
  const days: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }

  const dailyTotals = days.map(date => {
    const logs = (warmupLogs ?? []).filter(l => l.date === date)
    return {
      date,
      sent: logs.reduce((s, l) => s + l.emails_sent, 0),
      bounces: logs.reduce((s, l) => s + l.bounces, 0),
    }
  })
  const maxSent       = Math.max(...dailyTotals.map(d => d.sent), 1)
  const totalSentAll  = dailyTotals.reduce((s, d) => s + d.sent, 0)
  const totalBounces  = dailyTotals.reduce((s, d) => s + d.bounces, 0)

  // ── Per-campaign email stats ──────────────────────────────────────────────
  type CmpStat = { total: number; sent: number; opened: number; clicked: number; bounced: number; complained: number }
  const statsMap: Record<string, CmpStat> = {}

  for (const row of emailRows ?? []) {
    if (!statsMap[row.campaign_id]) {
      statsMap[row.campaign_id] = { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 }
    }
    const s = statsMap[row.campaign_id]!
    s.total++
    if (row.status === 'sent')       s.sent++
    if (row.status === 'opened')     { s.sent++; s.opened++ }
    if (row.status === 'clicked')    { s.sent++; s.opened++; s.clicked++ }
    if (row.status === 'bounced')    s.bounced++
    if (row.status === 'complained') s.complained++
  }

  // Global open/click totals
  const totalOpened  = Object.values(statsMap).reduce((s, c) => s + c.opened, 0)
  const totalClicked = Object.values(statsMap).reduce((s, c) => s + c.clicked, 0)
  const totalDelivered = Object.values(statsMap).reduce((s, c) => s + c.sent, 0)
  const globalOpenRate  = totalDelivered > 0 ? (totalOpened  / totalDelivered) * 100 : 0
  const globalClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-[#475569] mt-1">Activité des 14 derniers jours</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Emails envoyés (14j)', value: totalSentAll.toLocaleString(), color: 'text-violet-400' },
          { label: 'Taux d\'ouverture', value: `${globalOpenRate.toFixed(1)}%`, color: 'text-emerald-400' },
          { label: 'Taux de clic', value: `${globalClickRate.toFixed(1)}%`, color: 'text-blue-400' },
          { label: 'Bounces (14j)', value: totalBounces.toLocaleString(), color: 'text-red-400' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-xs text-[#475569] uppercase tracking-wider mb-2">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Volume chart */}
      <Card>
        <CardHeader>
          <CardTitle>Volume d&apos;envoi — 14 derniers jours</CardTitle>
          <CardDescription>Emails envoyés par jour</CardDescription>
        </CardHeader>
        <CardContent>
          {totalSentAll === 0 ? (
            <div className="h-28 flex items-center justify-center text-[#475569] text-sm">
              Aucun envoi enregistré sur cette période
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
              {dailyTotals.map(day => (
                <MiniBar key={day.date} value={day.sent} max={maxSent} />
              ))}
            </div>
          )}
          <div className="flex justify-between mt-3">
            <span className="text-xs text-[#475569]">{formatDate(days[0]!)}</span>
            <span className="text-xs text-[#475569]">{formatDate(days[days.length - 1]!)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Domain performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par domaine</CardTitle>
          <CardDescription>Bounce et plainte — seuils : bounce &gt; 5%, plainte &gt; 0.1%</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!domains?.length ? (
            <div className="px-6 py-10 text-center text-[#475569] text-sm">Aucun domaine configuré</div>
          ) : (
            <div className="divide-y divide-[#1e1e3f]">
              {domains.map((d) => (
                <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{d.domain}</p>
                    <p className="text-xs text-[#475569]">{d.sent_today} / {d.daily_limit} aujourd&apos;hui</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-medium ${d.bounce_rate > 5 ? 'text-red-400' : d.bounce_rate > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      Bounce {d.bounce_rate.toFixed(2)}%
                    </span>
                    <span className={`font-medium ${d.complaint_rate > 0.1 ? 'text-red-400' : 'text-emerald-400'}`}>
                      Plainte {d.complaint_rate.toFixed(3)}%
                    </span>
                  </div>
                  <Badge variant={d.status === 'blocked' ? 'blocked' : d.status === 'warmup' ? 'warmup' : 'success'}>
                    {d.status === 'blocked' ? 'Bloqué' : d.status === 'warmup' ? 'Warmup' : 'Actif'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performances des campagnes</CardTitle>
          <CardDescription>Ouverture et clic basés sur le tracking réel</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!campaigns?.length ? (
            <div className="px-6 py-10 text-center text-[#475569] text-sm">Aucune campagne créée</div>
          ) : (
            <div className="divide-y divide-[#1e1e3f]">
              {campaigns.map(c => {
                const s = statsMap[c.id] ?? { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 }
                const openRate  = s.sent > 0 ? (s.opened  / s.sent) * 100 : 0
                const clickRate = s.sent > 0 ? (s.clicked / s.sent) * 100 : 0
                return (
                  <div key={c.id} className="px-6 py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-sm font-medium text-white flex-1 truncate">{c.name}</p>
                      <div className="flex items-center gap-3 text-xs text-[#475569] shrink-0">
                        <span>{s.sent.toLocaleString()} envoyés</span>
                        {s.bounced > 0 && <span className="text-red-400">{s.bounced} bounces</span>}
                      </div>
                      <Badge variant={c.status === 'running' ? 'running' : c.status === 'blocked' ? 'blocked' : c.status === 'completed' ? 'completed' : 'draft'}>
                        {c.status === 'running' ? 'En cours' : c.status === 'completed' ? 'Terminée' : c.status === 'blocked' ? 'Bloquée' : 'Brouillon'}
                      </Badge>
                    </div>
                    {s.sent > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[#475569] mb-1.5">Ouverture · {s.opened} contacts</p>
                          <RateBar value={openRate} color="bg-gradient-to-r from-emerald-600 to-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs text-[#475569] mb-1.5">Clic · {s.clicked} contacts</p>
                          <RateBar value={clickRate} color="bg-gradient-to-r from-blue-600 to-blue-400" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#3b3b6f]">Pas encore d&apos;envois</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
