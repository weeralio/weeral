import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  draft:     { label: 'Brouillon',  variant: 'draft' },
  scheduled: { label: 'Planifiée', variant: 'default' },
  running:   { label: 'En cours',  variant: 'running' },
  paused:    { label: 'Pausée',    variant: 'paused' },
  completed: { label: 'Terminée', variant: 'completed' },
  blocked:   { label: 'Bloquée',  variant: 'blocked' },
}

export default async function CampagnesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      id, name, status, created_at, subject,
      sender_identities(email, domains(domain))
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  // Get contact stats per campaign in one query
  const campaignIds = campaigns?.map(c => c.id) ?? []
  const { data: allContacts } = campaignIds.length > 0
    ? await supabase
        .from('campaign_contacts')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds)
    : { data: [] }

  type Stats = { total: number; sent: number; pending: number; failed: number }
  const statsMap: Record<string, Stats> = {}
  for (const cc of allContacts ?? []) {
    if (!statsMap[cc.campaign_id]) statsMap[cc.campaign_id] = { total: 0, sent: 0, pending: 0, failed: 0 }
    statsMap[cc.campaign_id].total++
    if (cc.status === 'sent') statsMap[cc.campaign_id].sent++
    else if (cc.status === 'pending') statsMap[cc.campaign_id].pending++
    else if (cc.status === 'failed') statsMap[cc.campaign_id].failed++
  }

  const totalSent = Object.values(statsMap).reduce((s, v) => s + v.sent, 0)
  const running = campaigns?.filter(c => c.status === 'running').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campagnes</h1>
          <p className="text-sm text-[#475569] mt-1">
            {campaigns?.length ?? 0} campagne{(campaigns?.length ?? 0) !== 1 ? 's' : ''} · {running} en cours · {totalSent.toLocaleString()} emails envoyés
          </p>
        </div>
        <Link href="/dashboard/campagnes/new" className={cn(buttonVariants({ variant: 'default' }))}>✉ Nouvelle campagne</Link>
      </div>

      {/* Empty state */}
      {!campaigns?.length ? (
        <Card>
          <CardContent className="py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#111128] border border-[#1e1e3f] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#3b3b6f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[#94a3b8] font-medium mb-1">Aucune campagne</p>
            <p className="text-sm text-[#475569] mb-6">Lance ta première campagne de cold email.</p>
            <Link href="/dashboard/campagnes/new" className={cn(buttonVariants({ variant: 'default' }))}>Créer ma première campagne →</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft
            const identity = Array.isArray(c.sender_identities) ? c.sender_identities[0] : c.sender_identities
            const domain = Array.isArray(identity?.domains) ? identity.domains[0] : identity?.domains
            const stats = statsMap[c.id] ?? { total: 0, sent: 0, pending: 0, failed: 0 }
            const sentPct = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0

            return (
              <Link key={c.id} href={`/dashboard/campagnes/${c.id}`} className="block group">
                <Card className="group-hover:border-[#8b5cf6]/35 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Status dot */}
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        c.status === 'running' ? 'bg-emerald-400 animate-pulse' :
                        c.status === 'blocked' ? 'bg-red-400' :
                        c.status === 'paused' ? 'bg-amber-400' :
                        c.status === 'completed' ? 'bg-[#3b3b6f]' :
                        'bg-[#3b3b6f]'
                      }`} />

                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-semibold text-white">{c.name}</span>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </div>
                          <span className="text-xs text-[#475569] shrink-0">
                            {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        {/* From + domain */}
                        {identity?.email && (
                          <p className="text-sm text-[#94a3b8] mb-3">
                            <span className="text-[#475569]">De :</span> {identity.email}
                            {domain?.domain && (
                              <span className="text-[#475569]"> · {domain.domain}</span>
                            )}
                          </p>
                        )}

                        {/* Stats grid */}
                        <div className="flex items-center gap-6 text-xs flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                            <span className="text-[#475569]">Total</span>
                            <strong className="text-white">{stats.total.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[#475569]">Envoyés</span>
                            <strong className="text-emerald-400">{stats.sent.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="text-[#475569]">En attente</span>
                            <strong className="text-white">{stats.pending.toLocaleString()}</strong>
                          </div>
                          {stats.failed > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              <span className="text-[#475569]">Échecs</span>
                              <strong className="text-red-400">{stats.failed}</strong>
                            </div>
                          )}
                          {/* Tracking not yet available */}
                          <div className="flex items-center gap-1.5 opacity-40">
                            <span className="text-[#475569]">Ouvertures</span>
                            <strong className="text-[#94a3b8]">—</strong>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-40">
                            <span className="text-[#475569]">Réponses</span>
                            <strong className="text-[#94a3b8]">—</strong>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {stats.total > 0 && (
                          <div className="mt-3">
                            <div className="h-1.5 w-full bg-[#1e1e3f] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all"
                                style={{ width: `${sentPct}%` }}
                              />
                            </div>
                            <p className="text-xs text-[#475569] mt-1">{sentPct}% envoyé</p>
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
