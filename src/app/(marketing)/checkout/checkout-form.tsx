'use client'

import { useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PLAN_META, type PlanId, type Billing } from '@/lib/stripe'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const CARD_STYLE = {
  style: {
    base: {
      color: '#e2e8f0',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '14px',
      fontSmoothing: 'antialiased',
      '::placeholder': { color: '#475569' },
    },
    invalid: { color: '#f87171', iconColor: '#f87171' },
  },
}

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary:    '#8b5cf6',
    colorBackground: '#0d0d1c',
    colorText:       '#e2e8f0',
    borderRadius:    '12px',
    fontFamily:      'ui-sans-serif, system-ui, sans-serif',
  },
}

interface Props {
  plan:      PlanId
  billing:   Billing
  userEmail: string | null
}

function Form({ plan, billing, userEmail }: Props) {
  const router    = useRouter()
  const stripe    = useStripe()
  const elements  = useElements()

  const [email,   setEmail]   = useState(userEmail ?? '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const meta  = PLAN_META[plan]
  const price = billing === 'annual' ? meta.annualPrice : meta.monthlyPrice

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    try {
      // 1 — Create subscription server-side → get client_secret
      const res = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan, billing }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Erreur lors de la création de l\'abonnement')
        setLoading(false)
        return
      }

      // 2 — Confirm card payment client-side
      const cardElement = elements.getElement(CardElement)!
      const { error: stripeError } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { email },
        },
      })

      if (stripeError) {
        setError(stripeError.message ?? 'Paiement refusé')
        setLoading(false)
        return
      }

      // 3 — Success
      router.push(`/checkout/success?plan=${plan}&billing=${billing}`)
    } catch (err) {
      setError('Erreur réseau. Réessaie.')
      setLoading(false)
    }
  }, [stripe, elements, email, plan, billing, router])

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 pt-12 pb-20">
      <div className="w-full max-w-4xl grid md:grid-cols-5 gap-8">

        {/* ── Order summary ────────────────────── */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Récapitulatif</h2>

          <div className={`rounded-2xl p-6 border ${
            plan === 'growth'  ? 'bg-[#111128] border-[#8b5cf6]/30'  :
            plan === 'agency'  ? 'bg-[#0d0d1c] border-amber-500/20'  :
                                 'bg-[#0d0d1c] border-[#1e1e3f]'
          }`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                  plan === 'growth' ? 'text-[#8b5cf6]' :
                  plan === 'agency' ? 'text-amber-400' :
                  'text-[#475569]'
                }`}>{meta.name}</p>
                <p className="text-xs text-[#475569]">{billing === 'annual' ? 'Facturation annuelle' : 'Facturation mensuelle'}</p>
              </div>
              {plan === 'growth' && (
                <span className="text-xs font-bold text-[#a78bfa] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-2.5 py-1 rounded-full">
                  Most Popular
                </span>
              )}
            </div>

            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-bold text-white">${price}</span>
              <span className="text-sm text-[#475569] pb-1">/mois</span>
            </div>
            {billing === 'annual' && (
              <p className="text-xs text-[#475569]">
                Soit <span className="text-emerald-400 font-medium">${meta.annualTotal.toLocaleString()}</span> facturés aujourd&apos;hui
              </p>
            )}

            <div className="mt-5 pt-5 border-t border-[#1e1e3f] space-y-2">
              {billing === 'annual' ? (
                <div className="flex justify-between text-sm">
                  <span className="text-[#475569]">Économie vs mensuel</span>
                  <span className="text-emerald-400 font-medium">
                    −${((meta.monthlyPrice - meta.annualPrice) * 12).toLocaleString()}/an
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm">
                <span className="text-[#475569]">Frais Weeral</span>
                <span className="text-white font-medium">${billing === 'annual' ? meta.annualTotal.toLocaleString() : price}/{ billing === 'annual' ? 'an' : 'mois'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#475569]">Frais AWS SES</span>
                <span className="text-[#94a3b8]">Sur votre compte AWS</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#475569] text-center">
            Sans engagement · Annulez à tout moment ·{' '}
            <Link href="/pricing" className="text-[#8b5cf6] hover:underline">Changer de plan</Link>
          </p>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {[
              { icon: '🔒', label: 'SSL / TLS' },
              { icon: '🛡️', label: 'PCI DSS' },
              { icon: '💳', label: 'Stripe' },
            ].map(t => (
              <div key={t.label} className="flex flex-col items-center gap-1">
                <span className="text-lg">{t.icon}</span>
                <span className="text-[10px] text-[#475569]">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Payment form ──────────────────────── */}
        <div className="md:col-span-3">
          <h1 className="text-2xl font-bold text-white mb-6">Finaliser votre abonnement</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={!!userEmail}
                placeholder="vous@example.com"
                className="w-full bg-[#0d0d1c] border border-[#1e1e3f] text-white rounded-xl px-4 py-3 text-sm placeholder-[#475569] focus:outline-none focus:border-[#8b5cf6]/60 focus:ring-1 focus:ring-[#8b5cf6]/30 disabled:opacity-60 transition-all"
              />
            </div>

            {/* Card */}
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2">
                Carte bancaire
              </label>
              <div className="w-full bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl px-4 py-4 focus-within:border-[#8b5cf6]/60 focus-within:ring-1 focus-within:ring-[#8b5cf6]/30 transition-all">
                <CardElement options={CARD_STYLE} />
              </div>
              <p className="text-xs text-[#475569] mt-2 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Paiement sécurisé par Stripe — nous ne stockons pas vos données carte
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!stripe || loading}
              className={`w-full py-4 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 ${
                plan === 'growth'
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] hover:from-[#6d28d9] hover:to-[#7c3aed] text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:shadow-[0_0_32px_rgba(139,92,246,0.5)] disabled:opacity-50'
                  : plan === 'agency'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50'
                  : 'bg-[#1e1e3f] border border-[#3b3b6f] text-white hover:bg-[#252550] disabled:opacity-50'
              }`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Traitement en cours…
                </>
              ) : (
                <>
                  Démarrer {meta.name} — ${price}/mois
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutForm(props: Props) {
  return (
    <Elements stripe={stripePromise} options={{ appearance: STRIPE_APPEARANCE }}>
      <Form {...props} />
    </Elements>
  )
}
