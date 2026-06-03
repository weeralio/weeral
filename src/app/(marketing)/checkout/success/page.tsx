import Link from 'next/link'
import type { Metadata } from 'next'
import { PLAN_META, getStripe, type PlanId, type Billing } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const metadata: Metadata = { title: 'Paiement confirmé — Weeral' }

async function syncSubscription(subscriptionId: string, sessionUserId: string | null) {
  try {
    const stripe = getStripe()
    const sub    = await stripe.subscriptions.retrieve(subscriptionId)

    const customerId = sub.customer as string
    const customer   = await stripe.customers.retrieve(customerId) as Stripe.Customer
    const email      = customer.email ?? ''

    const subMeta  = sub.metadata ?? {}
    const custMeta = customer.metadata ?? {}
    const plan    = subMeta.plan    || custMeta.plan    || 'starter'
    const billing = subMeta.billing || custMeta.billing || 'monthly'

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Priority: 1) logged-in session user, 2) subscription/customer metadata
    let userId: string | null = sessionUserId
    if (!userId) userId = subMeta.user_id || custMeta.user_id || null

    const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end
    const row = {
      stripe_customer_id:     customerId,
      stripe_subscription_id: sub.id,
      user_id:                userId,
      email,
      plan,
      billing,
      status:                 sub.status,
      current_period_end:     periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at:             new Date().toISOString(),
    }

    // Check if a row already exists for this subscription ID
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', sub.id)
      .maybeSingle()

    let error
    if (existing) {
      // Update in place — avoids any unique constraint conflict
      ;({ error } = await admin
        .from('subscriptions')
        .update(row)
        .eq('stripe_subscription_id', sub.id))
    } else {
      // Check if there's already a row for this customer (prior subscription)
      // and update it rather than inserting a duplicate stripe_customer_id
      const { data: customerRow } = await admin
        .from('subscriptions')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (customerRow) {
        ;({ error } = await admin
          .from('subscriptions')
          .update(row)
          .eq('stripe_customer_id', customerId))
      } else {
        ;({ error } = await admin.from('subscriptions').insert(row))
      }
    }

    if (error) console.error('[checkout/success] DB error', error)
    else console.log('[checkout/success] synced', { subId: sub.id, userId, status: sub.status })
  } catch (err) {
    console.error('[checkout/success] syncSubscription failed', err)
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string; sub?: string }>
}) {
  const sp             = await searchParams
  const plan           = (sp.plan    ?? 'growth')  as PlanId
  const billing        = (sp.billing ?? 'monthly') as Billing
  const subscriptionId = sp.sub ?? null
  const meta           = PLAN_META[plan] ?? PLAN_META.growth

  // Get logged-in user (works on marketing pages via middleware session)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Sync subscription to DB immediately on page load
  if (subscriptionId) {
    await syncSubscription(subscriptionId, user?.id ?? null)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Paiement confirmé !</h1>
        <p className="text-[#94a3b8] mb-2">
          Bienvenue sur le plan <span className="text-white font-semibold">{meta.name}</span>.
        </p>
        <p className="text-sm text-[#475569] mb-10">
          Un reçu a été envoyé à votre adresse email.
          {billing === 'annual' && ' Votre abonnement est valide 12 mois.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white font-semibold hover:from-[#6d28d9] hover:to-[#7c3aed] transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            Accéder au dashboard →
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white transition-all"
          >
            Voir mon plan
          </Link>
        </div>
      </div>
    </div>
  )
}
