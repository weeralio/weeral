'use client'

import { useActionState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/auth/actions'

function ConfirmedBanner() {
  const confirmed = useSearchParams().get('confirmed')
  if (!confirmed) return null
  return (
    <div className="flex items-start gap-3 bg-emerald-950/40 border border-emerald-800/40 px-4 py-3 rounded-lg mb-5">
      <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-emerald-400">Email confirmé ! Tu peux maintenant te connecter.</p>
    </div>
  )
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null)

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-8 shadow-[0_0_60px_rgba(139,92,246,0.08)]">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1.5">Connexion</h1>
          <p className="text-sm text-[#94a3b8]">Accède à ton espace d&apos;envoi</p>
        </div>

        <Suspense>
          <ConfirmedBanner />
        </Suspense>

        <form action={formAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="toi@entreprise.com"
              className="dash-input w-full px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="dash-input w-full px-4 py-3 text-sm"
            />
          </div>

          {state && 'error' in state && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/40 px-4 py-3 rounded-lg">
              <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{state.error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full py-3 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {pending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connexion...
              </span>
            ) : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1e1e3f] text-center">
          <p className="text-sm text-[#475569]">
            Pas encore de compte ?{' '}
            <Link href="/signup" className="text-[#8b5cf6] hover:text-[#a78bfa] font-medium transition-colors">
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
