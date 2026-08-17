import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function SequencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sequences } = await supabase
    .from('seq')
    .select('id, name, description, goal, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const seqIds = sequences?.map(s => s.id) ?? []
  const [{ data: enrollments }, { data: stepCounts }] = await Promise.all([
    seqIds.length > 0
      ? supabase.from('seq_enrollment').select('seq_id, status').in('seq_id', seqIds)
      : Promise.resolve({ data: [] }),
    seqIds.length > 0
      ? supabase.from('seq_step').select('seq_id').in('seq_id', seqIds)
      : Promise.resolve({ data: [] }),
  ])

  type Stats = { active: number; completed: number; total: number; steps: number }
  const statsMap: Record<string, Stats> = {}
  for (const e of (enrollments ?? []) as Array<{ seq_id: string; status: string }>) {
    if (!statsMap[e.seq_id]) statsMap[e.seq_id] = { active: 0, completed: 0, total: 0, steps: 0 }
    statsMap[e.seq_id].total++
    if (e.status === 'active')    statsMap[e.seq_id].active++
    if (e.status === 'completed') statsMap[e.seq_id].completed++
  }
  for (const s of (stepCounts ?? []) as Array<{ seq_id: string }>) {
    if (!statsMap[s.seq_id]) statsMap[s.seq_id] = { active: 0, completed: 0, total: 0, steps: 0 }
    statsMap[s.seq_id].steps++
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Séquences</h1>
          <p className="text-sm text-[#475569] mt-1">
            {sequences?.length ?? 0} séquence{(sequences?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/sequences/nouveau" className={cn(buttonVariants({ variant: 'default' }), 'shrink-0')}>
          + Nouvelle séquence
        </Link>
      </div>

      {!sequences?.length ? (
        <Card>
          <CardContent className="py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#111128] border border-[#1e1e3f] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#3b3b6f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-[#94a3b8] font-semibold mb-1">Aucune séquence</p>
            <p className="text-sm text-[#475569] mb-6 max-w-xs mx-auto">
              Rédige ta première séquence d&apos;emails ou laisse l&apos;IA la générer pour toi.
            </p>
            <Link href="/dashboard/sequences/nouveau" className={cn(buttonVariants({ variant: 'default' }))}>
              Créer ma première séquence →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const stats = statsMap[seq.id] ?? { active: 0, completed: 0, total: 0 }
            return (
              <Link key={seq.id} href={`/dashboard/sequences/${seq.id}`} className="block group">
                <Card className="group-hover:border-[#8b5cf6]/35 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                          <span className="font-semibold text-white">{seq.name}</span>
                          <span className="text-xs text-[#475569] shrink-0">
                            {new Date(seq.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        {seq.description && <p className="text-sm text-[#475569] mb-3 line-clamp-1">{seq.description}</p>}

                        <div className="flex items-center gap-5 text-xs flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#475569]">Étapes</span>
                            <strong className="text-white">{(statsMap[seq.id] ?? { steps: 0 }).steps}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-[#475569]">En cours</span>
                            <strong className="text-white">{stats.active}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[#475569]">Terminés</span>
                            <strong className="text-white">{stats.completed}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#475569]">Total</span>
                            <strong className="text-white">{stats.total}</strong>
                          </div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-[#3b3b6f] group-hover:text-[#8b5cf6] transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
