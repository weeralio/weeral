import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import LineChart from '@/components/charts/line-chart'
import { BOUNCE_RATE_THRESHOLD, COMPLAINT_RATE_THRESHOLD } from '@/lib/warmup'

function AlertIcon({ variant }: { variant: 'danger' | 'warning' | 'info' }) {
  if (variant === 'danger') return <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  if (variant === 'warning') return <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  return <svg className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}

const PHASE_INFO: Record<string, { emoji: string; name: string; color: string; bg: string; days: string }> = {
  waiting:    { emoji: '⏳', name: 'En attente',    color: 'text-[#475569]',   bg: 'bg-[#1e1e3f]',      days: '' },
  resting:    { emoji: '🌙', name: 'Silence',       color: 'text-slate-400',   bg: 'bg-slate-800/40',   days: 'J1–J3' },
  active:     { emoji: '💬', name: 'Actif',         color: 'text-blue-400',    bg: 'bg-blue-950/30',    days: '' },
  restricted: { emoji: '🔶', name: 'Restreint',     color: 'text-orange-400',  bg: 'bg-orange-950/30',  days: '' },
  suspended:  { emoji: '⛔', name: 'Suspendu',      color: 'text-red-400',     bg: 'bg-red-950/30',     days: '' },
  resuming:   { emoji: '🔄', name: 'Reprise',       color: 'text-amber-400',   bg: 'bg-amber-950/30',   days: '' },
  completed:  { emoji: '✅', name: 'Terminé',       color: 'text-emerald-400', bg: 'bg-emerald-950/30', days: '' },
}

