import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getInboxEmails, getInboxFilters } from './actions'
import InboxClient from './inbox-client'

export const metadata = { title: 'Boîte de réception | Weeral' }

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; identity?: string; unread?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const [emails, filters] = await Promise.all([
    getInboxEmails({
      domainId: params.domain,
      identityId: params.identity,
      unreadOnly: params.unread === '1',
    }),
    getInboxFilters(),
  ])

  return (
    <InboxClient
      emails={emails}
      domains={filters.domains}
      identities={filters.identities}
      activeDomain={params.domain}
      activeIdentity={params.identity}
      unreadOnly={params.unread === '1'}
    />
  )
}
