import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getUserPlan } from '@/lib/credits'

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active:          { label: 'Active',          color: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
  paused:          { label: 'Pausée',          color: 'text-amber-400',   dot: 'bg-amber-400' },
  waiting_content: { label: 'En attente',      color: 'text-violet-400',  dot: 'bg-violet-400 animate-pulse' },
  completed:       { label: 'Terminée',        color: 'text-[#475569]',   dot: 'bg-[#3b3b6f]' },
}

const PHASE_COLORS: Record<number, string> = {
  2: 'text-blue-400',
  3: 'text-violet-400',
  4: 'text-amber-400',
  5: 'text-emerald-400',
}

export default async function CampagnesIAPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const plan = await getUserPlan(user!.id)
  if (!plan || plan === 'starter') {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campagnes IA</h1>
          <p className="text-sm text-[#475569] mt-1">Génération et gestion de campagnes par intelligence artificielle</p>
        </div>
        <div className="bg-[#0d0d1c] border border-[#8b5cf6]/30 rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Fonctionnalité non disponible</p>
            <p className="text-sm text-[#475569] mt-2 max-w-sm mx-auto">
              La génération de campagnes par IA est réservée aux plans <span className="text-[#a78bfa]">Growth</span> et <span className="text-amber-400">Agency</span>.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-medium hover:from-[#6d28d9] hover:to-[#7c3aed] transition-all"
          >
            Passer au plan Growth →
          </Link>
        </div>
      </div>
    )
  }

  const [{ data: campaigns }, { data: pendingRequests }] = await Promise.all([
    supabase
      .from('ia_campaigns')
      .select('id, name, goal, status, total_contacts, reached_count, current_phase, created_at, domains(domain)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ia_content_requests')
      .select('id, campaign_id, phase_name, phase_id, due_date, ia_campaigns(name)')
      .eq('user_id', user!.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(5),
  ])

  const hasPending = (pendingRequests?.length ?? 0) > 0

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campagnes IA</h1>
          <p className="text-sm text-[#475569] mt-1">
            {campaigns?.length ?? 0} campagne{(campaigns?.length ?? 0) !== 1 ? 's' : ''} · L&apos;IA gère l&apos;envoi et te demande le contenu
          </p>
        </div>
        <Link href="/dashboard/campagnes-ia/nouveau" className={cn(buttonVariants({ variant: 'default' }), 'shrink-0')}>
          + Nouvelle campagne
        </Link>
      </div>

      {/* Pending content requests banner */}
      {hasPending && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <p className="text-sm font-semibold text-violet-200">
              {pendingRequests!.length} contenu{pendingRequests!.length > 1 ? 's' : ''} en attente
            </p>
          </div>
          <div className="space-y-2">
            {pendingRequests!.map((req) => {
              const campaign = Array.isArray(req.ia_campaigns) ? req.ia_campaigns[0] : req.ia_campaigns
              const isUrgent = new Date(req.due_date) <= new Date(Date.now() + 86_400_000)
              return (
                <Link
                  key={req.id}
                  href={`/dashboard/campagnes-ia/${req.campaign_id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] hover:border-violet-500/30 transition-all group"
                >
                  <div>
                    <p className="text-sm text-white font-medium group-hover:text-violet-200 transition-colors">
                      {campaign?.name ?? 'Campagne'}
                    </p>
                    <p className={`text-xs mt-0.5 ${PHASE_COLORS[req.phase_id] ?? 'text-[#94a3b8]'}`}>
                      Phase {req.phase_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs ${isUrgent ? 'text-red-400' : 'text-[#475569]'}`}>
                      {isUrgent ? '⚠ Urgent · ' : ''}Avant le {new Date(req.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">Écrire le message →</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!campaigns?.length ? (
        <Card>
          <CardContent className="py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/25 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-[#94a3b8] font-semibold mb-1">Aucune campagne IA</p>
            <p className="text-sm text-[#475569] mb-6 max-w-xs mx-auto">
              Connecte ton domaine, charge tes contacts — l&apos;IA s&apos;occupe du reste.
            </p>
            <Link href="/dashboard/campagnes-ia/nouveau" className={cn(buttonVariants({ variant: 'default' }))}>
              Créer ma première campagne IA →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.active
            const domain = Array.isArray(c.domains) ? c.domains[0] : c.domains
            const progressPct = c.total_contacts > 0
              ? Math.round((c.reached_count / c.total_contacts) * 100)
              : 0

            return (
              <Link key={c.id} href={`/dashboard/campagnes-ia/${c.id}`} className="block group">
                <Card className="group-hover:border-[#8b5cf6]/35 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${cfg.dot}`} />

                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{c.name}</span>
                            <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <span className="text-xs text-[#475569] shrink-0">
                            {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>

                        {/* Domain + goal */}
                        <p className="text-sm text-[#475569] mb-3">
                          {domain?.domain}
                          {c.goal && <span className="text-[#3b3b6f]"> · {c.goal}</span>}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-5 text-xs flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#475569]">Contacts</span>
                            <strong className="text-white">{c.total_contacts.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                            <span className="text-[#475569]">Atteints</span>
                            <strong className="text-white">{c.reached_count.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#475569]">Phase</span>
                            <strong className={PHASE_COLORS[c.current_phase] ?? 'text-white'}>{c.current_phase}</strong>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {c.total_contacts > 0 && (
                          <div className="mt-3">
                            <div className="h-1.5 w-full bg-[#1e1e3f] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <p className="text-xs text-[#475569] mt-1">{progressPct}% atteints</p>
                          </div>
                        )}
                      </div>

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
