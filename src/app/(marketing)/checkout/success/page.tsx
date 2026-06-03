import Link from 'next/link'
import type { Metadata } from 'next'
import { PLAN_META, getStripe, type PlanId, type Billing } from '@/lib/stripe'
import { createClient as createAdmin } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const metadata: Metadata = { title: 'Paiement confirmé — Weeral' }

async function syncSubscription(subscriptionId: string) {
  try {
    const stripe = getStripe()
    const sub    = await stripe.subscriptions.retrieve(subscriptionId)

    if (sub.status !== 'active' && sub.status !== 'trialing') return

    const customerId = sub.customer as string
    const customer   = await stripe.customers.retrieve(customerId) as Stripe.Customer
    const email      = customer.email ?? ''
    const meta       = sub.metadata ?? {}
    const plan       = (meta.plan   || customer.metadata?.plan)   ?? 'starter'
    const billing    = (meta.billing || customer.metadata?.billing) ?? 'monthly'

    let userId = meta.user_id || customer.metadata?.user_id || null

    if (!userId && email) {
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      const { data: users } = await admin.auth.admin.listUsers()
      const match = users?.users?.find(u => u.email === email)
      if (match) userId = match.id
    }

    const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    await admin.from('subscriptions').upsert({
      stripe_customer_id:     customerId,
      stripe_subscription_id: sub.id,
      user_id:                userId,
      email,
      plan,
      billing,
      status:                 sub.status,
      current_period_end:     periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at:             new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' })
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

  // Sync subscription to DB immediately (idempotent upsert)
  if (subscriptionId) {
    await syncSubscription(subscriptionId)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        {/* Check circle */}
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
