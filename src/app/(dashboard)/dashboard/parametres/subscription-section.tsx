'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  plan: string
  billing: string
  status: string
  periodEnd: string | null
  planName: string
  price: number
}

export default function SubscriptionSection({ plan, billing, status, periodEnd, planName, price }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleCancel() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/cancel-subscription', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  const isCanceling = status === 'cancel_at_period_end'
  const endDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6 space-y-5">
      <h2 className="text-base font-semibold text-white">Abonnement</h2>

      {/* Plan info */}
      <div className="bg-[#07070f] border border-[#1e1e3f] rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{planName}</p>
          <p className="text-xs text-[#475569] mt-0.5">
            {price}€/{billing === 'annual' ? 'mois (annuel)' : 'mois'}
            {endDate && (
              isCanceling
                ? ` · Accès jusqu'au ${endDate}`
                : ` · Renouvellement le ${endDate}`
            )}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
          isCanceling
            ? 'bg-amber-950/40 text-amber-400 border-amber-800/40'
            : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
        }`}>
          {isCanceling ? 'Résiliation programmée' : 'Actif'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {plan !== 'agency' && !isCanceling && (
          <Link
            href="/pricing"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold hover:from-[#6d28d9] hover:to-[#7c3aed] transition-all"
          >
            Changer de plan
          </Link>
        )}

        {!isCanceling && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="px-4 py-2 rounded-xl border border-[#1e1e3f] text-sm text-[#475569] hover:border-red-800/50 hover:text-red-400 transition-all"
          >
            Résilier l&apos;abonnement
          </button>
        )}
      </div>

      {/* Confirm cancel */}
      {confirming && (
        <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4 space-y-3">
          <p className="text-sm text-[#94a3b8]">
            Tu garderas l&apos;accès jusqu&apos;à la fin de la période en cours
            {endDate ? ` (${endDate})` : ''}. Aucun remboursement.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-red-900/50 border border-red-800/50 text-sm text-red-400 hover:bg-red-900/70 disabled:opacity-50 transition-all"
            >
              {loading ? 'Résiliation...' : 'Confirmer la résiliation'}
            </button>
            <button
              onClick={() => { setConfirming(false); setError(null) }}
              className="px-4 py-2 rounded-xl border border-[#1e1e3f] text-sm text-[#475569] hover:text-white transition-all"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {isCanceling && (
        <p className="text-xs text-amber-400">
          Ton abonnement ne sera pas renouvelé. Tu as accès jusqu&apos;au {endDate}.
        </p>
      )}
    </div>
  )
}