function getWarmupPhase(day: number, status: string) {
  if (status === 'completed') return { emoji: '🚀', name: 'Décollage', color: 'text-emerald-400', bg: 'bg-emerald-950/30' }
  if (day <= 3)  return { emoji: '🌙', name: 'Silence',      color: 'text-slate-400',   bg: 'bg-slate-800/40' }
  if (day <= 8)  return { emoji: '💬', name: 'Échauffement', color: 'text-blue-400',    bg: 'bg-blue-950/30' }
  if (day === 9) return { emoji: '🔗', name: 'Activation',   color: 'text-violet-400',  bg: 'bg-violet-950/30' }
  if (day <= 11) return { emoji: '🎯', name: 'Test A/B',     color: 'text-amber-400',   bg: 'bg-amber-950/30' }
  return              { emoji: '🚀', name: 'Décollage',     color: 'text-emerald-400', bg: 'bg-emerald-950/30' }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ─── Fetch base data ────────────────────────────────────────────────────────
  const [
    { data: domains },
    { count: totalCampaigns },
    { count: runningCampaigns },
    { data: mailboxes },
    { count: totalContacts },
  ] = await Promise.all([
    supabase.from('domains')
      .select('id, domain, status, warmup_day, daily_limit, sent_today, bounce_rate, complaint_rate')
      .eq('user_id', user!.id),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'running'),
    supabase.from('sender_identities')
      .select('id, email, domain_id, warmup_day, warmup_status, daily_volume, sent_today, open_rate, click_rate, hard_bounce_rate, complaint_rate, suspension_step, domains(domain)')
      .eq('user_id', user!.id)
      .not('warmup_status', 'is', null),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('unsubscribed', false),
  ])

  const domainIds = domains?.map(d => d.id) ?? []

  // ─── Volume logs (30 days, all domains) ─────────────────────────────────────
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: rawLogs } = domainIds.length > 0
    ? await supabase.from('warmup_logs')
        .select('date, emails_sent, bounces, complaints')
        .in('domain_id', domainIds)
        .gte('date', since)
        .order('date')
    : { data: [] }

  // Aggregate by date
  const logMap = new Map<string, { sent: number; bounces: number; complaints: number }>()
  for (const l of rawLogs ?? []) {
    const cur = logMap.get(l.date) ?? { sent: 0, bounces: 0, complaints: 0 }
    logMap.set(l.date, { sent: cur.sent + l.emails_sent, bounces: cur.bounces + l.bounces, complaints: cur.complaints + l.complaints })
  }

  // Fill every day in the range
  const volumeData: { date: string; sent: number; bounce_rate: number; complaint_rate: number }[] = []
  for (let d = new Date(since + 'T12:00:00'); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const stats = logMap.get(dateStr) ?? { sent: 0, bounces: 0, complaints: 0 }
    volumeData.push({
      date: dateStr,
      sent: stats.sent,
      bounce_rate: stats.sent > 0 ? parseFloat(((stats.bounces / stats.sent) * 100).toFixed(2)) : 0,
      complaint_rate: stats.sent > 0 ? parseFloat(((stats.complaints / stats.sent) * 100).toFixed(2)) : 0,
    })
  }

  // ─── Aggregate stats ─────────────────────────────────────────────────────────
  const totalSent30d = volumeData.reduce((s, d) => s + d.sent, 0)
  const avgBounce30d = volumeData.filter(d => d.sent > 0).reduce((s, d, _, a) => s + d.bounce_rate / a.length, 0)

  const activeMailboxes = mailboxes?.filter(m => !['completed', 'suspended', 'waiting'].includes(m.warmup_status ?? '')) ?? []
  const avgOpenRate  = activeMailboxes.length > 0 ? activeMailboxes.reduce((s, m) => s + (m.open_rate ?? 0), 0) / activeMailboxes.length : 0
  const avgClickRate = activeMailboxes.length > 0 ? activeMailboxes.reduce((s, m) => s + (m.click_rate ?? 0), 0) / activeMailboxes.length : 0
  const emailsSentToday = domains?.reduce((s, d) => s + (d.sent_today ?? 0), 0) ?? 0

  // ─── Warmup phase distribution ───────────────────────────────────────────────
  const phases = { silence: 0, echauf: 0, activation: 0, test: 0, decollage: 0 }
  for (const m of mailboxes ?? []) {
    const d = m.warmup_day ?? 1
    if (d <= 3)       phases.silence++
    else if (d <= 8)  phases.echauf++
    else if (d === 9) phases.activation++
    else if (d <= 11) phases.test++
    else              phases.decollage++
  }

  // ─── Alerts ──────────────────────────────────────────────────────────────────
  type DashAlert = { variant: 'danger' | 'warning' | 'info'; title: string; desc: string; href?: string }
  const alerts: DashAlert[] = []
  for (const d of domains ?? []) {
    if (d.status === 'blocked') alerts.push({ variant: 'danger', title: `Domaine bloqué : ${d.domain}`, desc: 'Ce domaine a été suspendu.', href: `/dashboard/domaines/${d.id}` })
    if (d.bounce_rate > BOUNCE_RATE_THRESHOLD) alerts.push({ variant: 'danger', title: `Bounce critique sur ${d.domain}`, desc: `${d.bounce_rate.toFixed(2)}% (seuil ${BOUNCE_RATE_THRESHOLD}%)`, href: `/dashboard/domaines/${d.id}` })
    else if (d.bounce_rate > 2) alerts.push({ variant: 'warning', title: `Bounce élevé sur ${d.domain}`, desc: `${d.bounce_rate.toFixed(2)}%`, href: `/dashboard/domaines/${d.id}` })
    if (d.complaint_rate > COMPLAINT_RATE_THRESHOLD) alerts.push({ variant: 'danger', title: `Plaintes sur ${d.domain}`, desc: `${d.complaint_rate.toFixed(3)}%`, href: `/dashboard/domaines/${d.id}` })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Vue globale</h1>
        <p className="text-sm text-[#475569] mt-1">Infrastructure email · 30 derniers jours</p>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Emails envoyés (30j)',
            value: totalSent30d.toLocaleString(),
            sub: `${emailsSentToday.toLocaleString()} aujourd'hui`,
            color: 'text-violet-400',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
          },
          {
            label: 'Taux d\'ouverture',
            value: `${avgOpenRate.toFixed(1)}%`,
            sub: `${activeMailboxes.length} boîtes actives`,
            color: 'text-emerald-400',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
          },
          {
            label: 'Taux de clic',
            value: `${avgClickRate.toFixed(2)}%`,
            sub: avgClickRate > 0 ? 'Moyen sur boîtes actives' : 'Pas encore de données',
            color: 'text-amber-400',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>,
          },
          {
            label: 'Bounce moyen (30j)',
            value: `${avgBounce30d.toFixed(2)}%`,
            sub: avgBounce30d > BOUNCE_RATE_THRESHOLD ? '⚠ Au-dessus du seuil' : 'Dans les normes',
            color: avgBounce30d > BOUNCE_RATE_THRESHOLD ? 'text-red-400' : avgBounce30d > 2 ? 'text-amber-400' : 'text-[#475569]',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
          },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-[#475569] uppercase tracking-wider leading-tight">{s.label}</p>
                <span className={s.color}>{s.icon}</span>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{s.value}</p>
              <p className="text-xs text-[#475569] mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Volume d'envois chart ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Volume d&apos;envois</CardTitle>
              <CardDescription>Emails envoyés par jour — tous domaines</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#475569]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-500 inline-block rounded" />Envois</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <LineChart
            data={volumeData}
            series={[
              { key: 'sent', label: 'Envois', color: '#8b5cf6', fill: 'rgba(139,92,246,0.08)', formatType: 'number' },
            ]}
            height={180}
            noDataText="Aucun envoi sur les 30 derniers jours"
          />
        </CardContent>
      </Card>

      {/* ── Deliverability chart ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Délivrabilité</CardTitle>
              <CardDescription>Taux de bounce et plaintes — 30 derniers jours</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#475569]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" />Bounce %</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" />Plaintes %</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <LineChart
            data={volumeData}
            series={[
              { key: 'bounce_rate',    label: 'Bounce',   color: '#f59e0b', fill: 'rgba(245,158,11,0.06)', formatType: 'percent2' },
              { key: 'complaint_rate', label: 'Plaintes', color: '#ef4444', fill: 'rgba(239,68,68,0.06)',  formatType: 'percent3' },
            ]}
            height={160}
            noDataText="Aucune donnée de délivrabilité"
          />
        </CardContent>
      </Card>

      {/* ── Warmup en cours ───────────────────────────────────────────────── */}
      {(mailboxes?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Warmup en cours</CardTitle>
                <CardDescription>{mailboxes?.length} boîte{(mailboxes?.length ?? 0) !== 1 ? 's' : ''} · progression par phase</CardDescription>
              </div>
              <Link href="/dashboard/domaines" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Voir tout →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phase distribution */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { emoji: '🌙', label: 'Silence',      count: phases.silence,    color: 'text-slate-400',   bg: 'bg-slate-800/30',   border: 'border-slate-700/30' },
                { emoji: '💬', label: 'Échauffement', count: phases.echauf,     color: 'text-blue-400',    bg: 'bg-blue-950/20',    border: 'border-blue-700/30' },
                { emoji: '🔗', label: 'Activation',   count: phases.activation, color: 'text-violet-400',  bg: 'bg-violet-950/20',  border: 'border-violet-700/30' },
                { emoji: '🎯', label: 'Test A/B',     count: phases.test,       color: 'text-amber-400',   bg: 'bg-amber-950/20',   border: 'border-amber-700/30' },
                { emoji: '🚀', label: 'Décollage',    count: phases.decollage,  color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-700/30' },
              ].map(p => (
                <div key={p.label} className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border ${p.bg} ${p.border}`}>
                  <span className="text-lg">{p.emoji}</span>
                  <span className={`text-xl font-bold ${p.color}`}>{p.count}</span>
                  <span className="text-[10px] text-[#475569] text-center leading-tight">{p.label}</span>
                </div>
              ))}
            </div>

            {/* Mailbox list */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(mailboxes ?? []).map(m => {
                const phase = getWarmupPhase(m.warmup_day ?? 1, m.warmup_status ?? 'active')
                const statusPct = Math.min(100, Math.round(((m.warmup_day ?? 1) / 30) * 100))
                const domain = Array.isArray(m.domains) ? m.domains[0] : m.domains
                const isSuspended = m.warmup_status === 'suspended'
                const isCompleted = m.warmup_status === 'completed'

                return (
                  <Link key={m.id} href={`/dashboard/domaines/${m.domain_id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1e1e3f] hover:border-[#3b3b6f] transition-all group">
                    <span className="text-base shrink-0">{phase.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm text-white truncate font-medium">{m.email}</span>
                        <span className={`text-xs shrink-0 ${phase.color}`}>{phase.name}</span>
                        {isSuspended && <span className="text-xs text-red-400 shrink-0">⛔</span>}
                      </div>
                      {!isSuspended && !isCompleted && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-[#1e1e3f] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${phase.color.replace('text-', 'bg-').replace('-400', '-500')}`}
                              style={{ width: `${statusPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#475569] shrink-0">J{m.warmup_day ?? 1}/30</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      {(m.open_rate ?? 0) > 0 && <p className="text-xs text-emerald-400">{(m.open_rate ?? 0).toFixed(0)}% ouv.</p>}
                      {(m.click_rate ?? 0) > 0 && <p className="text-xs text-amber-400">{(m.click_rate ?? 0).toFixed(1)}% clic</p>}
                      {(m.hard_bounce_rate ?? 0) > 0 && <p className="text-xs text-red-400">{(m.hard_bounce_rate ?? 0).toFixed(1)}% bounce</p>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Alerts ────────────────────────────────────────────────────────── */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Alertes ({alerts.length})</h2>
          {alerts.map((a, i) => (
            <Alert key={i} variant={a.variant}>
              <AlertIcon variant={a.variant} />
              <div className="flex-1 min-w-0">
                <AlertTitle>{a.title}</AlertTitle>
                <AlertDescription>{a.desc}</AlertDescription>
              </div>
              {a.href && <Link href={a.href} className="shrink-0 text-xs underline underline-offset-2 opacity-70 hover:opacity-100">Voir →</Link>}
            </Alert>
          ))}
        </div>
      ) : (
        <Alert variant="success">
          <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <AlertTitle>Tout est opérationnel</AlertTitle>
            <AlertDescription>Aucune alerte. Infrastructure email en bonne santé.</AlertDescription>
          </div>
        </Alert>
      )}

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/campagnes-ia/nouveau" className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">✦ Campagne IA</Link>
        <Link href="/dashboard/sequences/nouveau" className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white text-sm transition-all">+ Séquence</Link>
        <Link href="/dashboard/contacts" className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white text-sm transition-all">↑ Importer contacts</Link>
        <Link href="/dashboard/domaines" className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white text-sm transition-all">+ Domaine</Link>
      </div>
    </div>
  )
}
