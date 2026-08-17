'use client'

import { useActionState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/auth/actions'

function ConfirmedBanner() {
  const confirmed = useSearchParams().get('confirmed')
  if (!confirmed) return null
  return (
    <div className="flex items-center gap-3 border border-emerald-800/40 bg-emerald-950/30 px-4 py-3 rounded-lg mb-6">
      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-emerald-400">Email confirmé. Tu peux te connecter.</p>
    </div>
  )
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null)

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-3">Connexion</p>
        <h1 className="text-3xl font-black tracking-[-0.03em] text-white mb-1">Bon retour.</h1>
        <p className="text-sm text-[#64748b]">Accède à ton espace d&apos;envoi</p>
      </div>

      <Suspense>
        <ConfirmedBanner />
      </Suspense>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-mono text-[#475569] uppercase tracking-widest mb-2">
            Email
          </label>
          <input
            id="email" name="email" type="email" required autoComplete="email"
            placeholder="toi@entreprise.com"
            className="w-full bg-[#0d0d1c] border border-[#1e1e3f] text-white rounded-lg px-4 py-3 text-sm placeholder-[#334155] focus:outline-none focus:border-[#7c3aed] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-mono text-[#475569] uppercase tracking-widest mb-2">
            Mot de passe
          </label>
          <input
            id="password" name="password" type="password" required autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-[#0d0d1c] border border-[#1e1e3f] text-white rounded-lg px-4 py-3 text-sm placeholder-[#334155] focus:outline-none focus:border-[#7c3aed] transition-colors"
          />
        </div>

        {state && 'error' in state && (
          <div className="flex items-start gap-3 border border-red-800/40 bg-red-950/30 px-4 py-3 rounded-lg">
            <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400">{state.error}</p>
          </div>
        )}

        <button
          type="submit" disabled={pending}
          className="w-full flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {pending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connexion…
            </>
          ) : (
            <>
              Se connecter
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#1e1e3f]">
        <p className="text-sm text-[#475569] text-center">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="text-[#8b5cf6] hover:text-white font-medium transition-colors">
            S&apos;inscrire gratuitement →
          </Link>
        </p>
      </div>
    </div>
  )
}
