import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPriceId, PLAN_META, type PlanId, type Billing } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, plan, billing } = await req.json() as {
      email: string
      plan: PlanId
      billing: Billing
    }

    if (!email || !plan || !billing) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    if (!PLAN_META[plan]) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const priceId = getPriceId(plan, billing)
    if (!priceId || priceId === 'price_...') {
      return NextResponse.json({ error: 'Price ID non configuré. Ajoute les IDs Stripe dans .env.local' }, { status: 500 })
    }

    // Get logged-in user if any
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Find or create Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 })
    let customer = existing.data[0]

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        metadata: { user_id: user?.id ?? '', plan, billing },
      })
    } else {
      // Update metadata in case plan changed
      await stripe.customers.update(customer.id, {
        metadata: { user_id: user?.id ?? '', plan, billing },
      })
    }

    // Create subscription (incomplete — payment confirmed client-side)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { user_id: user?.id ?? '', plan, billing },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice       = subscription.latest_invoice as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentIntent = (invoice?.payment_intent ?? invoice?.payment_intents?.data?.[0]) as any

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    })
  } catch (err: unknown) {
    console.error('[stripe/create-subscription]', err)
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
