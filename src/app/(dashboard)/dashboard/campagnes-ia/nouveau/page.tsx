import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewCampaignWizard from './wizard'

export default async function NewIACampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: domains },
    { count: totalCount },
    { data: rawLists },
    { data: members },
  ] = await Promise.all([
    supabase
      .from('domains')
      .select('id, domain, status')
      .eq('user_id', user.id)
      .neq('status', 'blocked')
      .order('created_at', { ascending: false }),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('unsubscribed', false),
    supabase
      .from('contact_lists')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('contact_list_members')
      .select('list_id'),
  ])

  const countMap: Record<string, number> = {}
  for (const m of members ?? []) {
    countMap[m.list_id] = (countMap[m.list_id] ?? 0) + 1
  }
  const lists = (rawLists ?? []).map(l => ({ ...l, count: countMap[l.id] ?? 0 }))

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/dashboard/campagnes-ia" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Campagnes IA
        </Link>
        <h1 className="text-2xl font-bold text-white">Nouvelle campagne IA</h1>
        <p className="text-sm text-[#475569] mt-1">L&apos;IA va gérer le warmup et te demander le contenu à chaque phase.</p>
      </div>

      <NewCampaignWizard
        domains={domains ?? []}
        totalCount={totalCount ?? 0}
        lists={lists}
      />
    </div>
  )
}
