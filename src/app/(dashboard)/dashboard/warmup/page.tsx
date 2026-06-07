import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  active:    { label: 'Active',   color: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
  paused:    { label: 'Pausée',   color: 'text-amber-400',   dot: 'bg-amber-400' },
  completed: { label: 'Terminée', color: 'text-[#475569]',   dot: 'bg-[#3b3b6f]' },
} as const

export default async function WarmupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: campaigns } = await supabase
    .from('warmup_campaigns')
    .select('id, name, status, cta_objective, mailbox_ids, list_ids, created_at, domains(domain)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campagnes Warmup</h1>
          <p className="text-sm text-[#475569] mt-1">
            {campaigns?.length ?? 0} campagne{(campaigns?.length ?? 0) !== 1 ? 's' : ''} · L&apos;IA génère le contenu, le cron envoie automatiquement
          </p>
        </div>
        <Link href="/dashboard/warmup/nouveau" className={cn(buttonVariants({ variant: 'default' }), 'shrink-0')}>
          + Nouvelle campagne
        </Link>
      </div>

      {/* Info banner */}
      <div className="px-4 py-3 rounded-xl border border-[#1e1e3f] bg-[#07070f] flex items-start gap-3">
        <svg className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-[#475569]">
          <span className="text-[#94a3b8] font-medium">Fonctionnement :</span>{' '}
          J1–J3 repos · J4 premiers 5 emails · +10%/jour · Pas de lien avant J9 · Domaine marqué &quot;warmé&quot; au J14
        </p>
      </div>

      {/* Empty state */}
      {!campaigns?.length ? (
        <Card>
          <CardContent className="py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/25 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </div>
            <p className="text-[#94a3b8] font-semibold mb-1">Aucune campagne warmup</p>
            <p className="text-sm text-[#475569] mb-6 max-w-xs mx-auto">
              Configure ta première campagne — l&apos;IA génère le contenu, les emails partent automatiquement.
            </p>
            <Link href="/dashboard/warmup/nouveau" className={cn(buttonVariants({ variant: 'default' }))}>
              Créer ma première campagne →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active
            const domain = Array.isArray(c.domains) ? c.domains[0] : c.domains
            const mailboxCount = (c.mailbox_ids as string[]).length

            return (
              <Link key={c.id} href={`/dashboard/warmup/${c.id}`} className="block group">
                <Card className="group-hover:border-[#8b5cf6]/35 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${cfg.dot}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{c.name}</span>
                            <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <span className="text-xs text-[#475569] shrink-0">
                            {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>

                        <p className="text-sm text-[#475569] mb-3">
                          {domain?.domain}
                          {c.cta_objective && (
                            <span className="text-[#3b3b6f]"> · {c.cta_objective}</span>
                          )}
                        </p>

                        <div className="flex items-center gap-5 text-xs flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#475569]">Boîtes</span>
                            <strong className="text-white">{mailboxCount}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#475569]">Listes</span>
                            <strong className="text-white">
                              {(c.list_ids as string[]).length === 0 ? 'Tous' : (c.list_ids as string[]).length}
                            </strong>
                          </div>
                        </div>
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
