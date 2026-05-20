'use client'

import Link from 'next/link'
import { PLAN_META, type PlanId, type Billing } from '@/lib/stripe'

interface Props {
  plan:      PlanId
  billing:   Billing
  userEmail: string | null
}

export default function CheckoutForm({ plan, billing }: Props) {
  const meta  = PLAN_META[plan]
  const price = billing === 'annual' ? meta.annualPrice : meta.monthlyPrice

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Paiement bientôt disponible</h1>
        <p className="text-[#94a3b8] mb-2">
          Plan <span className="text-white font-semibold">{meta.name}</span> — <span className="text-white font-semibold">${price}/mois</span>
        </p>
        <p className="text-sm text-[#475569] mb-8">
          Le système de paiement est en cours de configuration. Contacte-nous pour t&apos;abonner manuellement.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="mailto:contact@weeral.io"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white font-medium text-sm hover:from-[#6d28d9] hover:to-[#7c3aed] transition-all"
          >
            Nous contacter →
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 rounded-xl border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white text-sm transition-all"
          >
            Voir les plans
          </Link>
        </div>
      </div>
    </div>
  )
}
