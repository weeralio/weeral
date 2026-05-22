import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getPriceId, PLAN_META, type PlanId, type Billing } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, plan, billing, promotionCodeId } = await req.json() as {
      email: string
      plan: PlanId
      billing: Billing
      promotionCodeId?: string
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
    const stripe = getStripe()
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
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payment_method_types: ['card', 'link'] as any, // excludes amazon_pay
      },
      metadata: { user_id: user?.id ?? '', plan, billing },
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any
    let clientSecret: string | null = null

    // Stripe 2025-01-27.acacia: invoice.payment_intent moved to InvoicePayment objects
    const invoiceId = typeof sub.latest_invoice === 'string'
      ? sub.latest_invoice
      : sub.latest_invoice?.id

    if (invoiceId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: payments } = await (stripe as any).invoicePayments.list({
        invoice: invoiceId,
        expand: ['data.payment.payment_intent'],
      })
      const firstPayment = payments?.[0]
      const pi = firstPayment?.payment?.payment_intent
      if (pi && typeof pi === 'object') {
        clientSecret = pi.client_secret ?? null
      } else if (typeof pi === 'string') {
        const piObj = await stripe.paymentIntents.retrieve(pi)
        clientSecret = piObj.client_secret ?? null
      }
    }

    if (!clientSecret) {
      return NextResponse.json(
        { error: 'Impossible d\'initialiser le paiement. Contacte le support.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
    })
  } catch (err: unknown) {
    console.error('[stripe/create-subscription]', err)
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
