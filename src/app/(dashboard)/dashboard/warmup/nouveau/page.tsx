import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import WarmupWizard from './wizard'
import type { ContactList } from '@/components/dashboard/list-picker'

export default async function NewWarmupCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: domains }, { data: lists }, { count: totalCount }] = await Promise.all([
    supabase
      .from('domains')
      .select('id, domain, status')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_lists')
      .select('id, name, color, contact_list_members(count)')
      .eq('user_id', user!.id)
      .order('name'),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('unsubscribed', false),
  ])

  const allDomains = domains ?? []

  const [{ data: mailboxes }] = await Promise.all([
    supabase
      .from('sender_identities')
      .select('id, email, display_name, domain_id, warmup_status')
      .eq('user_id', user!.id)
      .order('email'),
  ])

  const formattedLists: ContactList[] = (lists ?? []).map(l => ({
    id: l.id,
    name: l.name,
    color: l.color,
    count: Array.isArray(l.contact_list_members)
      ? l.contact_list_members.reduce((s: number, m: { count: number }) => s + (m.count ?? 0), 0)
      : 0,
  }))

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link href="/dashboard/warmup" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Campagnes Warmup
        </Link>
        <h1 className="text-2xl font-bold text-white">Nouvelle campagne warmup</h1>
        <p className="text-sm text-[#475569] mt-1">L&apos;IA génère le contenu selon ta cible et ton objectif.</p>
      </div>

      <WarmupWizard
        domains={allDomains}
        mailboxes={mailboxes ?? []}
        lists={formattedLists}
        totalCount={totalCount ?? 0}
      />
    </div>
  )
}
