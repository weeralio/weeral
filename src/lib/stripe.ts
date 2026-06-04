export const PLAN_META = {
  starter: { name: 'Starter', monthlyPrice: 147, annualPrice: 88,  annualTotal: 1056 },
  growth:  { name: 'Growth',  monthlyPrice: 197, annualPrice: 118, annualTotal: 1416 },
  agency:  { name: 'Agency',  monthlyPrice: 347, annualPrice: 208, annualTotal: 2496 },
} as const

export const FREE_CONTACTS_LIMIT = 100
export const FREE_EMAILS_LIMIT   = 100

export const PLAN_LIMITS = {
  starter: { domains: 3,        mailboxes: 5,        activeCampaigns: 3 },
  growth:  { domains: 10,       mailboxes: 20,       activeCampaigns: Infinity },
  agency:  { domains: Infinity, mailboxes: Infinity, activeCampaigns: Infinity },
} as const

export type PlanId = keyof typeof PLAN_META
export type Billing = 'monthly' | 'annual'

export function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe')
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_live_...') || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_...')) {
    throw new Error('STRIPE_SECRET_KEY non configuré')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export function getPriceId(plan: PlanId, billing: Billing): string {
  const map: Record<PlanId, Record<Billing, string>> = {
    starter: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
      annual:  process.env.STRIPE_PRICE_STARTER_ANNUAL!,
    },
    growth: {
      monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY!,
      annual:  process.env.STRIPE_PRICE_GROWTH_ANNUAL!,
    },
    agency: {
      monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY!,
      annual:  process.env.STRIPE_PRICE_AGENCY_ANNUAL!,
    },
  }
  return map[plan][billing]
}
