import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewCampaignWizard from './wizard'

export default async function NewIACampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: domains }, { data: contacts }] = await Promise.all([
    supabase
      .from('domains')
      .select('id, domain, status')
      .eq('user_id', user.id)
      .neq('status', 'blocked')
      .order('created_at', { ascending: false }),
    supabase
      .from('contacts')
      .select('id, email, first_name, last_name')
      .eq('user_id', user.id)
      .eq('unsubscribed', false)
      .order('created_at', { ascending: false })
      .limit(5000),
  ])

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
        contacts={contacts ?? []}
      />
    </div>
  )
}
