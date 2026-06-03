'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import Link from 'next/link'
import { PLAN_META, type PlanId, type Billing } from '@/lib/stripe'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

// ─── Inner payment form ───────────────────────────────────────────────────────

function PaymentForm({
  plan, billing, price, clientSecret, discountedPrice,
}: {
  plan: PlanId
  billing: Billing
  price: number
  clientSecret: string
  discountedPrice: number | null
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cgv,     setCgv]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements || !cgv) return
    setLoading(true)
    setError(null)

    try {
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?plan=${plan}&billing=${billing}`,
        },
      })
      // If no stripeError, Stripe is redirecting — nothing to do here
      if (stripeError) {
        setError(stripeError.message ?? 'Erreur de paiement.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de paiement.')
    } finally {
      setLoading(false)
    }
  }

  const displayPrice = discountedPrice ?? price

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-[#07070f] border border-[#1e1e3f] rounded-xl p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
            fields: { billingDetails: { address: { country: 'never' } } },
          }}
        />
      </div>

      {/* CGV checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={cgv}
            onChange={e => setCgv(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-4 h-4 rounded border transition-all ${cgv ? 'bg-[#8b5cf6] border-[#8b5cf6]' : 'bg-[#07070f] border-[#3b3b6f] group-hover:border-[#8b5cf6]/50'}`}>
            {cgv && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs text-[#475569] leading-relaxed">
          J&apos;accepte les{' '}
          <Link href="/cgv" target="_blank" className="text-[#8b5cf6] hover:underline">
            conditions générales de vente
          </Link>{' '}
          et la{' '}
          <Link href="/confidentialite" target="_blank" className="text-[#8b5cf6] hover:underline">
            politique de confidentialité
          </Link>
        </span>
      </label>

      {error && (
        <div className="flex items-start gap-3 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe || !cgv}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white font-semibold text-sm hover:from-[#6d28d9] hover:to-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Traitement...
          </>
        ) : (
          `Payer ${displayPrice}€/mois`
        )}
      </button>

      <p className="text-xs text-center text-[#334155]">
        Paiement sécurisé par Stripe · Annulable à tout moment
      </p>
    </form>
  )
}

// ─── Outer checkout wrapper ───────────────────────────────────────────────────

interface Props {
  plan:      PlanId
  billing:   Billing
  userEmail: string | null
}

interface PromoInfo {
  id: string
  name: string
  percentOff: number | null
  amountOff: number | null
}

