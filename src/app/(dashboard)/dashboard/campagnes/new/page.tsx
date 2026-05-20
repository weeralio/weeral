import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NewCampaignForm from './new-campaign-form'

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: identities } = await supabase
    .from('sender_identities')
    .select('id, email, display_name, domains(domain)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { count: contactCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('unsubscribed', false)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/campagnes" className="text-sm text-gray-500 hover:text-gray-900">
          ← Campagnes
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-2">Nouvelle campagne</h1>
      </div>

      {!identities?.length ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-800">
          Tu dois d&apos;abord ajouter un domaine et une adresse d&apos;envoi dans{' '}
          <Link href="/dashboard/domaines" className="font-medium underline">Domaines</Link>.
        </div>
      ) : (
        <NewCampaignForm identities={identities} contactCount={contactCount ?? 0} />
      )}
    </div>
  )
}
