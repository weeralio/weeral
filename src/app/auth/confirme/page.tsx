import Link from 'next/link'
import { WeeralIcon } from '@/components/ui/weeral-logo'

export default function EmailConfirmedPage() {
  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <WeeralIcon size={40} />
          </Link>
        </div>

        {/* Checkmark */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Email confirmé !</h1>
        <p className="text-sm text-[#475569] mb-8">
          Ton compte Weeral est activé. Tu peux maintenant te connecter et commencer à utiliser la plateforme.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full px-6 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Se connecter →
        </Link>

        <p className="mt-4 text-xs text-[#3b3b6f]">
          Déjà connecté ?{' '}
          <Link href="/dashboard" className="text-[#8b5cf6] hover:underline">
            Aller au dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}
