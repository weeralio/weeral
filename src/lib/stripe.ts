import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const PLAN_META = {
  starter: { name: 'Starter', monthlyPrice: 197, annualPrice: 118, annualTotal: 1416 },
  growth:  { name: 'Growth',  monthlyPrice: 247, annualPrice: 148, annualTotal: 1776 },
  agency:  { name: 'Agency',  monthlyPrice: 345, annualPrice: 207, annualTotal: 2484 },
} as const

export type PlanId = keyof typeof PLAN_META
export type Billing = 'monthly' | 'annual'

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
