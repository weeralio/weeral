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

    const { data: existing } = await admin
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', sub.id)
      .maybeSingle()

    let error
    if (existing) {
      ;({ error } = await admin.from('subscriptions').update(row).eq('stripe_subscription_id', sub.id))
    } else {
      const { data: customerRow } = await admin
        .from('subscriptions')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (customerRow) {
        ;({ error } = await admin.from('subscriptions').update(row).eq('stripe_customer_id', customerId))
      } else {
        ;({ error } = await admin.from('subscriptions').insert(row))
      }
    }

    if (error) console.error('[checkout/success] DB error', error)
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (subscriptionId) {
    await syncSubscription(subscriptionId, user?.id ?? null)
  }

  const billingLabel =
    billing === 'annual' ? 'Abonnement valide 12 mois.' :
    billing === 'quarterly' ? 'Abonnement valide 3 mois.' :
    'Renouvellement mensuel automatique.'

  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="border-t-2 border-emerald-400 pt-8 mb-8">
          <p className="text-xs font-mono text-emerald-400 uppercase tracking-[0.2em] mb-4">Paiement confirmé</p>
          <h1 className="text-4xl font-black tracking-[-0.03em] text-white mb-3">
            Bienvenue sur<br />Weeral {meta.name}.
          </h1>
          <p className="text-sm text-[#64748b] leading-relaxed">
            Un reçu a été envoyé à votre adresse email. {billingLabel}
          </p>
        </div>

        <div className="space-y-0 divide-y divide-[#1e1e3f] mb-10">
          {[
            'Connecte ton expéditeur (Brevo, Mailgun, SES…)',
            'Importe tes premiers contacts CSV',
            'Lance ton warmup de domaine',
            'Crée ta première campagne',
          ].map((step, i) => (
            <div key={step} className="flex items-center gap-4 py-4">
              <span className="text-xs font-mono text-[#334155] w-6 shrink-0">0{i + 1}</span>
              <span className="text-sm text-[#64748b]">{step}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-3 px-6 rounded-lg text-sm transition-colors"
          >
            Accéder au dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            href="/pricing"
            className="flex items-center justify-center px-5 py-3 rounded-lg border border-[#1e1e3f] text-sm text-[#64748b] hover:border-[#3b3b6f] hover:text-white transition-all"
          >
            Voir mon plan
          </Link>
        </div>
      </div>
    </div>
  )
}
