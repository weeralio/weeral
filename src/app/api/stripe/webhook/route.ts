import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Admin client — bypasses RLS
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] signature invalide', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await upsertSubscription(sub)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await adminSupabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)
        break
      }
      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        const subId   = invoice.subscription ?? invoice.parent?.subscription_details?.subscription
        if (subId) {
          await adminSupabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId as string)
        }
        break
      }
    }
  } catch (err) {
    console.error('[webhook] handler error', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const customerId = sub.customer as string
  const customer   = await stripe.customers.retrieve(customerId) as Stripe.Customer
  const email      = customer.email ?? ''
  const userId     = (sub.metadata?.user_id || customer.metadata?.user_id) ?? null
  const plan       = (sub.metadata?.plan   || customer.metadata?.plan)   ?? 'starter'
  const billing    = (sub.metadata?.billing || customer.metadata?.billing) ?? 'monthly'

  // Resolve user_id from email if not in metadata
  let resolvedUserId = userId || null
  if (!resolvedUserId && email) {
    const { data: users } = await adminSupabase.auth.admin.listUsers()
    const match = users?.users?.find(u => u.email === email)
    if (match) resolvedUserId = match.id
  }

  const periodEnd = sub.items.data[0]?.billing_thresholds
    ? null
    : new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()

  await adminSupabase.from('subscriptions').upsert({
    stripe_customer_id:     customerId,
    stripe_subscription_id: sub.id,
    user_id:                resolvedUserId,
    email,
    plan,
    billing,
    status:                 sub.status,
    current_period_end:     periodEnd,
    updated_at:             new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' })
}
