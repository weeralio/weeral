import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { FREE_CONTACTS_LIMIT, FREE_EMAILS_LIMIT, PLAN_LIMITS, type PlanId } from '@/lib/stripe'

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

  // Use admin client for subscriptions to bypass RLS and match by user_id reliably
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [
    { data: sub },
    { count: contactsUsed },
    { data: userDomains },
  ] = await Promise.all([
    admin
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'cancel_at_period_end'])
      .maybeSingle(),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('unsubscribed', false),
    supabase
      .from('domains')
      .select('id')
      .eq('user_id', userId),
  ])

  // Query warmup_logs by domain_id (warmup_logs has no user_id column)
  // warmup_logs.emails_sent includes campaigns + warmup + sequences (all crons call increment_warmup_log)
  const domainIds = (userDomains ?? []).map((d: { id: string }) => d.id)
  const { data: logs } = domainIds.length > 0
    ? await supabase.from('warmup_logs').select('emails_sent').in('domain_id', domainIds)
    : { data: [] as Array<{ emails_sent: number }> }

  const isSubscribed  = !!sub
  const contacts      = contactsUsed ?? 0
  const emailsSent    = logs?.reduce((s, l) => s + (l.emails_sent ?? 0), 0) ?? 0

  const atContactsLimit = !isSubscribed && contacts >= FREE_CONTACTS_LIMIT
  const atEmailsLimit   = !isSubscribed && emailsSent >= FREE_EMAILS_LIMIT
  const blocked         = atContactsLimit || atEmailsLimit

  return { isSubscribed, contactsUsed: contacts, emailsSent, atContactsLimit, atEmailsLimit, blocked }
}

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function getUserPlan(userId: string): Promise<PlanId | null> {
  const { data } = await adminClient()
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'cancel_at_period_end'])
    .maybeSingle()
  return (data?.plan as PlanId) ?? null
}

export function getPlanLimits(plan: PlanId | null) {
  return PLAN_LIMITS[plan ?? 'starter']
}
