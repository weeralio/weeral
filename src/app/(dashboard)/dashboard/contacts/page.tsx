import { createClient } from '@/lib/supabase/server'
import ContactsClient from './contacts-client'

const PER_PAGE = 50

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; sort?: string; dir?: string; page?: string; list?: string; tab?: string }>
}) {
  const sp = await searchParams
  const search  = sp.search ?? ''
  const status  = sp.status ?? 'all'
  const sort    = sp.sort ?? 'created_at'
  const dir     = sp.dir === 'asc' ? true : false
  const page    = Math.max(1, parseInt(sp.page ?? '1'))
  const listId  = sp.list ?? ''
  const tab     = sp.tab ?? 'contacts'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ─── Build contacts query ─────────────────────────────────────────────────
  let query = supabase
    .from('contacts')
    .select('id, email, first_name, last_name, company, prospect_status, unsubscribed, created_at', { count: 'exact' })
    .eq('user_id', user!.id)

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`)
  }
  if (status === 'active')       query = query.eq('unsubscribed', false)
  if (status === 'unsubscribed') query = query.eq('unsubscribed', true)

  // Filter by list
  if (listId) {
    const { data: members } = await supabase
      .from('contact_list_members')
      .select('contact_id')
      .eq('list_id', listId)
    const ids = members?.map(m => m.contact_id) ?? []
    if (ids.length) query = query.in('id', ids)
    else query = query.in('id', ['00000000-0000-0000-0000-000000000000']) // return empty
  }

  query = query
    .order(sort as 'email' | 'first_name' | 'company' | 'created_at', { ascending: dir })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

  // ─── Fetch all data in parallel ───────────────────────────────────────────
  const [
    { data: contacts, count },
    { data: lists },
    { data: listMemberships },
  ] = await Promise.all([
    query,
    supabase
      .from('contact_lists')
      .select('id, name, color')
      .eq('user_id', user!.id)
      .order('created_at'),
    supabase
      .from('contact_list_members')
      .select('list_id, contact_id')
      .in('list_id',
        (await supabase.from('contact_lists').select('id').eq('user_id', user!.id))
          .data?.map(l => l.id) ?? []
      ),
  ])

  // Count per list
  const listCounts: Record<string, number> = {}
  for (const m of listMemberships ?? []) {
    listCounts[m.list_id] = (listCounts[m.list_id] ?? 0) + 1
  }

  // Contact → lists map
  const contactLists: Record<string, string[]> = {}
  for (const m of listMemberships ?? []) {
    if (!contactLists[m.contact_id]) contactLists[m.contact_id] = []
    contactLists[m.contact_id].push(m.list_id)
  }

  // Stats
  const { count: totalActive } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('unsubscribed', false)

  const { count: totalUnsub } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('unsubscribed', true)

  return (
    <ContactsClient
      contacts={contacts ?? []}
      totalCount={count ?? 0}
      page={page}
      perPage={PER_PAGE}
      search={search}
      status={status}
      sort={sort}
      dir={dir ? 'asc' : 'desc'}
      tab={tab}
      listId={listId}
      lists={(lists ?? []).map(l => ({ ...l, count: listCounts[l.id] ?? 0 }))}
      contactLists={contactLists}
      stats={{ active: totalActive ?? 0, unsubscribed: totalUnsub ?? 0, total: (totalActive ?? 0) + (totalUnsub ?? 0) }}
    />
  )
}
