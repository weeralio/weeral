import type { Metadata } from 'next'
import { FadeUp, FadeIn } from '@/components/ui/motion'
import { JsonLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'À propos — Weeral',
  description: 'Weeral est né d\'un constat : la plupart des outils de cold email mutualisent leur infrastructure. Avec BYOA, chaque utilisateur conserve sa propre réputation d\'envoi.',
  alternates: { canonical: 'https://weeral.io/a-propos' },
  openGraph: {
    url: 'https://weeral.io/a-propos',
    title: 'À propos — Weeral',
    description: 'Le modèle BYOA : connecte ton propre Brevo, Mailgun, SendGrid ou AWS SES. Ta réputation, ton contrôle.',
  },
}

export default function AProposPage() {
  return (
    <div className="bg-[#07070f] min-h-screen">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        url: 'https://weeral.io/a-propos',
        name: 'À propos de Weeral',
        mainEntity: {
          '@type': 'Organization',
          name: 'Weeral',
          url: 'https://weeral.io',
          email: 'hello@weeral.co',
          foundingDate: '2024',
        },
      }} />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-32 pb-20 border-b border-[#1e1e3f]">
        <FadeIn>
          <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-6">À propos</p>
        </FadeIn>
        <FadeUp delay={0.1}>
          <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-[-0.04em] text-white mb-8">
            Construit par des<br />prospecteurs frustrés.
          </h1>
        </FadeUp>
        <FadeUp delay={0.2}>
          <p className="text-lg text-[#64748b] max-w-2xl leading-relaxed font-light">
            Weeral est né d&apos;un constat simple : la plupart des outils de cold email mutualisent leur infrastructure d&apos;envoi. Un mauvais expéditeur dans le pool plombe la réputation de tout le monde. On a décidé de changer ça.
          </p>
        </FadeUp>
      </section>

      {/* BYOA */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-b border-[#1e1e3f]">
        <div className="grid md:grid-cols-[200px_1fr] gap-12">
          <FadeIn>
            <p className="text-xs font-mono text-[#334155] uppercase tracking-widest pt-1">Pourquoi BYOA</p>
          </FadeIn>
          <FadeUp delay={0.1}>
            <h2 className="text-2xl font-black tracking-tight text-white mb-6">
              Ton expéditeur. Ton compte. Ta réputation.
            </h2>
            <p className="text-sm text-[#64748b] leading-relaxed mb-4">
              Le modèle BYOA (Bring Your Own Account) te permet d&apos;utiliser ton propre compte Brevo, Mailgun, SendGrid ou AWS SES. Tes emails partent de ton infrastructure, avec ta réputation — tu en bénéficies pleinement.
            </p>
            <p className="text-sm text-[#64748b] leading-relaxed">
              AWS SES est l&apos;un des services d&apos;envoi les plus fiables au monde. En le connectant directement à Weeral, tu obtiens une délivrabilité professionnelle à un coût marginal ($0.10 pour 1 000 emails).
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Ce qu'on fait / ce qu'on ne fait pas */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-b border-[#1e1e3f]">
        <div className="grid md:grid-cols-[200px_1fr] gap-12">
          <FadeIn>
            <p className="text-xs font-mono text-[#334155] uppercase tracking-widest pt-1">Périmètre</p>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-10">
            <FadeUp delay={0.1}>
              <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-widest mb-6">Ce qu&apos;on fait</p>
              <div className="space-y-4">
                {[
                  'Warmup automatique progressif',
                  'Monitoring bounces & plaintes',
                  'Gestion des campagnes multi-étapes',
                  'Import contacts CSV',
                  'Lien désinscription RGPD signé',
                  'Crons d\'envoi automatique',
                ].map(f => (
                  <div key={f} className="flex items-center gap-3 py-2.5 border-b border-[#1e1e3f]">
                    <span className="text-[#8b5cf6] font-mono text-sm">—</span>
                    <span className="text-sm text-[#94a3b8]">{f}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <p className="text-xs font-mono text-[#334155] uppercase tracking-widest mb-6">Ce qu&apos;on ne fait pas</p>
              <div className="space-y-4">
                {[
                  'Partager ton infrastructure d\'envoi',
                  'Stocker tes clés API en clair',
                  'Accéder à tes données d\'envoi',
                  'Facturer à l\'email',
                  'Vendre tes données',
                ].map(f => (
                  <div key={f} className="flex items-center gap-3 py-2.5 border-b border-[#1e1e3f]">
                    <span className="text-[#334155] font-mono text-sm line-through">✕</span>
                    <span className="text-sm text-[#475569] line-through decoration-[#334155]">{f}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Sécurité */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-b border-[#1e1e3f]">
        <div className="grid md:grid-cols-[200px_1fr] gap-12">
          <FadeIn>
            <p className="text-xs font-mono text-[#334155] uppercase tracking-widest pt-1">Sécurité</p>
          </FadeIn>
          <FadeUp delay={0.1}>
            <h2 className="text-2xl font-black tracking-tight text-white mb-6">AES-256-GCM.</h2>
            <p className="text-sm text-[#64748b] leading-relaxed">
              Tes credentials IAM AWS sont chiffrés avec <span className="text-white font-mono">AES-256-GCM</span> avant tout stockage. La clé de chiffrement réside dans les variables d&apos;environnement serveur — jamais en base de données. En cas de fuite de la base, tes credentials restent inutilisables.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <FadeUp>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-mono text-[#334155] uppercase tracking-widest mb-4">Contact</p>
              <h2 className="text-3xl font-black tracking-[-0.03em] text-white">Des questions ?</h2>
            </div>
            <a
              href="mailto:hello@weeral.co"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#8b5cf6] hover:text-white border border-[#8b5cf6]/30 hover:border-[#8b5cf6] px-5 py-2.5 rounded-lg transition-all"
            >
              hello@weeral.co →
            </a>
          </div>
        </FadeUp>
      </section>
    </div>
  )
}
