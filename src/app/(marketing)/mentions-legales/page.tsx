import type { Metadata } from 'next'
import { FadeUp, FadeIn } from '@/components/ui/motion'

export const metadata: Metadata = {
  title: 'Mentions légales — Weeral',
  description: 'Mentions légales de Weeral : éditeur, hébergement Vercel, données hébergées sur Supabase, propriété intellectuelle.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://weeral.io/mentions-legales' },
}

export default function MentionsLegalesPage() {
  return (
    <div className="bg-[#07070f] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <FadeIn>
          <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-6">Légal</p>
        </FadeIn>
        <FadeUp delay={0.05}>
          <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] text-white mb-16">
            Mentions légales
          </h1>
        </FadeUp>

        <div className="space-y-0 divide-y divide-[#1e1e3f]">
          {[
            {
              label: 'Éditeur du site',
              content: (
                <div className="text-sm text-[#64748b] space-y-1">
                  <p>Weeral</p>
                  <p>Email : <a href="mailto:hello@weeral.co" className="text-[#8b5cf6] hover:text-white transition-colors">hello@weeral.co</a></p>
                </div>
              ),
            },
            {
              label: 'Hébergement',
              content: (
                <div className="text-sm text-[#64748b] space-y-2">
                  <p>Ce site est hébergé par <span className="text-white font-mono">Vercel Inc.</span>, 340 Pine Street, Suite 701, San Francisco, California 94104, États-Unis.</p>
                  <p>Les données de l&apos;application sont hébergées sur <span className="text-white font-mono">Supabase</span> (infrastructure AWS us-east-1).</p>
                </div>
              ),
            },
            {
              label: 'Propriété intellectuelle',
              content: <p className="text-sm text-[#64748b] leading-relaxed">L&apos;ensemble du contenu de ce site est la propriété exclusive de Weeral. Toute reproduction sans autorisation préalable écrite est interdite.</p>,
            },
            {
              label: 'Responsabilité',
              content: <p className="text-sm text-[#64748b] leading-relaxed">Weeral ne saurait être tenu responsable des dommages directs ou indirects causés lors de l&apos;accès au site ou de son utilisation.</p>,
            },
            {
              label: 'Cookies',
              content: <p className="text-sm text-[#64748b] leading-relaxed">Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement de l&apos;authentification. Aucun cookie publicitaire ou de tracking n&apos;est utilisé.</p>,
            },
            {
              label: 'Droit applicable',
              content: <p className="text-sm text-[#64748b] leading-relaxed">Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français sont seuls compétents.</p>,
            },
          ].map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.05}>
              <div className="py-8 grid md:grid-cols-[180px_1fr] gap-6">
                <p className="text-xs font-mono text-[#334155] uppercase tracking-widest pt-1">{s.label}</p>
                {s.content}
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </div>
  )
}