export default function CheckoutForm({ plan, billing, userEmail }: Props) {
  const router = useRouter()
  const meta  = PLAN_META[plan]
  const price = billing === 'annual' ? meta.annualPrice : meta.monthlyPrice

  const [email,          setEmail]          = useState(userEmail ?? '')
  const [clientSecret,   setClientSecret]   = useState<string | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const [loading,        setLoading]        = useState(false)

  const [showPromo,      setShowPromo]      = useState(false)
  const [promoCode,      setPromoCode]      = useState('')
  const [promoInfo,      setPromoInfo]      = useState<PromoInfo | null>(null)
  const [promoError,     setPromoError]     = useState<string | null>(null)
  const [promoLoading,   setPromoLoading]   = useState(false)

  function computeDiscounted(): number | null {
    if (!promoInfo) return null
    if (promoInfo.percentOff) return Math.round(price * (1 - promoInfo.percentOff / 100))
    if (promoInfo.amountOff)  return Math.max(0, price - promoInfo.amountOff)
    return null
  }

  const discountedPrice = computeDiscounted()

  async function validatePromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoError(null)
    setPromoInfo(null)
    try {
      const res  = await fetch('/api/stripe/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Code invalide')
      setPromoInfo(data)
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Code invalide')
    } finally {
      setPromoLoading(false)
    }
  }

  async function startCheckout() {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          plan,
          billing,
          promotionCodeId: promoInfo?.id ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erreur serveur')
      if (data.free) {
        router.push(`/checkout/success?plan=${plan}&billing=${billing}`)
        return
      }
      setClientSecret(data.clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const stripeOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary:    '#8b5cf6',
        colorBackground: '#07070f',
        colorText:       '#ffffff',
        colorDanger:     '#ef4444',
        borderRadius:    '12px',
        fontFamily:      'system-ui, sans-serif',
      },
    },
  } : undefined

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94a3b8] mb-6 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Retour aux offres
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">Finaliser l&apos;abonnement</h1>
          <p className="text-[#475569] text-sm">Paiement sécurisé · Sans engagement pour le mensuel</p>
        </div>

        {/* Plan summary */}
        <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569] uppercase tracking-wider mb-1">Plan choisi</p>
              <p className="text-white font-semibold">{meta.name}</p>
              <p className="text-xs text-[#475569] mt-0.5">
                {billing === 'annual' ? `Facturé ${meta.annualTotal}€/an` : 'Facturé chaque mois'}
              </p>
            </div>
            <div className="text-right">
              {discountedPrice !== null ? (
                <>
                  <p className="text-sm text-[#475569] line-through">{price}€</p>
                  <p className="text-2xl font-bold text-emerald-400">{discountedPrice}€</p>
                </>
              ) : (
                <p className="text-2xl font-bold text-white">{price}€</p>
              )}
              <p className="text-xs text-[#475569]">/mois</p>
              {billing === 'annual' && !discountedPrice && (
                <p className="text-xs text-emerald-400 mt-0.5">-40% économisé</p>
              )}
              {promoInfo && discountedPrice !== null && (
                <p className="text-xs text-emerald-400 mt-0.5">
                  {promoInfo.percentOff ? `-${promoInfo.percentOff}%` : `-${promoInfo.amountOff}€`} appliqué
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Step 1 — Email + Promo */}
        {!clientSecret && (
          <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                className="w-full bg-[#07070f] border border-[#1e1e3f] text-white rounded-xl px-4 py-3 text-sm placeholder-[#334155] focus:outline-none focus:border-[#8b5cf6]/60 focus:ring-1 focus:ring-[#8b5cf6]/30 transition-all"
                onKeyDown={e => e.key === 'Enter' && startCheckout()}
              />
            </div>

            {/* Promo code toggle */}
            <div>
              {!showPromo ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  className="text-xs text-[#475569] hover:text-[#8b5cf6] transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  J&apos;ai un code promo
                </button>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Code promo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoInfo(null); setPromoError(null) }}
                      placeholder="WEERAL20"
                      className="flex-1 bg-[#07070f] border border-[#1e1e3f] text-white rounded-xl px-4 py-2.5 text-sm placeholder-[#334155] focus:outline-none focus:border-[#8b5cf6]/60 focus:ring-1 focus:ring-[#8b5cf6]/30 transition-all uppercase"
                      onKeyDown={e => e.key === 'Enter' && validatePromo()}
                    />
                    <button
                      type="button"
                      onClick={validatePromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="px-4 py-2.5 rounded-xl border border-[#1e1e3f] text-sm text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      {promoLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : 'Valider'}
                    </button>
                  </div>

                  {promoInfo && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Code <strong className="font-semibold">{promoInfo.name}</strong> appliqué —{' '}
                      {promoInfo.percentOff ? `-${promoInfo.percentOff}%` : `-${promoInfo.amountOff}€`}
                    </div>
                  )}

                  {promoError && (
                    <p className="text-xs text-red-400">{promoError}</p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={startCheckout}
              disabled={loading || !email}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white font-semibold text-sm hover:from-[#6d28d9] hover:to-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Chargement...
                </>
              ) : (
                'Continuer vers le paiement →'
              )}
            </button>
          </div>
        )}

        {/* Step 2 — Payment */}
        {clientSecret && stripeOptions && (
          <div className="bg-[#0d0d1c] border border-[#8b5cf6]/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-5 h-5 rounded-full bg-[#8b5cf6] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-[#94a3b8]">{email}</p>
              <button onClick={() => setClientSecret(null)} className="ml-auto text-xs text-[#475569] hover:text-[#94a3b8] transition-colors">
                Modifier
              </button>
            </div>
            <Elements stripe={stripePromise} options={stripeOptions}>
              <PaymentForm
                plan={plan}
                billing={billing}
                price={price}
                clientSecret={clientSecret}
                discountedPrice={discountedPrice}
              />
            </Elements>
          </div>
        )}

      </div>
    </div>
  )
}
