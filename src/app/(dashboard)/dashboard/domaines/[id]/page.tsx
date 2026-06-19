import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DomainActions from './domain-actions'
import DomainManage from './domain-manage'
import AddSenderIdentityForm from './add-sender-identity-form'
import BulkCreateForm from './bulk-create-form'
import { getUserProvider } from '../actions'
import MailgunInboundSetup from './mailgun-inbound-setup'
import DeleteIdentityButton from './delete-identity-button'
import WarmupChart from '@/components/charts/warmup-chart'
import WarmupJourney from '@/components/dashboard/warmup-journey'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  getDailyVolumeForMailbox,
  requiresControlledBoxes,
  getEffectiveVolume,
  THRESHOLDS,
  type SuspensionStep,
} from '@/lib/warmup'

// ─── Suspension protocol steps ────────────────────────────────────────────────

const SUSPENSION_STEPS = [
  { step: 1, icon: '⚠',  label: 'Alerte',      color: 'text-amber-400',  bg: 'bg-amber-950/30',  border: 'border-amber-700/50',  desc: 'Notification + recommandations IA. Envois maintenus à 100%.' },
  { step: 2, icon: '🔶', label: 'Restriction',  color: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-700/50', desc: 'Volume réduit à 50%. Dialogue IA activé.' },
  { step: 3, icon: '⛔', label: 'Suspension',   color: 'text-red-400',    bg: 'bg-red-950/30',    border: 'border-red-700/50',    desc: 'Envois stoppés. Cooldown 10 jours minimum.' },
  { step: 4, icon: '🚫', label: 'Dom. bloqué',  color: 'text-red-500',    bg: 'bg-red-950/40',    border: 'border-red-600/60',    desc: 'Plusieurs boîtes impactées — domaine suspendu.' },
]

// ─── Phase label helper (matches warmup-journey.tsx phases) ───────────────────

function getPhaseInfo(day: number): { emoji: string; name: string; text: string; bg: string; border: string } {
  if (day <= 3)  return { emoji: '🌙', name: 'Silence',      text: 'text-slate-400',   bg: 'bg-slate-800/40',   border: 'border-slate-700/40' }
  if (day <= 8)  return { emoji: '💬', name: 'Échauffement', text: 'text-blue-400',    bg: 'bg-blue-950/40',    border: 'border-blue-700/40' }
  if (day === 9) return { emoji: '🔗', name: 'Activation',   text: 'text-violet-400',  bg: 'bg-violet-950/40',  border: 'border-violet-700/40' }
  if (day <= 11) return { emoji: '🎯', name: 'Test A/B',     text: 'text-amber-400',   bg: 'bg-amber-950/40',   border: 'border-amber-700/40' }
  return              { emoji: '🚀', name: 'Décollage',     text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-700/40' }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: domain },
    { data: rawIdentities, error: identitiesError },
    { data: warmupLogs },
    { data: replyBoxes },
    { data: recentAlerts },
    provider,
  ] = await Promise.all([
    supabase.from('domains').select('*').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('sender_identities')
      .select('id, email, display_name, warmup_day, warmup_status, daily_volume, sent_today, hard_bounce_rate, complaint_rate, suspension_step, suspended_until, suspension_reason, ses_verified')
      .eq('domain_id', id)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('warmup_logs').select('date, emails_sent, bounces, complaints').eq('domain_id', id).order('date', { ascending: false }).limit(30),
    supabase.from('warmup_reply_boxes').select('id').eq('user_id', user!.id).eq('is_active', true),
    supabase.from('warmup_alerts')
      .select('id, alert_level, message, recommendation, created_at')
      .eq('domain_id', id)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(3),
    getUserProvider(user!.id),
  ])

  if (!domain) notFound()
  if (identitiesError) console.error('[DomainDetailPage] identities query error:', identitiesError)

  const identities = rawIdentities ?? []
  const replyBoxCount = replyBoxes?.length ?? 0

  // Pick the representative warmup day (oldest active mailbox)
  const active = identities.filter(m => !['completed', 'suspended'].includes(m.warmup_status ?? ''))
  const repDay = active.length > 0
    ? active.reduce((min, m) => Math.min(min, m.warmup_day ?? 1), 999)
    : 1

  const statusVariant =
    domain.status === 'blocked'    ? 'blocked' :
    domain.status === 'active'     ? 'success' :
    domain.status === 'warmed_up'  ? 'success' : 'warmup'

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <Link href="/dashboard/domaines" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Domaines
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{domain.domain}</h1>
          <Badge variant={statusVariant}>
            {domain.status === 'blocked'   ? 'Bloqué' :
             domain.status === 'active'    ? 'Actif' :
             domain.status === 'warmed_up' ? 'Warmup terminé' :
             'Warmup actif'}
          </Badge>
        </div>
        {domain.blocked_reason && (
          <p className="text-xs text-red-400 mt-1.5">⚠ {domain.blocked_reason}</p>
        )}
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      {(recentAlerts ?? []).length > 0 && (
        <div className="space-y-2">
          {(recentAlerts ?? []).map(alert => {
            const crit = alert.alert_level === 'suspended' || alert.alert_level === 'domain_suspended'
            return (
              <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${crit ? 'bg-red-950/30 border-red-800/40 text-red-300' : 'bg-amber-950/30 border-amber-800/40 text-amber-300'}`}>
                <span className="shrink-0">{crit ? '⛔' : '⚠'}</span>
                <div>
                  <p className="font-medium">{alert.message}</p>
                  {alert.recommendation && <p className="text-xs opacity-70 mt-0.5">{alert.recommendation}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PARCOURS DE WARMUP — composant interactif
      ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Parcours de warmup</CardTitle>
          <CardDescription>Clique sur une phase pour voir le détail</CardDescription>
        </CardHeader>
        <CardContent>
          <WarmupJourney currentDay={repDay} replyBoxCount={replyBoxCount} />
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOÎTES D'ENVOI
      ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Boîtes d&apos;envoi</CardTitle>
              <CardDescription>Warmup indépendant par adresse</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <BulkCreateForm domainId={id} domain={domain.domain} provider={provider} />
              <span className="text-xs text-[#475569]">{identities.length} adresse{identities.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {identitiesError ? (
            <p className="px-6 py-4 text-xs text-red-400">Erreur DB : {identitiesError.message}</p>
          ) : identities.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[#475569]">Aucune adresse configurée.</p>
          ) : (
            <div className="divide-y divide-[#1e1e3f]">
              {identities.map((mb) => {
                const step      = (mb.suspension_step ?? 0) as SuspensionStep
                const vol       = getDailyVolumeForMailbox(mb.warmup_day ?? 1, mb.daily_volume ?? 50)
                const effective = getEffectiveVolume(vol, step)
                const sendPct   = effective > 0 ? Math.min(100, Math.round(((mb.sent_today ?? 0) / effective) * 100)) : 0
                const phase     = getPhaseInfo(mb.warmup_day ?? 1)
                const isResting   = mb.warmup_status === 'resting'
                const isSuspended = mb.warmup_status === 'suspended'
                const isCompleted = mb.warmup_status === 'completed'
                const needsControlled = requiresControlledBoxes(mb.warmup_day ?? 1)

                const dotColor = isSuspended ? 'bg-red-500' : isCompleted ? 'bg-emerald-500' : step >= 2 ? 'bg-orange-500' : isResting ? 'bg-[#475569]' : 'bg-violet-500'

                const statusLabel = isSuspended ? 'Suspendu'
                  : isCompleted ? 'Terminé'
                  : step >= 2 ? 'Restreint'
                  : isResting ? `Repos · J${mb.warmup_day}/3`
                  : mb.warmup_status === 'resuming' ? 'Reprise...'
                  : `J${mb.warmup_day ?? 1}`

                const statusColor = isSuspended ? 'text-red-400' : isCompleted ? 'text-emerald-400' : step >= 2 ? 'text-orange-400' : isResting ? 'text-[#475569]' : 'text-[#94a3b8]'

                return (
                  <div key={mb.id} className="px-5 py-4">
                    {/* Row: dot + email + badges */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">{mb.email}</span>
                          <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
                        </div>
                      </div>
                      {/* Phase badge */}
                      {!isCompleted && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${phase.bg} ${phase.border} ${phase.text}`}>
                          {phase.emoji} {phase.name}
                        </span>
                      )}
                      <DeleteIdentityButton identityId={mb.id} domainId={id} email={mb.email} />
                    </div>

                    {/* Metrics + progress */}
                    {!isResting && !isSuspended && effective > 0 && (
                      <div className="ml-5 space-y-2">
                        <div className="flex items-center gap-4 text-xs text-[#475569] flex-wrap">
                          <span>
                            {mb.sent_today ?? 0} / {effective} emails
                            {step === 2 && <span className="text-orange-400 ml-1">(volume −50 %)</span>}
                          </span>
                          {(mb.hard_bounce_rate ?? 0) > 0 && (
                            <span className={mb.hard_bounce_rate > THRESHOLDS.hardBounce.alert ? 'text-red-400' : 'text-amber-400'}>
                              Bounce {(mb.hard_bounce_rate ?? 0).toFixed(1)} %
                            </span>
                          )}
                          {(mb.complaint_rate ?? 0) > 0 && (
                            <span className={mb.complaint_rate > THRESHOLDS.complaint.alert ? 'text-red-400' : 'text-amber-400'}>
                              Plainte {(mb.complaint_rate ?? 0).toFixed(3)} %
                            </span>
                          )}
                          {needsControlled && replyBoxCount === 0 && (
                            <span className="text-amber-600">⚠ boîtes contrôlées manquantes</span>
                          )}
                        </div>
                        <Progress
                          value={sendPct}
                          indicatorClassName={step >= 2 ? 'bg-orange-500' : 'bg-gradient-to-r from-violet-600 to-purple-500'}
                        />
                      </div>
                    )}

                    {/* Suspension info */}
                    {mb.suspended_until && (
                      <p className="ml-5 text-xs text-red-400 mt-2">
                        Reprise le {new Date(mb.suspended_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </p>
                    )}

                    {/* Suspension protocol tracker */}
                    {step > 0 && (
                      <div className="ml-5 mt-3 pt-3 border-t border-[#1e1e3f]">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {SUSPENSION_STEPS.map(s => (
                            <span key={s.step} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border ${s.step <= step ? `${s.bg} ${s.border} ${s.color}` : 'bg-[#07070f] border-[#111128] text-[#1e2a3a]'}`}>
                              {s.icon} {s.label}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-[#475569]">{SUSPENSION_STEPS[step - 1]?.desc}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add mailbox ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une adresse</CardTitle>
          <CardDescription>Chaque adresse démarre son propre warmup au Jour 1.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddSenderIdentityForm domainId={id} domain={domain.domain} identities={identities} provider={provider} />
        </CardContent>
      </Card>

      {/* ── History chart ───────────────────────────────────────────────────── */}
      {warmupLogs && warmupLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique d&apos;envoi</CardTitle>
            <CardDescription>Volume agrégé par jour — toutes boîtes confondues</CardDescription>
          </CardHeader>
          <CardContent>
            <WarmupChart logs={[...warmupLogs].reverse()} dailyLimit={domain.daily_limit ?? 0} />
          </CardContent>
        </Card>
      )}

      {/* ── DNS ─────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration DNS</CardTitle>
          <CardDescription>SPF, DKIM et DMARC à configurer chez ton hébergeur.</CardDescription>
        </CardHeader>
        <CardContent>
          <DomainActions domainId={id} domain={domain.domain} provider={provider} />
        </CardContent>
      </Card>

      {/* ── Recevoir les réponses (Mailgun uniquement) ──────────────────────── */}
      {provider === 'mailgun' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recevoir les réponses</CardTitle>
            <CardDescription>Détecte automatiquement quand un prospect répond à ta séquence.</CardDescription>
          </CardHeader>
          <CardContent>
            <MailgunInboundSetup domainId={id} domain={domain.domain} />
          </CardContent>
        </Card>
      )}

      {/* ── Gérer le domaine ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gérer le domaine</CardTitle>
          <CardDescription>Supprimer ce domaine et toutes ses boîtes.</CardDescription>
        </CardHeader>
        <CardContent>
          <DomainManage
            domainId={id}
            domain={domain.domain}
          />
        </CardContent>
      </Card>
    </div>
  )
}
