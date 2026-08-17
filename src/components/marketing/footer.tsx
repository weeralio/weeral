import Link from 'next/link'
import { WeeralIcon } from '@/components/ui/weeral-logo'

export default function MarketingFooter() {
  return (
    <footer className="border-t border-[#1e1e3f] bg-[#07070f]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">

          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-5">
              <WeeralIcon size={24} />
              <span className="font-bold text-white tracking-tight">Weeral</span>
            </Link>
            <p className="text-xs font-mono text-[#334155] leading-relaxed uppercase tracking-widest">
              Cold email B2B.<br />BYOA. Warmup auto.
            </p>
          </div>

          <div>
            <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-5">Produit</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/#fonctionnalites" className="text-[#334155] hover:text-white transition-colors">Fonctionnalités</Link></li>
              <li><Link href="/pricing" className="text-[#334155] hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link href="/signup" className="text-[#334155] hover:text-white transition-colors">S&apos;inscrire</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-5">Entreprise</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/a-propos" className="text-[#334155] hover:text-white transition-colors">À propos</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-5">Légal</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/mentions-legales" className="text-[#334155] hover:text-white transition-colors">Mentions légales</Link></li>
              <li><Link href="/confidentialite" className="text-[#334155] hover:text-white transition-colors">Confidentialité</Link></li>
              <li><Link href="/cgv" className="text-[#334155] hover:text-white transition-colors">CGV</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1e1e3f] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-mono text-[#334155]">© {new Date().getFullYear()} WEERAL — TOUS DROITS RÉSERVÉS</p>
          <a href="mailto:hello@weeral.co" className="text-xs font-mono text-[#334155] hover:text-[#8b5cf6] transition-colors">
            hello@weeral.co
          </a>
        </div>
      </div>
    </footer>
  )
}
