'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type InboxEmail = {
  id: string
  from_email: string
  from_name: string | null
  subject: string | null
  body_plain: string | null
  body_html: string | null
  received_at: string
  read_at: string | null
  sender_identity_id: string | null
  sequence_enrollments: {
    sequence_id: string
    contacts: { first_name: string | null; last_name: string | null; email: string } | null
    sender_identities: {
      id: string
      email: string
      display_name: string | null
      domain_id: string
      domains: { id: string; domain: string } | null
    } | null
    sequences: { id: string; name: string } | null
  } | null
}

export type InboxFilter = {
  domains: { id: string; domain: string }[]
  identities: { id: string; email: string; display_name: string | null; domain_id: string }[]
}

export async function getInboxEmails(opts: {
  domainId?: string
  identityId?: string
  unreadOnly?: boolean
}): Promise<InboxEmail[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('inbound_emails')
    .select(`
      id, from_email, from_name, subject, body_plain, body_html,
      received_at, read_at, sender_identity_id,
      sequence_enrollments(
        sequence_id,
        contacts(first_name, last_name, email),
        sender_identities(id, email, display_name, domain_id, domains(id, domain)),
        sequences(id, name)
      )
    `)
    .eq('user_id', user.id)
    .order('received_at', { ascending: false })
    .limit(200)

  if (opts.identityId) {
    query = query.eq('sender_identity_id', opts.identityId)
  }
  if (opts.unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data } = await query
  let emails = (data ?? []) as unknown as InboxEmail[]

  if (opts.domainId) {
    emails = emails.filter(e => {
      const enr = e.sequence_enrollments
      const d = enr?.sender_identities?.domains
      return d?.id === opts.domainId
    })
  }

  return emails
}

export async function getInboxFilters(): Promise<InboxFilter> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { domains: [], identities: [] }

  const [{ data: domains }, { data: identities }] = await Promise.all([
    supabase.from('domains').select('id, domain').eq('user_id', user.id).order('domain'),
    supabase.from('sender_identities').select('id, email, display_name, domain_id').eq('user_id', user.id).order('email'),
  ])

  return {
    domains: domains ?? [],
    identities: identities ?? [],
  }
}

export async function markEmailRead(emailId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('inbound_emails')
    .update({ read_at: new Date().toISOString() })
    .eq('id', emailId)
    .eq('user_id', user.id)
    .is('read_at', null)
  revalidatePath('/dashboard/boite-reception')
}

export async function markAllRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('inbound_emails')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
  revalidatePath('/dashboard/boite-reception')
}
