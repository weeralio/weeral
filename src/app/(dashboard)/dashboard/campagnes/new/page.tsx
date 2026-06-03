import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NewCampaignForm from './new-campaign-form'

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: identities },
    { count: contactCount },
    { data: rawLists },
    { data: members },
  ] = await Promise.all([
    supabase
      .from('sender_identities')
      .select('id, email, display_name, domains(domain)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('unsubscribed', false),
    supabase
      .from('contact_lists')
      .select('id, name, color')
      .eq('user_id', user!.id)
      .order('name'),
    supabase
      .from('contact_list_members')
      .select('list_id'),
  ])

  // Build per-list contact counts
  const countMap: Record<string, number> = {}
  for (const m of members ?? []) {
    countMap[m.list_id] = (countMap[m.list_id] ?? 0) + 1
  }
  const lists = (rawLists ?? []).map(l => ({ ...l, count: countMap[l.id] ?? 0 }))

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/campagnes"
          className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Campagnes
        </Link>
        <h1 className="text-2xl font-bold text-white">Nouvelle campagne</h1>
        <p className="text-sm text-[#475569] mt-1">Configure et lance ta prochaine séquence de cold email.</p>
      </div>

      {!identities?.length ? (
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-5 text-sm text-amber-400">
          Tu dois d&apos;abord ajouter un domaine et une adresse d&apos;envoi dans{' '}
          <Link href="/dashboard/domaines" className="font-medium underline underline-offset-2 hover:text-amber-300 transition-colors">
            Domaines
          </Link>.
        </div>
      ) : (
        <NewCampaignForm
          identities={identities}
          contactCount={contactCount ?? 0}
          lists={lists}
        />
      )}
    </div>
  )
}
