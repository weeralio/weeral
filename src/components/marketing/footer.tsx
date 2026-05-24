import Link from 'next/link'
import { WeeralIcon } from '@/components/ui/weeral-logo'

export default function MarketingFooter() {
  return (
    <footer className="border-t border-[#1e1e3f] bg-[#07070f]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <WeeralIcon size={24} />
              <span className="font-bold text-white tracking-tight">Weeral</span>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed">
              Cold emailing B2B avec warmup automatique, rédaction IA et analytics en temps réel.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Produit</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/#fonctionnalites" className="text-[#475569] hover:text-[#a78bfa] transition-colors">Fonctionnalités</Link></li>
              <li><Link href="/tarifs" className="text-[#475569] hover:text-[#a78bfa] transition-colors">Tarifs</Link></li>
              <li><Link href="/signup" className="text-[#475569] hover:text-[#a78bfa] transition-colors">S&apos;inscrire</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Entreprise</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/a-propos" className="text-[#475569] hover:text-[#a78bfa] transition-colors">À propos</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Légal</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/mentions-legales" className="text-[#475569] hover:text-[#a78bfa] transition-colors">Mentions légales</Link></li>
              <li><Link href="/confidentialite" className="text-[#475569] hover:text-[#a78bfa] transition-colors">Confidentialité</Link></li>
              <li><Link href="/cgv" className="text-[#475569] hover:text-[#a78bfa] transition-colors">CGV</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1e1e3f] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#475569]">© {new Date().getFullYear()} Weeral. Tous droits réservés.</p>
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span>Construit avec</span>
            <span className="text-[#8b5cf6]">Next.js</span>
            <span>·</span>
            <span className="text-[#8b5cf6]">AWS SES</span>
            <span>·</span>
            <span className="text-[#8b5cf6]">Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
