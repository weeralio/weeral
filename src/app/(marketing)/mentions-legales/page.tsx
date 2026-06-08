import type { Metadata } from 'next'
import { FadeUp } from '@/components/ui/motion'

export const metadata: Metadata = {
  title: 'Mentions légales — Weeral',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://weeral.io/mentions-legales' },
}

export default function MentionsLegalesPage() {
  return (
    <div className="bg-[#07070f] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <FadeUp>
          <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Légal</p>
          <h1 className="text-4xl font-bold text-white mb-12">Mentions légales</h1>
        </FadeUp>

        <div className="space-y-6">
          {[
            {
              title: 'Éditeur du site',
              content: (
                <div className="text-sm text-[#94a3b8] space-y-1">
                  <p>Weeral</p>
                  <p>Email : <a href="mailto:hello@weeral.co" className="text-[#8b5cf6] hover:text-[#a78bfa] transition-colors">hello@weeral.co</a></p>
                </div>
              ),
            },
            {
              title: 'Hébergement',
              content: (
                <div className="text-sm text-[#94a3b8] space-y-2">
                  <p>Ce site est hébergé par <span className="text-white">Vercel Inc.</span>, 340 Pine Street, Suite 701, San Francisco, California 94104, États-Unis.</p>
                  <p>Les données de l&apos;application sont hébergées sur <span className="text-white">Supabase</span> (infrastructure AWS us-east-1).</p>
                </div>
              ),
            },
            {
              title: 'Propriété intellectuelle',
              content: <p className="text-sm text-[#94a3b8] leading-relaxed">L&apos;ensemble du contenu de ce site est la propriété exclusive de Weeral. Toute reproduction sans autorisation préalable écrite est interdite.</p>,
            },
            {
              title: 'Responsabilité',
              content: <p className="text-sm text-[#94a3b8] leading-relaxed">Weeral ne saurait être tenu responsable des dommages directs ou indirects causés lors de l&apos;accès au site ou de son utilisation.</p>,
            },
            {
              title: 'Cookies',
              content: <p className="text-sm text-[#94a3b8] leading-relaxed">Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement de l&apos;authentification. Aucun cookie publicitaire ou de tracking n&apos;est utilisé.</p>,
            },
            {
              title: 'Droit applicable',
              content: <p className="text-sm text-[#94a3b8] leading-relaxed">Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français sont seuls compétents.</p>,
            },
          ].map((section, i) => (
            <FadeUp key={section.title} delay={i * 0.06}>
              <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl p-6">
                <h2 className="text-sm font-semibold text-white mb-3">{section.title}</h2>
                {section.content}
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </div>
  )
}
