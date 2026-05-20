import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MarketingNav from '@/components/marketing/nav'
import MarketingFooter from '@/components/marketing/footer'
import { FadeUp, FadeIn, Stagger, StaggerItem, ScaleIn } from '@/components/ui/motion'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <>
      <MarketingNav />
      <main className="overflow-hidden">

        {/* ─── HERO ─── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16 grid-pattern">
          {/* Animated orbs */}
          <div className="orb orb-purple w-[600px] h-[600px] -top-32 -left-48 opacity-50" />
          <div className="orb orb-blue w-[500px] h-[500px] -bottom-20 -right-32 opacity-40" />
          <div className="orb orb-pink w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />

          <div className="relative z-10 max-w-5xl mx-auto">
            {/* Badge */}
            <FadeIn delay={0.05}>
              <div className="inline-flex items-center gap-2.5 text-xs font-medium text-[#94a3b8] bg-[#111128] border border-[#1e1e3f] rounded-full px-4 py-2 mb-10 shadow-[0_0_20px_rgba(139,92,246,0.08)]">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-[dot-pulse_2s_ease-in-out_infinite]" />
                BYOA — Utilise ton propre compte AWS SES
              </div>
            </FadeIn>

            {/* Headline */}
            <FadeUp delay={0.1}>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-8">
                <span className="text-white">Cold email B2B.</span>
                <br />
                <span className="gradient-text">Sans compromis.</span>
              </h1>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto leading-relaxed mb-12">
                Connecte tes credentials AWS SES et lance des campagnes de prospection avec warmup automatique — réputation isolée, coût marginal, contrôle total.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup" className="btn-primary px-7 py-3.5 text-base inline-block">
                  Commencer gratuitement →
                </Link>
                <Link href="/pricing" className="btn-ghost px-7 py-3.5 text-base inline-block text-[#94a3b8]">
                  Voir les tarifs
                </Link>
              </div>
              <p className="mt-5 text-xs text-[#475569]">Aucune carte requise · Setup en 5 minutes</p>
            </FadeUp>

            {/* Floating email preview */}
            <FadeUp delay={0.45}>
              <div className="mt-20 relative max-w-3xl mx-auto">
                <div className="card-dark border-glow glow-purple p-1 rounded-2xl">
                  {/* Fake app screenshot */}
                  <div className="bg-[#0d0d1c] rounded-xl p-6 text-left">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-[#1e1e3f]" />
                      <div className="w-3 h-3 rounded-full bg-[#1e1e3f]" />
                      <div className="w-3 h-3 rounded-full bg-[#1e1e3f]" />
                      <div className="flex-1 bg-[#111128] rounded-md h-6 mx-4" />
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { label: 'Envoyés', val: '2 847' },
                        { label: 'Ouverts', val: '61%' },
                        { label: 'Réponses', val: '8.4%' },
                        { label: 'Bounce', val: '0.3%' },
                      ].map(s => (
                        <div key={s.label} className="bg-[#111128] border border-[#1e1e3f] rounded-lg p-3 text-center">
                          <p className="text-xs text-[#475569] mb-1">{s.label}</p>
                          <p className="text-sm font-semibold text-white">{s.val}</p>
                        </div>
                      ))}
                    </div>
                    {/* Campaign rows */}
                    <div className="space-y-2">
                      {[
                        { name: 'Outreach Q2 — Tech SaaS', status: 'En cours', color: 'text-[#8b5cf6]', dot: 'bg-[#8b5cf6]' },
                        { name: 'Follow-up Agences Paris', status: 'En pause', color: 'text-[#94a3b8]', dot: 'bg-[#1e1e3f]' },
                        { name: 'Warm intro — Scale-ups', status: 'Warmup', color: 'text-yellow-400', dot: 'bg-yellow-400' },
                      ].map(c => (
                        <div key={c.name} className="flex items-center justify-between bg-[#111128] border border-[#1e1e3f] rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                            <span className="text-sm text-[#94a3b8]">{c.name}</span>
                          </div>
                          <span className={`text-xs font-medium ${c.color}`}>{c.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Glow line */}
                <div className="absolute -bottom-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent" />
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── BUILT ON ─── */}
        <FadeIn>
          <section className="border-y border-[#1e1e3f] py-10">
            <div className="max-w-6xl mx-auto px-6">
              <p className="text-xs text-[#475569] text-center uppercase tracking-widest mb-8">Construit sur une infrastructure de confiance</p>
              <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
                {['AWS SES', 'Next.js 16', 'Supabase', 'Vercel', 'Trigger.dev'].map(name => (
                  <span key={name} className="text-sm font-medium text-[#3b3b6f] hover:text-[#8b5cf6] transition-colors">{name}</span>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ─── FEATURES ─── */}
        <section id="fonctionnalites" className="py-28 relative">
          <div className="orb orb-purple w-[400px] h-[400px] top-0 right-0 opacity-20" />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeUp>
              <div className="text-center mb-20">
                <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Fonctionnalités</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
                  Tout ce qu&apos;il faut pour<br />
                  <span className="gradient-text">prospecter à grande échelle</span>
                </h2>
                <p className="text-[#94a3b8] max-w-xl mx-auto">
                  Conçu pour les équipes sales qui veulent un contrôle total sur leur délivrabilité.
                </p>
              </div>
            </FadeUp>

            <Stagger className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  ),
                  title: 'BYOA AWS SES',
                  desc: 'Connecte tes propres credentials IAM. Chaque client a son infrastructure — personne ne partage ta réputation.',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ),
                  title: 'Warmup automatique',
                  desc: 'Montée en charge progressive sur 14 jours. Volume augmente chaque jour selon un schedule calibré.',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                  title: 'Monitoring bounce & spam',
                  desc: 'Détection temps réel via SES webhooks. Pause automatique si bounce > 5% ou plainte > 0.1%.',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ),
                  title: 'Import CSV',
                  desc: 'Importe tes listes en un clic. Variables de personnalisation dans chaque template.',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: 'Templates personnalisés',
                  desc: '{{prenom}}, {{entreprise}}, {{poste}} dans l\'objet et le corps. Lien désinscription auto.',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: 'Conformité légale',
                  desc: 'Lien de désinscription signé HMAC ajouté à chaque email. Gestion des optouts automatique.',
                },
              ].map((f) => (
                <StaggerItem key={f.title}>
                  <div className="card-dark p-6 h-full group cursor-default">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#111128] to-[#16163a] border border-[#1e1e3f] group-hover:border-[#8b5cf6]/40 flex items-center justify-center text-[#8b5cf6] mb-5 transition-all">
                      {f.icon}
                    </div>
                    <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-[#94a3b8] leading-relaxed">{f.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-28 border-y border-[#1e1e3f] bg-[#0d0d1c] relative overflow-hidden">
          <div className="orb orb-blue w-[500px] h-[500px] -bottom-40 left-1/2 -translate-x-1/2 opacity-15" />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeUp>
              <div className="text-center mb-20">
                <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Démarrage</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
                  Opérationnel en <span className="gradient-text">4 étapes</span>
                </h2>
                <p className="text-[#94a3b8]">Setup initial en moins de 10 minutes.</p>
              </div>
            </FadeUp>

            <div className="grid md:grid-cols-4 gap-8 relative">
              {/* Connector line (desktop) */}
              <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px hidden md:block"
                style={{ background: 'linear-gradient(90deg, transparent, #1e1e3f 20%, #3b3b6f 50%, #1e1e3f 80%, transparent)' }}
              />

              {[
                { step: '01', title: 'Crée un compte', desc: 'Inscription gratuite. Aucune carte bancaire requise.' },
                { step: '02', title: 'Connecte AWS SES', desc: 'Colle tes credentials IAM — chiffrés AES-256 avant stockage.' },
                { step: '03', title: 'Ajoute ton domaine', desc: 'Vérifie ton domaine. Le warmup démarre automatiquement.' },
                { step: '04', title: 'Lance ta campagne', desc: 'Importe les contacts, écris ton email, envoie.' },
              ].map((s, i) => (
                <FadeUp key={s.step} delay={i * 0.1}>
                  <div className="text-center relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] border border-[#8b5cf6]/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                      <span className="text-lg font-bold text-white">{s.step}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                    <p className="text-sm text-[#94a3b8] leading-relaxed">{s.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section className="py-28 relative">
          <div className="orb orb-purple w-[500px] h-[500px] -top-20 left-0 opacity-20" />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeUp>
              <div className="text-center mb-16">
                <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Tarification</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
                  Pas de frais par email.<br />
                  <span className="gradient-text">Jamais.</span>
                </h2>
                <p className="text-[#94a3b8] max-w-lg mx-auto">
                  Tu paies uniquement l&apos;abonnement Weeral + les frais AWS SES sur ton compte (~$0.10 / 1000 emails).
                </p>
              </div>
            </FadeUp>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {/* Starter */}
              <ScaleIn delay={0.08}>
                <div className="card-dark p-7 h-full flex flex-col">
                  <div className="mb-5">
                    <p className="text-xs font-bold text-[#475569] uppercase tracking-widest mb-2">Starter</p>
                    <p className="text-4xl font-bold text-white mb-1">$197<span className="text-base font-normal text-[#475569]">/mois</span></p>
                    <p className="text-xs text-[#475569]">3 domaines · 5 boîtes · IA basique</p>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-7">
                    {['3 domaines', '5 boîtes mail', '3 campagnes actives', 'Warmup automatique', 'IA basique'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-[#94a3b8]">
                        <div className="w-4 h-4 rounded-full bg-[#1e1e3f] border border-[#3b3b6f] flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="btn-ghost px-4 py-3 text-sm text-center block">Commencer</Link>
                </div>
              </ScaleIn>

              {/* Growth — Most Popular */}
              <ScaleIn delay={0.16}>
                <div className="relative p-7 rounded-2xl border-glow-bright bg-[#111128] h-full flex flex-col glow-purple-sm">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.4)] whitespace-nowrap">
                    ✦ Most Popular
                  </div>
                  <div className="mb-5">
                    <p className="text-xs font-bold text-[#8b5cf6] uppercase tracking-widest mb-2">Growth</p>
                    <p className="text-4xl font-bold text-white mb-1">$247<span className="text-base font-normal text-[#475569]">/mois</span></p>
                    <p className="text-xs text-[#475569]">10 domaines · 20 boîtes · IA complète</p>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-7">
                    {['10 domaines', '20 boîtes mail', 'Campagnes illimitées', 'Warmup automatique', 'IA complète', 'Séquences multi-étapes', 'Support prioritaire'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-[#94a3b8]">
                        <div className="w-4 h-4 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="btn-primary px-4 py-3 text-sm text-center block">Commencer →</Link>
                </div>
              </ScaleIn>

              {/* Agency */}
              <ScaleIn delay={0.24}>
                <div className="bg-[#0d0d1c] border border-amber-500/20 rounded-2xl p-7 h-full flex flex-col">
                  <div className="mb-5">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Agency</p>
                    <p className="text-4xl font-bold text-white mb-1">$345<span className="text-base font-normal text-[#475569]">/mois</span></p>
                    <p className="text-xs text-[#475569]">Illimité · IA complète · White label</p>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-7">
                    {['Domaines illimités', 'Boîtes illimitées', 'Campagnes illimitées', 'Warmup automatique', 'IA complète', 'White label', 'Support dédié'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-[#94a3b8]">
                        <div className="w-4 h-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="block text-center text-sm font-medium py-3 px-4 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400/50 transition-all">Nous contacter</Link>
                </div>
              </ScaleIn>
            </div>

            <FadeIn delay={0.3}>
              <p className="text-center mt-8 text-sm text-[#475569]">
                Économisez <span className="text-emerald-400 font-medium">40%</span> avec le plan annuel ·{' '}
                <Link href="/pricing" className="text-[#8b5cf6] hover:text-[#a78bfa] underline underline-offset-4 transition-colors">
                  Voir la comparaison complète →
                </Link>
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-28 border-t border-[#1e1e3f] relative">
          <div className="orb orb-pink w-[400px] h-[400px] top-0 right-1/4 opacity-15" />
          <div className="max-w-3xl mx-auto px-6 relative z-10">
            <FadeUp>
              <div className="text-center mb-16">
                <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">FAQ</p>
                <h2 className="text-4xl font-bold text-white">Questions fréquentes</h2>
              </div>
            </FadeUp>

            <Stagger className="space-y-4" staggerDelay={0.07}>
              {[
                {
                  q: 'Pourquoi BYOA plutôt qu\'un pool mutualisé ?',
                  a: 'Avec un pool mutualisé, un seul mauvais expéditeur ruine la réputation de tout le monde. BYOA garantit que ta réputation ne dépend que de toi — personne ne peut te polluer.',
                },
                {
                  q: 'Combien ça coûte vraiment ?',
                  a: 'Abonnement Weeral + frais AWS SES ($0.10 / 1000 emails hors free tier). Pour 10 000 emails/mois : $49 + $1. C\'est tout — aucun frais caché.',
                },
                {
                  q: 'Le warmup est-il vraiment automatique ?',
                  a: 'Oui. Chaque jour à 5h UTC, notre cron calcule le volume autorisé selon le jour de warmup du domaine et envoie automatiquement. Tu n\'as rien à configurer.',
                },
                {
                  q: 'Que se passe-t-il si mon taux de bounce dépasse 5% ?',
                  a: 'La campagne est automatiquement mise en pause et le domaine bloqué. Cela protège ta réputation avant qu\'AWS ne te sanctionne.',
                },
                {
                  q: 'Mes credentials AWS sont-ils sécurisés ?',
                  a: 'Chiffrés AES-256-GCM avant stockage. La clé de chiffrement est en variable d\'environnement serveur — même nous ne pouvons pas les lire en clair.',
                },
              ].map((faq) => (
                <StaggerItem key={faq.q}>
                  <div className="card-dark p-6 group cursor-default">
                    <p className="font-medium text-white mb-2.5 group-hover:text-[#a78bfa] transition-colors">{faq.q}</p>
                    <p className="text-sm text-[#94a3b8] leading-relaxed">{faq.a}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ─── CTA FINAL ─── */}
        <ScaleIn>
          <section className="py-28 px-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2d1b69] via-[#1e1b4b] to-[#07070f]" />
            <div className="orb orb-purple w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
            <div className="relative z-10 max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#a78bfa] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-full px-4 py-2 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                Prêt à prospecter ?
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
                Infrastructure pro.<br />
                <span className="gradient-text">Prix accessible.</span>
              </h2>
              <p className="text-[#94a3b8] mb-10 max-w-lg mx-auto">
                Setup en 5 minutes. Aucune carte requise. Commence avec ton compte AWS SES en sandbox et monte en production quand tu es prêt.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup" className="btn-primary px-8 py-4 text-base inline-block">
                  Créer mon compte gratuit →
                </Link>
                <Link href="/pricing" className="btn-ghost px-8 py-4 text-base inline-block text-[#94a3b8]">
                  Voir les tarifs
                </Link>
              </div>
            </div>
          </section>
        </ScaleIn>

      </main>
      <MarketingFooter />
    </>
  )
}
