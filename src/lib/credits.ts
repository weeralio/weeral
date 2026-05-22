import { createClient } from '@/lib/supabase/server'
import { FREE_CONTACTS_LIMIT, FREE_EMAILS_LIMIT } from '@/lib/stripe'

export interface UserLimits {
  isSubscribed:    boolean
  contactsUsed:    number
  emailsSent:      number
  atContactsLimit: boolean
  atEmailsLimit:   boolean
  blocked:         boolean
}

export async function getUserLimits(userId: string): Promise<UserLimits> {
  const supabase = await createClient()

  const [
    { data: sub },
    { count: contactsUsed },
    { data: logs },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle(),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('unsubscribed', false),
    supabase
      .from('warmup_logs')
      .select('emails_sent')
      .eq('user_id', userId),
  ])

  const isSubscribed  = !!sub
  const contacts      = contactsUsed ?? 0
  const emailsSent    = logs?.reduce((s, l) => s + (l.emails_sent ?? 0), 0) ?? 0

  const atContactsLimit = !isSubscribed && contacts >= FREE_CONTACTS_LIMIT
  const atEmailsLimit   = !isSubscribed && emailsSent >= FREE_EMAILS_LIMIT
  const blocked         = atContactsLimit || atEmailsLimit

  return { isSubscribed, contactsUsed: contacts, emailsSent, atContactsLimit, atEmailsLimit, blocked }
}
