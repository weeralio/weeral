import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PLAN_META, type PlanId, type Billing } from '@/lib/stripe'
import CheckoutForm from './checkout-form'

export const metadata: Metadata = {
  title: 'Checkout — Weeral',
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string }>
}) {
  const sp      = await searchParams
  const plan    = (sp.plan    ?? 'growth')  as PlanId
  const billing = (sp.billing ?? 'monthly') as Billing

  const validPlan    = plan    in PLAN_META ? plan    : 'growth'
  const validBilling = billing === 'annual' ? 'annual' : 'monthly'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <CheckoutForm
      plan={validPlan}
      billing={validBilling}
      userEmail={user?.email ?? null}
    />
  )
}
