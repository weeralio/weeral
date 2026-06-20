import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import MessageEditor from './message-editor'
import WarmupForecastChart, { type ForecastPoint } from '@/components/charts/warmup-forecast-chart'
import { getDailyVolumeForMailbox } from '@/lib/warmup'
import type { WarmupPhase } from '../actions'
import WarmupDayAdjuster from './warmup-day-adjuster'
import WarmupListsEditor from './warmup-lists-editor'

const PHASE_INFO: Record<WarmupPhase, { label: string; days: string; color: string; noLink?: boolean }> = {
  j4_j8:   { label: 'Échauffement',  days: 'J4–J8',   color: 'text-blue-400',  noLink: true },
  j9:      { label: 'Premier lien',  days: 'J9',      color: 'text-violet-400' },
  j10_j14: { label: 'Campagne + CTA', days: 'J10–J14', color: 'text-amber-400' },
}

const STATUS_CONFIG = {
  active:    { label: 'Active',   variant: 'success' as const },
  paused:    { label: 'Pausée',   variant: 'warmup' as const },
  completed: { label: 'Terminée', variant: 'blocked' as const },
}

// ─── Forecast builder ─────────────────────────────────────────────────────────

function buildForecastPoints(
  campaignCreatedAt: string,
  mailboxes: { warmup_day: number | null; daily_volume: number | null }[],
  actualByDate: Record<string, number>,
): ForecastPoint[] {
  const today = new Date().toISOString().split('T')[0]!
  const start = campaignCreatedAt.split('T')[0]!

  // We show from campaign start to J14 end (14 days after the earliest mailbox start)
  const totalDays = 16
  const points: ForecastPoint[] = []

  for (let offset = 0; offset < totalDays; offset++) {
    const d = new Date(start)
    d.setDate(d.getDate() + offset)
    const dateStr = d.toISOString().split('T')[0]!
    const isFuture = dateStr > today
    const isToday  = dateStr === today

    // Forecast: sum planned volume across all mailboxes for this day
    let forecastTotal = 0
    for (const mb of mailboxes) {
      const currentDay = mb.warmup_day ?? 1
      const dayOffset  = offset - (currentDay - 1)
      const futureDay  = currentDay + (isFuture || isToday ? (offset - (currentDay - 1)) : 0)
      if (isFuture || isToday) {
        const projectedDay = currentDay + offset
        const vol = getDailyVolumeForMailbox(projectedDay, mb.daily_volume ?? 5)
        forecastTotal += vol
      }
    }

    const dayNum = offset + 1
    const label =
      dayNum <= 3  ? `J${dayNum}` :
      dayNum <= 8  ? `J${dayNum}` :
      dayNum === 9 ? 'J9' :
      `J${dayNum}`

    points.push({
      date:     dateStr,
      actual:   actualByDate[dateStr] ?? 0,
      forecast: forecastTotal,
      label,
      isToday,
      isFuture,
    })
  }

  return points
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WarmupCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: campaign }, { data: messages }] = await Promise.all([
    supabase
      .from('warmup_campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('warmup_messages')
      .select('*')
      .eq('warmup_campaign_id', id)
      .order('phase')
      .order('variant_index'),
  ])

  if (!campaign) notFound()

  const mailboxIdsArr = campaign.mailbox_ids as string[]

  // Load mailboxes, actual sends, and contact lists in parallel
  const [mailboxesRes, sendsRes, listsRes] = await Promise.all([
    mailboxIdsArr.length > 0
      ? supabase
          .from('sender_identities')
          .select('id, email, warmup_day, warmup_status, daily_volume, sent_today, open_rate, click_rate, hard_bounce_rate, soft_bounce_rate, complaint_rate, unsub_rate, domains(domain)')
          .in('id', mailboxIdsArr)
      : Promise.resolve({ data: [] }),
    supabase
      .from('warmup_sends')
      .select('sent_at, contact_id')
      .eq('warmup_campaign_id', id),
    supabase
      .from('contact_lists')
      .select('id, name, color')
      .eq('user_id', user!.id)
      .order('name'),
  ])

  const campaignMailboxes = mailboxesRes.data ?? []
  const allLists = listsRes.data ?? []

  // Group actual sends by date
  const actualByDate: Record<string, number> = {}
  for (const s of sendsRes.data ?? []) {
    const d = (s.sent_at as string).split('T')[0]!
    actualByDate[d] = (actualByDate[d] ?? 0) + 1
  }

  // Deliverability aggregates across all mailboxes
  const totalWarmupSent = (sendsRes.data ?? []).length
  const uniqueContacts  = new Set((sendsRes.data ?? []).map(s => s.contact_id)).size
  type MbMetrics = { open_rate: number | null; click_rate: number | null; hard_bounce_rate: number | null; soft_bounce_rate: number | null; complaint_rate: number | null; unsub_rate: number | null }
  const mbsWithMetrics = (campaignMailboxes as unknown as (typeof campaignMailboxes[0] & MbMetrics)[])
  const activeMbs = mbsWithMetrics.filter(m => (m.open_rate ?? 0) > 0 || (m.hard_bounce_rate ?? 0) > 0)
  const avgOpen    = activeMbs.length > 0 ? activeMbs.reduce((s, m) => s + (m.open_rate ?? 0), 0) / activeMbs.length : null
  const avgClick   = activeMbs.length > 0 ? activeMbs.reduce((s, m) => s + (m.click_rate ?? 0), 0) / activeMbs.length : null
  const avgBounce  = mbsWithMetrics.length > 0 ? mbsWithMetrics.reduce((s, m) => s + (m.hard_bounce_rate ?? 0) + (m.soft_bounce_rate ?? 0), 0) / mbsWithMetrics.length : null
  const avgComplaint = mbsWithMetrics.length > 0 ? mbsWithMetrics.reduce((s, m) => s + (m.complaint_rate ?? 0), 0) / mbsWithMetrics.length : null

  // Build forecast data
  const forecastPoints = buildForecastPoints(
    campaign.created_at,
    campaignMailboxes,
    actualByDate,
  )

  // Stats
  const totalSent    = Object.values(actualByDate).reduce((s, v) => s + v, 0)
  const todayForecast = forecastPoints.find(p => p.isToday)?.forecast ?? 0
  const remaining    = forecastPoints.filter(p => p.isFuture).reduce((s, p) => s + p.forecast, 0)

  const domainNames = [...new Set(
    (campaignMailboxes as unknown as { domains: { domain: string } | { domain: string }[] | null }[])
      .map(mb => { const d = Array.isArray(mb.domains) ? mb.domains[0] : mb.domains; return d?.domain })
      .filter(Boolean)
  )] as string[]
  const cfg = STATUS_CONFIG[campaign.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active

  const messagesByPhase = (messages ?? []).reduce((acc, m) => {
    if (!acc[m.phase as WarmupPhase]) acc[m.phase as WarmupPhase] = []
    acc[m.phase as WarmupPhase]!.push(m)
    return acc
  }, {} as Record<WarmupPhase, typeof messages>)

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <Link href="/dashboard/warmup" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Campagnes Warmup
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        </div>
        <p className="text-sm text-[#475569] mt-1">
          {domainNames.length > 0 ? domainNames.join(' · ') : '—'}
          {campaign.cta_objective && <span className="text-[#3b3b6f]"> · {campaign.cta_objective}</span>}
        </p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Envoyés total',    value: totalSent.toLocaleString(),     sub: 'depuis le démarrage' },
          { label: "Prévu aujourd'hui", value: todayForecast.toLocaleString(), sub: 'emails planifiés' },
          { label: 'Prévu restant',    value: remaining.toLocaleString(),     sub: 'jusqu\'au J14' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[#1e1e3f] bg-[#0a0a18] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-xl font-bold text-white tabular-nums">{s.value}</p>
            <p className="text-[10px] text-[#3b3b6f] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Forecast chart ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Courbe d&apos;envoi & prévisions</CardTitle>
          <CardDescription>Historique réel + projection jusqu&apos;au J14 — toutes boîtes cumulées</CardDescription>
        </CardHeader>
        <CardContent>
          <WarmupForecastChart
            points={forecastPoints}
            totalMailboxes={campaignMailboxes.length}
          />
        </CardContent>
      </Card>

      {/* ── Mailboxes status ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boîtes en warmup</CardTitle>
          <CardDescription>{campaignMailboxes.length} boîte{campaignMailboxes.length !== 1 ? 's' : ''} surveillée{campaignMailboxes.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {campaignMailboxes.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[#475569]">Aucune boîte configurée.</p>
          ) : (
            <div className="divide-y divide-[#1e1e3f]">
              {campaignMailboxes.map(mb => {
                const day      = mb.warmup_day ?? 1
                const phase    =
                  day <= 3  ? { label: 'Repos',        color: 'text-[#475569]' }  :
                  day <= 8  ? { label: 'Échauffement', color: 'text-blue-400' }   :
                  day === 9 ? { label: 'Premier lien', color: 'text-violet-400' } :
                  day < 14  ? { label: 'Campagne',     color: 'text-amber-400' }  :
                              { label: 'Terminé',      color: 'text-emerald-400' }
                const isResting = mb.warmup_status === 'resting' || day <= 3
                const pct = mb.daily_volume && mb.daily_volume > 0
                  ? Math.min(100, Math.round(((mb.sent_today ?? 0) / mb.daily_volume) * 100))
                  : 0

                return (
                  <div key={mb.id} className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        mb.warmup_status === 'completed' ? 'bg-emerald-500' :
                        mb.warmup_status === 'suspended' ? 'bg-red-500' :
                        isResting ? 'bg-[#475569]' : 'bg-violet-500 animate-pulse'
                      }`} />
                      <span className="text-sm text-white flex-1 truncate">{mb.email}</span>
                      <span className={`text-xs ${phase.color}`}>J{day} · {phase.label}</span>
                      {!isResting && (mb.daily_volume ?? 0) > 0 && (
                        <span className="text-xs text-[#475569] tabular-nums">
                          {mb.sent_today ?? 0}/{mb.daily_volume}/j
                        </span>
                      )}
                      <WarmupDayAdjuster
                        mailboxId={mb.id}
                        campaignId={id}
                        currentDay={day}
                      />
                    </div>
                    {!isResting && (mb.daily_volume ?? 0) > 0 && (
                      <div className="ml-4 mt-1.5 h-1 w-full bg-[#1e1e3f] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Deliverability stats ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Délivrabilité</CardTitle>
          <CardDescription>
            {totalWarmupSent.toLocaleString()} email{totalWarmupSent !== 1 ? 's' : ''} envoyé{totalWarmupSent !== 1 ? 's' : ''} · {uniqueContacts.toLocaleString()} contact{uniqueContacts !== 1 ? 's' : ''} touché{uniqueContacts !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Ouverture',  value: avgOpen    != null ? `${avgOpen.toFixed(1)}%`    : '—', color: avgOpen    != null && avgOpen    >= 20 ? 'text-emerald-400' : avgOpen    != null ? 'text-amber-400' : 'text-[#475569]' },
              { label: 'Clics',      value: avgClick   != null ? `${avgClick.toFixed(1)}%`   : '—', color: avgClick   != null && avgClick   >= 2  ? 'text-emerald-400' : avgClick   != null ? 'text-amber-400' : 'text-[#475569]' },
              { label: 'Bounce',     value: avgBounce  != null ? `${avgBounce.toFixed(2)}%`  : '—', color: avgBounce  != null && avgBounce  > 5   ? 'text-red-400'     : avgBounce  != null ? 'text-emerald-400' : 'text-[#475569]' },
              { label: 'Plaintes',   value: avgComplaint != null ? `${avgComplaint.toFixed(3)}%` : '—', color: avgComplaint != null && avgComplaint > 0.1 ? 'text-red-400' : avgComplaint != null ? 'text-emerald-400' : 'text-[#475569]' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-[#1e1e3f] bg-[#0a0a18] p-3 text-center">
                <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Per-mailbox deliverability */}
          {mbsWithMetrics.some(m => (m.open_rate ?? 0) > 0 || (m.hard_bounce_rate ?? 0) > 0) && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-2">Par boîte</p>
              {mbsWithMetrics.map(mb => (
                <div key={mb.id} className="flex items-center gap-3 text-xs">
                  <span className="text-[#94a3b8] truncate flex-1">{mb.email}</span>
                  <span className="text-[#475569] tabular-nums shrink-0">ouv. <span className="text-white">{(mb.open_rate ?? 0).toFixed(0)}%</span></span>
                  <span className="text-[#475569] tabular-nums shrink-0">clic <span className="text-white">{(mb.click_rate ?? 0).toFixed(1)}%</span></span>
                  <span className={`tabular-nums shrink-0 ${(mb.hard_bounce_rate ?? 0) > 5 ? 'text-red-400' : 'text-[#475569]'}`}>
                    bounce <span className="text-white">{((mb.hard_bounce_rate ?? 0) + (mb.soft_bounce_rate ?? 0)).toFixed(1)}%</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {totalWarmupSent === 0 && (
            <p className="text-sm text-[#475569] text-center py-2">Aucun envoi effectué pour le moment.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Contact lists ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listes de contacts</CardTitle>
          <CardDescription>
            Contacts ciblés par le warmup — modifiable à tout moment, pris en compte dès le prochain envoi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WarmupListsEditor
            campaignId={id}
            currentListIds={campaign.list_ids as string[] ?? []}
            allLists={allLists}
          />
        </CardContent>
      </Card>

      {/* ── Message editors ────────────────────────────────────────────────────── */}
      {(['j4_j8', 'j9', 'j10_j14'] as WarmupPhase[]).map(phase => {
        const info         = PHASE_INFO[phase]
        const phaseMessages = messagesByPhase[phase] ?? []

        return (
          <Card key={phase}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`text-sm font-mono ${info.color}`}>{info.days}</span>
                {info.label}
                {info.noLink && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e3f] text-[#475569]">sans lien</span>
                )}
              </CardTitle>
              <CardDescription>
                {phaseMessages.length > 0
                  ? `${phaseMessages.length} variante${phaseMessages.length > 1 ? 's' : ''} · ${phaseMessages.some((m: { ai_generated: boolean }) => m.ai_generated) ? 'IA' : 'Manuel'}`
                  : 'Aucun message configuré'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageEditor
                campaignId={id}
                phase={phase}
                messages={phaseMessages}
                variantCount={Math.max(1, Math.min(mailboxIdsArr.length, 3))}
                hasObjective={!!campaign.cta_objective}
                ctaUrl={campaign.cta_url ?? null}
              />
            </CardContent>
          </Card>
        )
      })}

      {/* ── Controls ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gérer la campagne</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageEditor
            campaignId={id}
            phase={null}
            messages={[]}
            variantCount={0}
            hasObjective={!!campaign.cta_objective}
            ctaUrl={null}
            campaignStatus={campaign.status}
            isControls
          />
        </CardContent>
      </Card>
    </div>
  )
}
