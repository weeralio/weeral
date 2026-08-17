import type { Metadata } from 'next'
import Link from 'next/link'
import { WeeralIcon } from '@/components/ui/weeral-logo'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07070f] flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-[#1e1e3f] px-10 py-10">
        <Link href="/" className="flex items-center gap-2.5">
          <WeeralIcon size={28} />
          <span className="font-bold text-white tracking-tight">Weeral</span>
        </Link>

        <div>
          <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-6">Infrastructure cold email</p>
          <blockquote className="text-2xl font-black leading-tight tracking-[-0.03em] text-white mb-8">
            Warmup. Séquences.<br />Délivrabilité.<br />
            <span className="text-[#8b5cf6]">Ton infra.</span>
          </blockquote>
          <div className="space-y-3">
            {[
              'Warmup automatique 14 ou 40 jours',
              'BYOA — ton expéditeur, ta réputation',
              'Séquences multi-étapes sur pilote',
              '100 emails offerts sans carte bancaire',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-[#64748b]">
                <span className="text-[#8b5cf6] font-mono shrink-0">—</span>
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs font-mono text-[#334155]">© {new Date().getFullYear()} WEERAL</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 px-6 pt-6">
          <Link href="/" className="flex items-center gap-2">
            <WeeralIcon size={24} />
            <span className="font-bold text-white text-sm">Weeral</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
