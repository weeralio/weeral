import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import LineChart from '@/components/charts/line-chart'
import { BOUNCE_RATE_THRESHOLD, COMPLAINT_RATE_THRESHOLD } from '@/lib/warmup'
import { getUserLimits } from '@/lib/credits'
import CreditsBanner from '@/components/credits-banner'

// ─── Onboarding ───────────────────────────────────────────────────────────────

function OnboardingBanner({
  hasContacts, hasSender, hasDomain, hasCampaign,
}: {
  hasContacts: boolean
  hasSender: boolean
  hasDomain: boolean
  hasCampaign: boolean
}) {
  const steps = [
    {
      n: 1,
      done: hasContacts,
      title: 'Importer vos contacts',
      desc: 'Ajoutez votre liste de prospects. Vous pouvez importer un fichier CSV ou ajouter manuellement.',
      cta: 'Importer des contacts',
      href: '/dashboard/contacts',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      n: 2,
      done: hasSender && hasDomain,
      title: 'Connecter votre infrastructure',
      desc: hasDomain && !hasSender
        ? 'Domaine ajouté — connectez maintenant un expéditeur (AWS SES, Brevo, Mailgun…).'
        : hasSender && !hasDomain
        ? 'Expéditeur connecté — ajoutez maintenant un domaine d\'envoi.'
        : 'Connectez un expéditeur email et ajoutez un domaine. Weeral gère le warmup automatiquement.',
      cta: !hasSender ? 'Connecter un expéditeur' : 'Ajouter un domaine',
      href: !hasSender ? '/dashboard/aws-setup' : '/dashboard/domaines',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
    },
    {
      n: 3,
      done: hasCampaign,
      title: 'Lancer votre première campagne',
      desc: 'Décrivez votre cible et votre offre — l\'IA génère les emails et Weeral gère l\'envoi automatiquement.',
      cta: 'Créer une campagne IA',
      href: '/dashboard/campagnes-ia',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const nextStep = steps.find(s => !s.done)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0d0d1c] to-[#13102a] border border-[#1e1e3f] rounded-2xl p-7">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Bienvenue sur Weeral</h1>
            <p className="text-[#475569] text-sm">
              Suivez ces 3 étapes pour lancer votre première campagne de cold email.
            </p>
          </div>
          <div className="text-right shrink-0 ml-6">
            <p className="text-3xl font-bold text-[#8b5cf6]">{doneCount}/3</p>
            <p className="text-xs text-[#475569]">étapes</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#1e1e3f] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] rounded-full transition-all duration-700"
            style={{ width: `${(doneCount / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="grid gap-4">
        {steps.map((step, i) => {
          const isNext = step === nextStep
          const isPast = step.done
          const isFuture = !step.done && !isNext

          return (
            <div
              key={step.n}
              className={`relative flex gap-5 p-5 rounded-2xl border transition-all ${
                isPast
                  ? 'border-[#8b5cf6]/20 bg-[#8b5cf6]/5'
                  : isNext
                  ? 'border-[#8b5cf6]/40 bg-[#0d0d1c] shadow-[0_0_30px_rgba(139,92,246,0.08)]'
                  : 'border-[#1e1e3f] bg-[#0a0a18] opacity-60'
              }`}
            >
              {/* Step number / check */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isPast
                  ? 'bg-[#8b5cf6] shadow-[0_0_16px_rgba(139,92,246,0.4)]'
                  : isNext
                  ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40'
                  : 'bg-[#1e1e3f]'
              }`}>
                {isPast ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={isNext ? 'text-[#8b5cf6]' : 'text-[#475569]'}>{step.icon}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-xs font-semibold uppercase tracking-widest ${
                    isPast ? 'text-[#8b5cf6]' : isNext ? 'text-[#8b5cf6]' : 'text-[#334155]'
                  }`}>
                    Étape {step.n}
                  </p>
                  {isPast && (
                    <span className="text-[10px] bg-[#8b5cf6]/15 text-[#a78bfa] px-2 py-0.5 rounded-full font-semibold">Fait</span>
                  )}
                  {isNext && (
                    <span className="text-[10px] bg-[#8b5cf6] text-white px-2 py-0.5 rounded-full font-semibold">À faire</span>
                  )}
                </div>
                <p className={`font-semibold mb-1 ${isPast ? 'text-[#94a3b8]' : 'text-white'}`}>
                  {step.title}
                </p>
                <p className="text-sm text-[#475569] leading-relaxed">{step.desc}</p>

                {isNext && (
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold hover:from-[#6d28d9] hover:to-[#7c3aed] transition-all shadow-[0_0_20px_rgba(139,92,246,0.25)]"
                  >
                    {step.cta}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                )}
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="absolute left-[2.35rem] -bottom-4 w-px h-4 bg-[#1e1e3f]" />
              )}
            </div>
          )
        })}
      </div>

      {doneCount === 3 && (
        <div className="text-center py-4">
          <p className="text-sm text-emerald-400 font-semibold">
            Tout est configuré — vous êtes prêt à envoyer !
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Stats dashboard ──────────────────────────────────────────────────────────

function AlertIcon({ variant }: { variant: 'danger' | 'warning' | 'info' }) {
  if (variant === 'danger') return <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  if (variant === 'warning') return <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  return <svg className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}

function getWarmupPhase(day: number, status: string) {
  if (status === 'completed') return { emoji: '🚀', name: 'Décollage', color: 'text-emerald-400' }
  if (day <= 3)  return { emoji: '🌙', name: 'Silence',      color: 'text-slate-400' }
  if (day <= 8)  return { emoji: '💬', name: 'Échauffement', color: 'text-blue-400' }
  if (day === 9) return { emoji: '🔗', name: 'Activation',   color: 'text-violet-400' }
  if (day <= 11) return { emoji: '🎯', name: 'Test A/B',     color: 'text-amber-400' }
  return              { emoji: '🚀', name: 'Décollage',     color: 'text-emerald-400' }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: domains },
    { count: totalCampaigns },
    { count: runningCampaigns },
    { data: mailboxes },
    { count: totalContacts },
    { data: awsCreds },
    { data: providerConfig },
  ] = await Promise.all([
    supabase.from('domains').select('id, domain, status, warmup_day, daily_limit, sent_today, bounce_rate, complaint_rate').eq('user_id', user!.id),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'running'),
    supabase.from('sender_identities').select('id, email, domain_id, warmup_day, warmup_status, daily_volume, sent_today, open_rate, click_rate, hard_bounce_rate, complaint_rate, domains(domain)').eq('user_id', user!.id).not('warmup_status', 'is', null),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('unsubscribed', false),
    supabase.from('aws_credentials').select('id').eq('user_id', user!.id).single(),
    supabase.from('provider_configs').select('id').eq('user_id', user!.id).single(),
  ])

  const hasContacts  = (totalContacts ?? 0) > 0
  const hasSender    = !!awsCreds || !!providerConfig
  const hasDomain    = (domains?.length ?? 0) > 0
  const hasCampaign  = (totalCampaigns ?? 0) > 0
  const isOperational = hasContacts && hasSender && hasDomain && hasCampaign

  const limits = await getUserLimits(user!.id)

  // Show onboarding if not fully set up
  if (!isOperational) {
    return (
      <div className="max-w-2xl space-y-6">
        <CreditsBanner
          contactsUsed={limits.contactsUsed}
          emailsSent={limits.emailsSent}
          isSubscribed={limits.isSubscribed}
        />
        <OnboardingBanner
          hasContacts={hasContacts}
          hasSender={hasSender}
          hasDomain={hasDomain}
          hasCampaign={hasCampaign}
        />
      </div>
    )
  }

  // ── Operational dashboard ───────────────────────────────────────────────────

  const domainIds = domains?.map(d => d.id) ?? []
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split('T')[0]

  const [{ data: rawLogs }, { count: emailsSentTotal }, { count: emailsOpenedTotal }, { data: warmupSendRows }] = await Promise.all([
    domainIds.length > 0
      ? supabase.from('warmup_logs').select('date, emails_sent, bounces, complaints').in('domain_id', domainIds).gte('date', since).order('date')
      : { data: [] },
    domainIds.length > 0
      ? supabase.from('emails').select('*', { count: 'exact', head: true }).in('domain_id', domainIds)
      : { count: 0 },
    domainIds.length > 0
      ? supabase.from('emails').select('*', { count: 'exact', head: true }).in('domain_id', domainIds).in('status', ['opened', 'clicked'])
      : { count: 0 },
    supabase.from('warmup_sends').select('sent_at').eq('user_id', user!.id).gte('sent_at', since + 'T00:00:00'),
  ])

  const warmupByDate: Record<string, number> = {}
  for (const row of warmupSendRows ?? []) {
    const d = (row.sent_at as string).split('T')[0]!
    warmupByDate[d] = (warmupByDate[d] ?? 0) + 1
  }

  const logMap = new Map<string, { sent: number; bounces: number; complaints: number }>()
  for (const l of rawLogs ?? []) {
    const cur = logMap.get(l.date) ?? { sent: 0, bounces: 0, complaints: 0 }
    logMap.set(l.date, { sent: cur.sent + l.emails_sent, bounces: cur.bounces + l.bounces, complaints: cur.complaints + l.complaints })
  }

  const volumeData: { date: string; sent: number; warmup_sent: number; bounce_rate: number; complaint_rate: number }[] = []
  for (let d = new Date(since + 'T12:00:00'); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]!
    const stats = logMap.get(dateStr) ?? { sent: 0, bounces: 0, complaints: 0 }
    volumeData.push({
      date: dateStr,
      sent: stats.sent,
      warmup_sent: warmupByDate[dateStr] ?? 0,
      bounce_rate: stats.sent > 0 ? parseFloat(((stats.bounces / stats.sent) * 100).toFixed(2)) : 0,
      complaint_rate: stats.sent > 0 ? parseFloat(((stats.complaints / stats.sent) * 100).toFixed(2)) : 0,
    })
  }

  const totalSent30d = volumeData.reduce((s, d) => s + d.sent + d.warmup_sent, 0)
  const avgBounce30d = volumeData.filter(d => d.sent > 0).reduce((s, d, _, a) => s + d.bounce_rate / a.length, 0)
  const activeMailboxes = mailboxes?.filter(m => !['completed', 'suspended', 'waiting'].includes(m.warmup_status ?? '')) ?? []
  const openRate = (emailsSentTotal ?? 0) > 0 ? ((emailsOpenedTotal ?? 0) / (emailsSentTotal ?? 0)) * 100 : 0
  const emailsSentToday = domains?.reduce((s, d) => s + (d.sent_today ?? 0), 0) ?? 0

  type DashAlert = { variant: 'danger' | 'warning' | 'info'; title: string; desc: string; href?: string }
  const alerts: DashAlert[] = []
  for (const d of domains ?? []) {
    if (d.bounce_rate > BOUNCE_RATE_THRESHOLD) alerts.push({ variant: 'danger', title: `Bounce critique : ${d.domain}`, desc: `${d.bounce_rate.toFixed(2)}% — seuil ${BOUNCE_RATE_THRESHOLD}%`, href: `/dashboard/domaines/${d.id}` })
    else if (d.bounce_rate > 2) alerts.push({ variant: 'warning', title: `Bounce élevé : ${d.domain}`, desc: `${d.bounce_rate.toFixed(2)}%`, href: `/dashboard/domaines/${d.id}` })
    if (d.complaint_rate > COMPLAINT_RATE_THRESHOLD) alerts.push({ variant: 'danger', title: `Plaintes : ${d.domain}`, desc: `${d.complaint_rate.toFixed(3)}%`, href: `/dashboard/domaines/${d.id}` })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <CreditsBanner
        contactsUsed={limits.contactsUsed}
        emailsSent={limits.emailsSent}
        isSubscribed={limits.isSubscribed}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-sm text-[#475569] mt-0.5">30 derniers jours · tous domaines</p>
        </div>
        <Link href="/dashboard/campagnes-ia" className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold hover:from-[#6d28d9] hover:to-[#7c3aed] transition-all">
          ✦ Nouvelle campagne
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Envoyés (30j)',  value: totalSent30d.toLocaleString(),    sub: `${emailsSentToday} aujourd'hui`,      color: 'text-violet-400' },
          { label: 'Taux ouverture', value: `${openRate.toFixed(1)}%`, sub: `sur ${(emailsSentTotal ?? 0).toLocaleString()} envois`, color: 'text-emerald-400' },
          { label: 'Contacts',       value: (totalContacts ?? 0).toLocaleString(), sub: `${runningCampaigns ?? 0} campagnes actives`, color: 'text-blue-400' },
          { label: 'Bounce moyen',   value: `${avgBounce30d.toFixed(2)}%`,    sub: avgBounce30d > BOUNCE_RATE_THRESHOLD ? '⚠ Au-dessus du seuil' : 'Dans les normes', color: avgBounce30d > BOUNCE_RATE_THRESHOLD ? 'text-red-400' : 'text-[#475569]' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-[#475569] uppercase tracking-wider mb-3">{s.label}</p>
              <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#475569] mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Volume d&apos;envois</CardTitle>
          <CardDescription>Emails envoyés par jour</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <LineChart data={volumeData} series={[
            { key: 'sent',        label: 'Campagnes', color: '#8b5cf6', fill: 'rgba(139,92,246,0.08)', formatType: 'number' },
            { key: 'warmup_sent', label: 'Warmup',    color: '#10b981', fill: 'rgba(16,185,129,0.06)', formatType: 'number' },
          ]} height={180} noDataText="Aucun envoi" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Délivrabilité</CardTitle>
          <CardDescription>Bounce et plaintes — 30 jours</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <LineChart data={volumeData} series={[
            { key: 'bounce_rate',    label: 'Bounce',   color: '#f59e0b', fill: 'rgba(245,158,11,0.06)', formatType: 'percent2' },
            { key: 'complaint_rate', label: 'Plaintes', color: '#ef4444', fill: 'rgba(239,68,68,0.06)',  formatType: 'percent3' },
          ]} height={160} noDataText="Aucune donnée" />
        </CardContent>
      </Card>

      {/* Warmup */}
      {(mailboxes?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Warmup en cours</CardTitle>
                <CardDescription>{mailboxes?.length} boîte{(mailboxes?.length ?? 0) !== 1 ? 's' : ''}</CardDescription>
              </div>
              <Link href="/dashboard/domaines" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Voir tout →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(mailboxes ?? []).map(m => {
                const phase = getWarmupPhase(m.warmup_day ?? 1, m.warmup_status ?? 'active')
                const pct = Math.min(100, Math.round(((m.warmup_day ?? 1) / 30) * 100))
                const domain = Array.isArray(m.domains) ? m.domains[0] : m.domains
                return (
                  <Link key={m.id} href={`/dashboard/domaines/${m.domain_id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1e1e3f] hover:border-[#3b3b6f] transition-all">
                    <span className="text-base shrink-0">{phase.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm text-white truncate font-medium">{m.email}</span>
                        <span className={`text-xs shrink-0 ${phase.color}`}>{phase.name}</span>
                      </div>
                      {m.warmup_status !== 'completed' && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-[#1e1e3f] rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-[#475569] shrink-0">J{m.warmup_day ?? 1}/30</span>
                        </div>
                      )}
                    </div>
                    {(m.open_rate ?? 0) > 0 && <p className="text-xs text-emerald-400 shrink-0">{(m.open_rate ?? 0).toFixed(0)}% ouv.</p>}
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Alertes ({alerts.length})</h2>
          {alerts.map((a, i) => (
            <Alert key={i} variant={a.variant}>
              <AlertIcon variant={a.variant} />
              <div className="flex-1 min-w-0">
                <AlertTitle>{a.title}</AlertTitle>
                <AlertDescription>{a.desc}</AlertDescription>
              </div>
              {a.href && <Link href={a.href} className="shrink-0 text-xs underline opacity-70 hover:opacity-100">Voir →</Link>}
            </Alert>
          ))}
        </div>
      ) : (
        <Alert variant="success">
          <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <AlertTitle>Tout est opérationnel</AlertTitle>
            <AlertDescription>Infrastructure email en bonne santé.</AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  )
}
