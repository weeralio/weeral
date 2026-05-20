import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AddDomainForm from './add-domain-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { isWarmupComplete, BOUNCE_RATE_THRESHOLD, COMPLAINT_RATE_THRESHOLD } from '@/lib/warmup'

const WARMUP_DAYS = 14

function getDeliverabilityScore(domain: {
  status: string; bounce_rate: number; complaint_rate: number; warmup_day: number;
}): number {
  if (domain.status === 'blocked') return 0
  let score = 100
  if (domain.bounce_rate > BOUNCE_RATE_THRESHOLD) score -= 40
  else if (domain.bounce_rate > 2) score -= 20
  else if (domain.bounce_rate > 1) score -= 8
  if (domain.complaint_rate > COMPLAINT_RATE_THRESHOLD) score -= 40
  else if (domain.complaint_rate > 0.05) score -= 20
  else if (domain.complaint_rate > 0.02) score -= 8
  if (domain.status !== 'active' && domain.status !== 'warmup') score -= 25
  return Math.max(0, score)
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#34d399' : score >= 55 ? '#fbbf24' : '#f87171'
  const r = 18
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - score / 100)
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#1e1e3f" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

export default async function DomainesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Yesterday for trend
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { data: domains } = await supabase
    .from('domains')
    .select('id, domain, status, warmup_day, daily_limit, sent_today, bounce_rate, complaint_rate, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const domainIds = domains?.map(d => d.id) ?? []

  const { data: yesterdayLogs } = domainIds.length > 0
    ? await supabase
        .from('warmup_logs')
        .select('domain_id, emails_sent')
        .in('domain_id', domainIds)
        .eq('date', yesterdayStr)
    : { data: [] }

  const yesterdayMap = Object.fromEntries(
    (yesterdayLogs ?? []).map(l => [l.domain_id, l.emails_sent])
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Domaines & Warmup</h1>
          <p className="text-sm text-[#475569] mt-1">
            {domains?.length ?? 0} domaine{(domains?.length ?? 0) !== 1 ? 's' : ''} · Santé et progression du warmup
          </p>
        </div>
      </div>

      {/* Add domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connecter un domaine</CardTitle>
          <CardDescription>Ajoute un domaine vérifié dans AWS SES pour commencer le warmup automatique.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddDomainForm />
        </CardContent>
      </Card>

      {/* Domain list */}
      {!domains?.length ? (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#111128] border border-[#1e1e3f] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#3b3b6f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <p className="text-[#94a3b8] font-medium mb-1">Aucun domaine ajouté</p>
            <p className="text-sm text-[#475569]">Connecte ton premier domaine pour démarrer le warmup.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {domains.map((d) => {
            const score = getDeliverabilityScore(d)
            const warmupPct = isWarmupComplete(d.warmup_day)
              ? 100
              : Math.round((Math.min(d.warmup_day, WARMUP_DAYS) / WARMUP_DAYS) * 100)
            const sendPct = d.daily_limit > 0
              ? Math.min(100, Math.round((d.sent_today / d.daily_limit) * 100))
              : 0
            const prevSent = yesterdayMap[d.id] ?? 0
            const trend = d.sent_today > prevSent ? 'up' : d.sent_today < prevSent ? 'down' : 'flat'
            const health = score >= 80 ? 'good' : score >= 55 ? 'warning' : 'danger'

            const statusVariant = d.status === 'blocked' ? 'blocked'
              : d.status === 'warmup' ? 'warmup'
              : d.status === 'active' ? 'success'
              : 'secondary'

            return (
              <Link key={d.id} href={`/dashboard/domaines/${d.id}`} className="block group">
                <Card className="group-hover:border-[#8b5cf6]/35 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Score ring */}
                      <ScoreRing score={score} />

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1">
                          <span className="font-semibold text-white truncate">{d.domain}</span>
                          <Badge variant={statusVariant}>
                            {d.status === 'warmup' && !isWarmupComplete(d.warmup_day) ? `Warmup J${d.warmup_day}/${WARMUP_DAYS}` : d.status === 'blocked' ? 'Bloqué' : d.status === 'active' ? 'Actif' : d.status}
                          </Badge>
                          {health === 'danger' && <span className="text-xs text-red-400 font-medium">⚠ Attention requise</span>}
                        </div>

                        {/* Metrics row */}
                        <div className="flex items-center gap-5 text-xs text-[#94a3b8] mb-4 flex-wrap">
                          <span>
                            Bounce:{' '}
                            <strong className={d.bounce_rate > BOUNCE_RATE_THRESHOLD ? 'text-red-400' : d.bounce_rate > 2 ? 'text-amber-400' : 'text-emerald-400'}>
                              {d.bounce_rate.toFixed(2)}%
                            </strong>
                          </span>
                          <span>
                            Plainte:{' '}
                            <strong className={d.complaint_rate > COMPLAINT_RATE_THRESHOLD ? 'text-red-400' : d.complaint_rate > 0.05 ? 'text-amber-400' : 'text-emerald-400'}>
                              {d.complaint_rate.toFixed(3)}%
                            </strong>
                          </span>
                          <span className="flex items-center gap-1">
                            Aujourd&apos;hui:{' '}
                            <strong className="text-white">{d.sent_today.toLocaleString()}</strong>
                            {' '}/ {d.daily_limit.toLocaleString()}
                            {trend === 'up' && <span className="text-emerald-400">↑</span>}
                            {trend === 'down' && <span className="text-red-400">↓</span>}
                          </span>
                        </div>

                        {/* Progress bars */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex justify-between text-xs text-[#475569] mb-1.5">
                              <span>Envoi du jour</span>
                              <span>{sendPct}%</span>
                            </div>
                            <Progress
                              value={sendPct}
                              indicatorClassName={sendPct > 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-600 to-purple-500'}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-[#475569] mb-1.5">
                              <span>Progression warmup</span>
                              <span>{isWarmupComplete(d.warmup_day) ? 'Terminé ✓' : `${warmupPct}%`}</span>
                            </div>
                            <Progress
                              value={warmupPct}
                              indicatorClassName={isWarmupComplete(d.warmup_day) ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-purple-500'}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg className="w-4 h-4 text-[#3b3b6f] group-hover:text-[#8b5cf6] transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
