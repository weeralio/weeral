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

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Last 14 days
  const since = new Date()
  since.setDate(since.getDate() - 13)
  const sinceStr = since.toISOString().split('T')[0]

  const [
    { data: domains },
    { data: campaigns },
  ] = await Promise.all([
    supabase.from('domains').select('id, domain, status, bounce_rate, complaint_rate, sent_today, daily_limit').eq('user_id', user!.id),
    supabase.from('campaigns').select('id, name, status').eq('user_id', user!.id),
  ])

  const domainIds = (domains ?? []).map(d => d.id)
  const campaignIds = (campaigns ?? []).map(c => c.id)

  const [{ data: warmupLogs }, { data: allContacts }] = await Promise.all([
    domainIds.length > 0
      ? supabase.from('warmup_logs').select('domain_id, date, emails_sent, bounces, complaints').gte('date', sinceStr).in('domain_id', domainIds)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase.from('campaign_contacts').select('campaign_id, status').in('campaign_id', campaignIds)
      : Promise.resolve({ data: [] }),
  ])

  // Build daily totals for the last 14 days
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
      complaints: logs.reduce((s, l) => s + l.complaints, 0),
    }
  })
  const maxSent = Math.max(...dailyTotals.map(d => d.sent), 1)
  const totalSentAll = dailyTotals.reduce((s, d) => s + d.sent, 0)
  const totalBouncesAll = dailyTotals.reduce((s, d) => s + d.bounces, 0)

  // Campaign stats
  type Stat = { total: number; sent: number; pending: number; failed: number }
  const statsMap: Record<string, Stat> = {}
  for (const cc of allContacts ?? []) {
    if (!statsMap[cc.campaign_id]) statsMap[cc.campaign_id] = { total: 0, sent: 0, pending: 0, failed: 0 }
    statsMap[cc.campaign_id].total++
    if (cc.status === 'sent') statsMap[cc.campaign_id].sent++
    else if (cc.status === 'pending') statsMap[cc.campaign_id].pending++
    else if (cc.status === 'failed') statsMap[cc.campaign_id].failed++
  }

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-[#475569] mt-1">Activité des 14 derniers jours</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Emails envoyés (14j)', value: totalSentAll.toLocaleString(), color: 'text-violet-400' },
          { label: 'Bounces (14j)', value: totalBouncesAll.toLocaleString(), color: 'text-red-400' },
          { label: 'Domaines actifs', value: (domains?.filter(d => d.status !== 'blocked').length ?? 0).toString(), color: 'text-emerald-400' },
          { label: 'Campagnes', value: (campaigns?.length ?? 0).toString(), color: 'text-amber-400' },
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
          <CardDescription>Emails envoyés par jour via le warmup automatique</CardDescription>
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
            <span className="text-xs text-[#475569]">{formatDate(days[0])}</span>
            <span className="text-xs text-[#475569]">{formatDate(days[days.length - 1])}</span>
          </div>
        </CardContent>
      </Card>

      {/* Domain performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par domaine</CardTitle>
          <CardDescription>Bounce et plainte actuels — seuils : bounce {'>'} 5%, plainte {'>'} 0.1%</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!domains?.length ? (
            <div className="px-6 py-10 text-center text-[#475569] text-sm">Aucun domaine configuré</div>
          ) : (
            <div className="divide-y divide-[#1e1e3f]">
              {domains.map((d) => {
                const bounceOk = d.bounce_rate <= 2
                const bounceWarn = d.bounce_rate > 2 && d.bounce_rate <= 5
                const bounceDanger = d.bounce_rate > 5
                const complaintDanger = d.complaint_rate > 0.1

                return (
                  <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{d.domain}</p>
                      <p className="text-xs text-[#475569]">{d.sent_today} / {d.daily_limit} aujourd&apos;hui</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`font-medium ${bounceDanger ? 'text-red-400' : bounceWarn ? 'text-amber-400' : 'text-emerald-400'}`}>
                        Bounce {d.bounce_rate.toFixed(2)}%
                      </span>
                      <span className={`font-medium ${complaintDanger ? 'text-red-400' : 'text-emerald-400'}`}>
                        Plainte {d.complaint_rate.toFixed(3)}%
                      </span>
                    </div>
                    <Badge variant={d.status === 'blocked' ? 'blocked' : d.status === 'warmup' ? 'warmup' : 'success'}>
                      {d.status === 'blocked' ? 'Bloqué' : d.status === 'warmup' ? 'Warmup' : 'Actif'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performances des campagnes</CardTitle>
          <CardDescription>
            Taux d&apos;ouverture et de réponse disponibles prochainement. Affichage actuel : envois.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!campaigns?.length ? (
            <div className="px-6 py-10 text-center text-[#475569] text-sm">Aucune campagne créée</div>
          ) : (
            <div className="divide-y divide-[#1e1e3f]">
              {campaigns.map(c => {
                const s = statsMap[c.id] ?? { total: 0, sent: 0, pending: 0, failed: 0 }
                const pct = s.total > 0 ? Math.round((s.sent / s.total) * 100) : 0
                return (
                  <div key={c.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="h-1.5 w-32 bg-[#1e1e3f] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-[#475569]">{s.sent}/{s.total} ({pct}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#475569]">
                      <span className="opacity-50">Ouverture —</span>
                      <span className="opacity-50">Réponse —</span>
                    </div>
                    <Badge variant={c.status === 'running' ? 'running' : c.status === 'blocked' ? 'blocked' : c.status === 'completed' ? 'completed' : 'draft'}>
                      {c.status === 'running' ? 'En cours' : c.status === 'completed' ? 'Terminée' : c.status === 'blocked' ? 'Bloquée' : c.status}
                    </Badge>
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
