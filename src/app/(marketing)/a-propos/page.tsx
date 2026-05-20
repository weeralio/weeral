import type { Metadata } from 'next'
import { FadeUp, FadeIn } from '@/components/ui/motion'

export const metadata: Metadata = {
  title: 'À propos — Weeral',
  description: 'L\'histoire derrière Weeral et pourquoi on a construit un outil de cold email B2B BYOA.',
}

export default function AProposPage() {
  return (
    <div className="bg-[#07070f] min-h-screen">
      <section className="relative py-28 overflow-hidden">
        <div className="orb orb-purple w-[500px] h-[500px] -top-20 -right-20 opacity-20" />
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <FadeIn>
            <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">À propos</p>
          </FadeIn>
          <FadeUp delay={0.1}>
            <h1 className="text-5xl font-bold text-white mb-8 leading-tight">
              Construit par des<br />
              <span className="gradient-text">prospecteurs frustrés.</span>
            </h1>
          </FadeUp>

          <div className="space-y-10">
            <FadeUp delay={0.15}>
              <p className="text-lg text-[#94a3b8] leading-relaxed">
                Weeral est né d&apos;un constat simple : la plupart des outils de cold email mutualisent leur infrastructure d&apos;envoi. Résultat — un mauvais expéditeur dans le pool plombe la réputation de tout le monde.
              </p>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 flex items-center justify-center text-[#8b5cf6]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white">Pourquoi BYOA ?</h2>
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  Le modèle BYOA (Bring Your Own Account) te permet d&apos;utiliser ton propre compte AWS SES. Tes emails partent de ton infrastructure, avec ta réputation. Tu es le seul responsable de ta délivrabilité — et tu en bénéfices pleinement.
                </p>
                <p className="text-sm text-[#94a3b8] leading-relaxed mt-4">
                  AWS SES est l&apos;un des services d&apos;envoi les plus fiables au monde. En le connectant directement à Weeral, tu obtiens une délivrabilité professionnelle à un coût marginal.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.25}>
              <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 flex items-center justify-center text-[#8b5cf6]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white">Ce qu&apos;on fait, ce qu&apos;on ne fait pas</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider mb-3">On fait</p>
                    <ul className="space-y-2 text-sm text-[#94a3b8]">
                      {[
                        'Warmup automatique',
                        'Monitoring bounces & plaintes',
                        'Gestion des campagnes',
                        'Import contacts CSV',
                        'Lien désinscription RGPD',
                        'Crons d\'envoi automatique',
                      ].map(i => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-[#8b5cf6]" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-400/70 uppercase tracking-wider mb-3">On ne fait pas</p>
                    <ul className="space-y-2 text-sm text-[#94a3b8]">
                      {[
                        'Partager ton infrastructure',
                        'Stocker tes clés en clair',
                        'Toucher à tes données d\'envoi',
                        'Facturer à l\'email',
                        'Vendre tes données',
                      ].map(i => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-red-400/50" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 flex items-center justify-center text-[#8b5cf6]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white">Sécurité</h2>
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  Tes credentials IAM AWS sont chiffrés avec <span className="text-white font-medium">AES-256-GCM</span> avant stockage. La clé de chiffrement est en variable d&apos;environnement serveur — jamais en base de données. En cas de fuite, tes credentials restent inutilisables.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.35}>
              <div className="flex items-center gap-4 p-6 bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white mb-0.5">Des questions ?</p>
                  <a href="mailto:hello@weeral.co" className="text-sm text-[#8b5cf6] hover:text-[#a78bfa] transition-colors">
                    hello@weeral.co
                  </a>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
    </div>
  )
}
