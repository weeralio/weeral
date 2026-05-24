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
          <div className="orb orb-purple w-[600px] h-[600px] -top-32 -left-48 opacity-50" />
          <div className="orb orb-blue w-[500px] h-[500px] -bottom-20 -right-32 opacity-40" />
          <div className="orb orb-pink w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />

          <div className="relative z-10 max-w-5xl mx-auto">
            <FadeIn delay={0.05}>
              <div className="inline-flex items-center gap-2.5 text-xs font-medium text-[#94a3b8] bg-[#111128] border border-[#1e1e3f] rounded-full px-4 py-2 mb-10 shadow-[0_0_20px_rgba(139,92,246,0.08)]">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-[dot-pulse_2s_ease-in-out_infinite]" />
                Brevo · Mailgun · SendGrid · AWS SES — ton expéditeur, ton choix
              </div>
            </FadeIn>

            <FadeUp delay={0.1}>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-8">
                <span className="text-white">Cold email B2B.</span>
                <br />
                <span className="gradient-text">Automatisé de A à Z.</span>
              </h1>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto leading-relaxed mb-12">
                Connecte ton expéditeur email (Brevo, Mailgun, SendGrid ou AWS SES), importe tes contacts et lance des campagnes de prospection avec warmup automatique — réputation isolée, délivrabilité maximale, contrôle total.
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
              <p className="mt-5 text-xs text-[#475569]">100 emails offerts · Aucune carte requise · Setup en 5 minutes</p>
            </FadeUp>

            {/* App preview */}
            <FadeUp delay={0.45}>
              <div className="mt-20 relative max-w-3xl mx-auto">
                <div className="card-dark border-glow glow-purple p-1 rounded-2xl">
                  <div className="bg-[#0d0d1c] rounded-xl p-6 text-left">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-[#1e1e3f]" />
                      <div className="w-3 h-3 rounded-full bg-[#1e1e3f]" />
                      <div className="w-3 h-3 rounded-full bg-[#1e1e3f]" />
                      <div className="flex-1 bg-[#111128] rounded-md h-6 mx-4" />
                    </div>
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
                <div className="absolute -bottom-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent" />
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── BUILT ON ─── */}
        <FadeIn>
          <section className="border-y border-[#1e1e3f] py-10">
            <div className="max-w-6xl mx-auto px-6">
              <p className="text-xs text-[#475569] text-center uppercase tracking-widest mb-8">Compatible avec les meilleurs expéditeurs</p>
              <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
                {['Brevo', 'Mailgun', 'SendGrid', 'AWS SES', 'Next.js 16', 'Supabase'].map(name => (
                  <span key={name} className="text-sm font-medium text-[#3b3b6f] hover:text-[#8b5cf6] transition-colors">{name}</span>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ─── COMMENT ÇA MARCHE ─── */}
        <section className="py-28 border-y border-[#1e1e3f] bg-[#0d0d1c] relative overflow-hidden">
          <div className="orb orb-blue w-[500px] h-[500px] -bottom-40 left-1/2 -translate-x-1/2 opacity-15" />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeUp>
              <div className="text-center mb-20">
                <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Comment ça marche</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
                  Opérationnel en <span className="gradient-text">4 étapes</span>
                </h2>
                <p className="text-[#94a3b8]">Du compte créé à la première campagne en moins de 10 minutes.</p>
              </div>
            </FadeUp>

            <div className="grid md:grid-cols-4 gap-8 relative">
              <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px hidden md:block"
                style={{ background: 'linear-gradient(90deg, transparent, #1e1e3f 20%, #3b3b6f 50%, #1e1e3f 80%, transparent)' }}
              />
              {[
                { step: '01', title: 'Crée un compte', desc: 'Inscription gratuite en 30 secondes. 100 emails offerts pour tester, sans carte bancaire.' },
                { step: '02', title: 'Connecte ton expéditeur', desc: 'Choisis entre Brevo (5 min), Mailgun, SendGrid ou AWS SES. Colle ta clé API, c\'est tout.' },
                { step: '03', title: 'Ajoute tes contacts', desc: 'Importe un CSV ou ajoute manuellement. Crée des listes, segmente, personnalise.' },
                { step: '04', title: 'Lance ta campagne', desc: 'Écris ton email avec l\'IA, configure le warmup, et envoie. Les stats arrivent en temps réel.' },
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
                  Weeral gère le warmup, la délivrabilité et les séquences à ta place — tu te concentres sur le message.
                </p>
              </div>
            </FadeUp>

            <Stagger className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                  title: 'Ton expéditeur, ton choix',
                  desc: 'Brevo, Mailgun, SendGrid ou AWS SES. Connecte en 5 min avec ta clé API. Chaque utilisateur a son infrastructure isolée.',
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
                  title: 'Warmup automatique',
                  desc: 'Montée en charge progressive sur 14 jours. Volume augmente chaque jour selon un schedule calibré pour maximiser ta réputation.',
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
                  title: 'Rédaction IA',
                  desc: 'L\'IA génère ton email de prospection selon ta cible et ton secteur. Objet, intro, CTA — en quelques secondes.',
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                  title: 'Gestion des contacts',
                  desc: 'Import CSV en un clic, listes segmentées, variables de personnalisation {{prénom}} {{entreprise}} dans chaque email.',
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                  title: 'Analytics en temps réel',
                  desc: 'Taux d\'ouverture, de clics, de réponses, de bounces. Pause automatique si les seuils critiques sont dépassés.',
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
                  title: 'Conformité RGPD',
                  desc: 'Lien de désinscription signé ajouté automatiquement. Gestion des optouts immédiate. Clés chiffrées AES-256.',
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

        {/* ─── PRICING ─── */}
        <section className="py-28 relative">
          <div className="orb orb-purple w-[500px] h-[500px] -top-20 left-0 opacity-20" />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeUp>
              <div className="text-center mb-16">
                <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Tarification</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
                  Simple et transparent.<br />
                  <span className="gradient-text">Sans surprise.</span>
                </h2>
                <p className="text-[#94a3b8] max-w-lg mx-auto">
                  Un abonnement fixe. Aucun frais par email — tu paies directement ton expéditeur selon ton volume.
                </p>
              </div>
            </FadeUp>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {/* Starter */}
              <ScaleIn delay={0.08}>
                <div className="card-dark p-7 h-full flex flex-col">
                  <div className="mb-5">
                    <p className="text-xs font-bold text-[#475569] uppercase tracking-widest mb-2">Starter</p>
                    <div className="flex items-end gap-1 mb-1">
                      <p className="text-4xl font-bold text-white">147€</p>
                      <span className="text-base font-normal text-[#475569] mb-1">/mois</span>
                    </div>
                    <p className="text-xs text-emerald-400">ou 88€/mois en annuel (−40%)</p>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-7">
                    {['3 domaines', '5 boîtes mail', '3 campagnes actives', 'Warmup automatique', 'IA basique', '100 contacts & emails offerts'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-[#94a3b8]">
                        <div className="w-4 h-4 rounded-full bg-[#1e1e3f] border border-[#3b3b6f] flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/pricing" className="btn-ghost px-4 py-3 text-sm text-center block">Voir le plan</Link>
                </div>
              </ScaleIn>

              {/* Growth */}
              <ScaleIn delay={0.16}>
                <div className="relative p-7 rounded-2xl border-glow-bright bg-[#111128] h-full flex flex-col glow-purple-sm">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.4)] whitespace-nowrap">
                    ✦ Le plus populaire
                  </div>
                  <div className="mb-5">
                    <p className="text-xs font-bold text-[#8b5cf6] uppercase tracking-widest mb-2">Growth</p>
                    <div className="flex items-end gap-1 mb-1">
                      <p className="text-4xl font-bold text-white">197€</p>
                      <span className="text-base font-normal text-[#475569] mb-1">/mois</span>
                    </div>
                    <p className="text-xs text-emerald-400">ou 118€/mois en annuel (−40%)</p>
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
                  <Link href="/pricing" className="btn-primary px-4 py-3 text-sm text-center block">Voir le plan →</Link>
                </div>
              </ScaleIn>

              {/* Agency */}
              <ScaleIn delay={0.24}>
                <div className="bg-[#0d0d1c] border border-amber-500/20 rounded-2xl p-7 h-full flex flex-col">
                  <div className="mb-5">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Agency</p>
                    <div className="flex items-end gap-1 mb-1">
                      <p className="text-4xl font-bold text-white">347€</p>
                      <span className="text-base font-normal text-[#475569] mb-1">/mois</span>
                    </div>
                    <p className="text-xs text-emerald-400">ou 208€/mois en annuel (−40%)</p>
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
                  <Link href="/pricing" className="block text-center text-sm font-medium py-3 px-4 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400/50 transition-all">Voir le plan</Link>
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
                  q: 'Quel expéditeur choisir ?',
                  a: 'Pour débuter, Brevo est le plus simple (compte gratuit, clé API en 5 minutes, 300 emails/jour offerts). Pour des volumes plus importants, Mailgun ou SendGrid. AWS SES est le moins cher à gros volume mais plus complexe à configurer.',
                },
                {
                  q: 'Est-ce que je paie par email envoyé ?',
                  a: 'Non. Tu paies un abonnement Weeral fixe (147€, 197€ ou 347€/mois) + les frais de ton expéditeur directement sur ton compte (ex: Brevo gratuit jusqu\'à 9k emails/mois, AWS SES ~$0.10/1 000 emails). Aucun frais caché.',
                },
                {
                  q: 'Le warmup est-il vraiment automatique ?',
                  a: 'Oui. Chaque jour, Weeral calcule le volume autorisé selon le jour de warmup du domaine et envoie automatiquement. Tu n\'as rien à configurer une fois le domaine ajouté.',
                },
                {
                  q: 'Mes données et clés API sont-elles sécurisées ?',
                  a: 'Toutes les clés API sont chiffrées AES-256-GCM avant stockage en base. La clé de chiffrement est en variable d\'environnement serveur — même notre équipe ne peut pas les lire en clair.',
                },
                {
                  q: 'Puis-je tester avant de payer ?',
                  a: 'Oui. 100 contacts et 100 emails sont offerts gratuitement à l\'inscription, sans carte bancaire. Sufficient pour valider que Weeral correspond à ton usage.',
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
                100 emails offerts · Sans carte bancaire
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
                Lance ta première campagne<br />
                <span className="gradient-text">aujourd&apos;hui.</span>
              </h2>
              <p className="text-[#94a3b8] mb-10 max-w-lg mx-auto">
                Connecte Brevo en 5 minutes, importe tes contacts, et envoie ton premier email de prospection ce soir.
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
