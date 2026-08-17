import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MarketingNav from '@/components/marketing/nav'
import MarketingFooter from '@/components/marketing/footer'
import { FadeUp, FadeIn } from '@/components/ui/motion'
import { JsonLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Weeral — Cold email B2B automatisé | Warmup + IA + BYOA',
  description: 'Automatise tes campagnes de cold email B2B. Warmup automatique (14 ou 40 jours), rédaction IA, séquences multi-étapes. Connecte Brevo, Mailgun, SendGrid ou AWS SES en 5 minutes. 100 emails offerts.',
  alternates: { canonical: 'https://weeral.io' },
  openGraph: {
    url: 'https://weeral.io',
    title: 'Weeral — Cold email B2B automatisé',
    description: 'Warmup automatique, rédaction IA, BYOA (Brevo, Mailgun, SendGrid, AWS SES). 100 emails offerts, sans carte bancaire.',
  },
}

const FAQ_ITEMS = [
  { q: 'Quel expéditeur choisir ?', a: "Pour débuter, Brevo est le plus simple (compte gratuit, clé API en 5 minutes, 300 emails/jour offerts). Pour des volumes plus importants, Mailgun ou SendGrid. AWS SES est le moins cher à gros volume mais plus complexe à configurer." },
  { q: 'Est-ce que je paie par email envoyé ?', a: "Non. Tu paies un abonnement Weeral fixe (147€, 197€ ou 347€/mois) + les frais de ton expéditeur directement sur ton compte. Aucun frais caché, aucun frais par email côté Weeral." },
  { q: 'Le warmup est-il vraiment automatique ?', a: "Oui. Chaque jour, Weeral calcule le volume autorisé selon le jour de warmup du domaine et envoie automatiquement. Tu n'as rien à configurer une fois le domaine ajouté." },
  { q: 'Mes données et clés API sont-elles sécurisées ?', a: "Toutes les clés API sont chiffrées AES-256-GCM avant stockage en base. La clé de chiffrement est en variable d'environnement serveur — même notre équipe ne peut pas les lire en clair." },
  { q: 'Puis-je tester avant de payer ?', a: "Oui. 100 contacts et 100 emails sont offerts gratuitement à l'inscription, sans carte bancaire. Suffisant pour valider que Weeral correspond à ton usage." },
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Weeral',
        url: 'https://weeral.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'SaaS de cold email B2B avec warmup automatique, rédaction IA et modèle BYOA.',
        offers: [
          { '@type': 'Offer', name: 'Starter', price: '147', priceCurrency: 'EUR', billingDuration: 'P1M' },
          { '@type': 'Offer', name: 'Growth', price: '197', priceCurrency: 'EUR', billingDuration: 'P1M' },
          { '@type': 'Offer', name: 'Agency', price: '347', priceCurrency: 'EUR', billingDuration: 'P1M' },
        ],
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      }} />

      <MarketingNav />
      <main className="overflow-hidden bg-[#07070f]">

        {/* ─── HERO ─── */}
        <section className="relative min-h-screen flex flex-col justify-center px-6 pt-24 pb-16">
          {/* Subtle geometric background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1e1e3f] to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1e1e3f] to-transparent" />
            {/* Vertical accent line */}
            <div className="absolute top-24 bottom-24 left-[60%] w-px bg-gradient-to-b from-transparent via-[#1e1e3f] to-transparent hidden lg:block" />
          </div>

          <div className="max-w-7xl mx-auto w-full">
            <div className="grid lg:grid-cols-[1fr_420px] gap-16 items-center">

              {/* Left — Copy */}
              <div>
                <FadeIn delay={0.05}>
                  <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-8">
                    Cold email infrastructure — B2B
                  </p>
                </FadeIn>

                <FadeUp delay={0.1}>
                  <h1 className="text-[clamp(3rem,8vw,6.5rem)] font-black leading-[0.95] tracking-[-0.04em] text-white mb-8">
                    Prospecte.<br />
                    Chauffe.<br />
                    <span className="text-[#8b5cf6]">Convertis.</span>
                  </h1>
                </FadeUp>

                <FadeUp delay={0.2}>
                  <p className="text-lg text-[#64748b] max-w-lg leading-relaxed mb-10 font-light">
                    Ton infrastructure cold email complète — warmup automatique, séquences multi-étapes, délivrabilité optimisée. Ton expéditeur, tes données, ton contrôle.
                  </p>
                </FadeUp>

                <FadeUp delay={0.28}>
                  <div className="flex flex-wrap items-center gap-4 mb-12">
                    <Link href="/signup" className="inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold px-6 py-3.5 rounded-lg transition-colors text-sm">
                      Commencer gratuitement
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <Link href="/pricing" className="text-sm text-[#64748b] hover:text-white transition-colors">
                      Voir les tarifs →
                    </Link>
                  </div>
                  <p className="text-xs text-[#334155] font-mono">100 emails offerts · Aucune carte · 5 min de setup</p>
                </FadeUp>
              </div>

              {/* Right — Inbox mockup */}
              <FadeIn delay={0.35}>
                <div className="relative">
                  <div className="bg-[#0a0a18] border border-[#1e1e3f] rounded-xl overflow-hidden">
                    {/* Window chrome */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1e3f] bg-[#0d0d1c]">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1e1e3f]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1e1e3f]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1e1e3f]" />
                      </div>
                      <div className="flex-1 mx-3">
                        <div className="bg-[#111128] rounded-md h-5 w-48 mx-auto" />
                      </div>
                    </div>

                    {/* Campaign stats header */}
                    <div className="px-5 pt-5 pb-3 border-b border-[#1e1e3f]">
                      <p className="text-[10px] font-mono text-[#334155] mb-3 uppercase tracking-widest">Outreach Q2 — Scale-ups FR</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Envoyés', val: '2 847', color: 'text-white' },
                          { label: 'Ouverts', val: '63%', color: 'text-[#8b5cf6]' },
                          { label: 'Réponses', val: '8.4%', color: 'text-emerald-400' },
                          { label: 'Bounce', val: '0.2%', color: 'text-[#64748b]' },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <p className={`text-base font-black font-mono ${s.color}`}>{s.val}</p>
                            <p className="text-[9px] text-[#334155] mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Inbox rows */}
                    <div className="divide-y divide-[#0f0f24]">
                      {[
                        { name: 'Marie Dupont', co: 'Luko', subj: 'Re: Automatiser votre prospection', time: '09:41', badge: 'Réponse', badgeColor: 'text-emerald-400 bg-emerald-400/10' },
                        { name: 'Thomas Berger', co: 'Pennylane', subj: 'Re: Qualité des leads entrants', time: '09:12', badge: 'Réponse', badgeColor: 'text-emerald-400 bg-emerald-400/10' },
                        { name: 'Julie Martin', co: 'Alan', subj: 'Outreach Q2 — Scale-ups FR', time: '08:55', badge: 'Ouvert', badgeColor: 'text-[#8b5cf6] bg-[#8b5cf6]/10' },
                        { name: 'Paul Chevalier', co: 'Spendesk', subj: 'Outreach Q2 — Scale-ups FR', time: '08:30', badge: 'Envoyé', badgeColor: 'text-[#334155] bg-[#1e1e3f]' },
                        { name: 'Sarah Leroy', co: 'Swile', subj: 'Outreach Q2 — Scale-ups FR', time: '08:15', badge: 'Envoyé', badgeColor: 'text-[#334155] bg-[#1e1e3f]' },
                      ].map((r) => (
                        <div key={r.name} className="flex items-center gap-3 px-4 py-3 hover:bg-[#0d0d1c] transition-colors">
                          <div className="w-7 h-7 rounded-full bg-[#111128] border border-[#1e1e3f] flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-[#8b5cf6]">{r.name[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-semibold text-white">{r.name} <span className="text-[#334155] font-normal">· {r.co}</span></span>
                              <span className="text-[10px] text-[#334155] font-mono shrink-0 ml-2">{r.time}</span>
                            </div>
                            <p className="text-[11px] text-[#475569] truncate">{r.subj}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ${r.badgeColor}`}>{r.badge}</span>
                        </div>
                      ))}
                    </div>

                    {/* Warmup bar */}
                    <div className="px-4 py-3 border-t border-[#1e1e3f] bg-[#0d0d1c]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-[#334155]">WARMUP — outreach-q2.io</span>
                        <span className="text-[10px] font-mono text-[#8b5cf6]">Jour 18/40</span>
                      </div>
                      <div className="h-1 bg-[#111128] rounded-full overflow-hidden">
                        <div className="h-full w-[45%] bg-[#7c3aed] rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Floating stat */}
                  <div className="absolute -bottom-4 -left-6 bg-[#0d0d1c] border border-[#1e1e3f] rounded-lg px-4 py-3 shadow-xl">
                    <p className="text-[10px] text-[#334155] font-mono mb-0.5">RÉPUTATION DOMAINE</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black font-mono text-emerald-400">98</span>
                      <span className="text-xs text-[#334155]">/100</span>
                      <svg className="w-3.5 h-3.5 text-emerald-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </FadeIn>

            </div>
          </div>
        </section>

        {/* ─── EXPÉDITEURS ─── */}
        <FadeIn>
          <section className="border-y border-[#1e1e3f] py-8">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <p className="text-xs font-mono text-[#334155] uppercase tracking-widest">Compatible avec</p>
                <div className="flex flex-wrap items-center gap-8">
                  {['Brevo', 'Mailgun', 'SendGrid', 'AWS SES'].map(name => (
                    <span key={name} className="text-sm font-semibold text-[#3b3b6f] hover:text-[#8b5cf6] transition-colors cursor-default tracking-tight">{name}</span>
                  ))}
                </div>
                <p className="text-xs font-mono text-[#334155]">BYOA — ton infra, tes données</p>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ─── STATS ─── */}
        <section className="py-24 border-b border-[#1e1e3f]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#1e1e3f]">
              {[
                { num: '< 10min', label: 'De l\'inscription au premier email envoyé', sub: 'Setup guidé pas à pas' },
                { num: '0€', label: 'De frais par email côté Weeral', sub: 'Tu paies directement ton expéditeur' },
                { num: '40j', label: 'De warmup progressif automatique', sub: 'Réputation domaine maximale garantie' },
              ].map((s, i) => (
                <FadeUp key={i} delay={i * 0.1}>
                  <div className="py-10 px-8 text-center md:text-left">
                    <p className="text-5xl md:text-6xl font-black font-mono text-white tracking-tight mb-3">{s.num}</p>
                    <p className="text-sm text-[#94a3b8] font-medium mb-1">{s.label}</p>
                    <p className="text-xs text-[#334155]">{s.sub}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PROBLÈME / SOLUTION ─── */}
        <section className="py-28 relative">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-start">

              {/* Left */}
              <FadeUp>
                <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-6">Le problème</p>
                <h2 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.03em] text-white mb-8">
                  Les outils actuels te rendent dépendant.
                </h2>
                <div className="space-y-4">
                  {[
                    { bad: 'Frais par email qui explosent au volume', icon: '↗' },
                    { bad: 'Réputation partagée avec des milliers d\'autres', icon: '⚠' },
                    { bad: 'Données clients hébergées chez le fournisseur', icon: '🔒' },
                    { bad: 'Warmup manuel chronophage et imprévisible', icon: '⏱' },
                  ].map(({ bad, icon }) => (
                    <div key={bad} className="flex items-center gap-4 py-3 border-b border-[#1e1e3f]">
                      <span className="text-[#334155] font-mono text-sm w-6">{icon}</span>
                      <p className="text-[#64748b] text-sm line-through decoration-[#334155]">{bad}</p>
                    </div>
                  ))}
                </div>
              </FadeUp>

              {/* Right */}
              <FadeUp delay={0.15}>
                <p className="text-xs font-mono text-emerald-400 uppercase tracking-[0.2em] mb-6">La solution Weeral</p>
                <h2 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.03em] text-white mb-8">
                  Ton infra. Tes règles.
                </h2>
                <div className="space-y-4">
                  {[
                    { good: 'Abonnement fixe. Zéro frais par email côté nous.' },
                    { good: 'Réputation isolée par domaine. 100% à toi.' },
                    { good: 'Clés API chiffrées AES-256. Accès zéro de notre part.' },
                    { good: 'Warmup auto : volume calculé chaque jour, sans intervention.' },
                  ].map(({ good }) => (
                    <div key={good} className="flex items-center gap-4 py-3 border-b border-[#1e1e3f]">
                      <div className="w-5 h-5 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-[#94a3b8] text-sm">{good}</p>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ─── FONCTIONNALITÉS ─── */}
        <section id="fonctionnalites" className="py-28 bg-[#0a0a18] border-y border-[#1e1e3f]">
          <div className="max-w-6xl mx-auto px-6">
            <FadeUp>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 pb-8 border-b border-[#1e1e3f]">
                <div>
                  <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-4">Infrastructure</p>
                  <h2 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.03em] text-white">
                    Tout ce qu&apos;il faut<br />pour prospecter sérieusement.
                  </h2>
                </div>
                <Link href="/signup" className="shrink-0 text-sm font-medium text-[#8b5cf6] hover:text-white border border-[#8b5cf6]/30 hover:border-[#8b5cf6] px-5 py-2.5 rounded-lg transition-all">
                  Essayer gratuitement →
                </Link>
              </div>
            </FadeUp>

            <div className="grid md:grid-cols-2 gap-px bg-[#1e1e3f]">
              {[
                {
                  num: '01',
                  title: 'Warmup automatique',
                  desc: 'Mode Progressif (40j) ou Accéléré (14j). Volume calculé chaque jour. Réputation montée en charge sans intervention manuelle.',
                  tag: 'Délivrabilité',
                },
                {
                  num: '02',
                  title: 'BYOA — Ton expéditeur',
                  desc: 'Brevo, Mailgun, SendGrid, AWS SES. Chaque user a son infrastructure isolée. Tu gardes tes credentials, ta réputation, ta data.',
                  tag: 'Infrastructure',
                },
                {
                  num: '03',
                  title: 'Séquences multi-étapes',
                  desc: 'Crée des séquences de suivi automatiques avec délais personnalisés. Stop auto sur réponse, bounce ou désinscription.',
                  tag: 'Automatisation',
                },
                {
                  num: '04',
                  title: 'Analytics temps réel',
                  desc: 'Ouvertures, clics, réponses, bounces. Pause automatique si les seuils critiques sont dépassés. Alertes instantanées.',
                  tag: 'Performance',
                },
                {
                  num: '05',
                  title: 'Contacts & personnalisation',
                  desc: 'Import CSV, variables {{prénom}} {{entreprise}}, listes segmentées. Suppression auto des optouts et bounces.',
                  tag: 'CRM léger',
                },
                {
                  num: '06',
                  title: 'Conformité RGPD intégrée',
                  desc: 'Lien de désinscription signé HMAC ajouté automatiquement. Gestion des optouts immédiate. Clés chiffrées AES-256-GCM.',
                  tag: 'Compliance',
                },
              ].map((f) => (
                <FadeIn key={f.num}>
                  <div className="bg-[#0a0a18] p-8 group hover:bg-[#0d0d1c] transition-colors">
                    <div className="flex items-start justify-between mb-5">
                      <span className="text-[10px] font-mono text-[#334155]">{f.num}</span>
                      <span className="text-[10px] font-mono text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-1 rounded">{f.tag}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight mb-3">{f.title}</h3>
                    <p className="text-sm text-[#64748b] leading-relaxed">{f.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ─── COMMENT ÇA MARCHE ─── */}
        <section className="py-28 relative">
          <div className="max-w-6xl mx-auto px-6">
            <FadeUp>
              <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-4">Process</p>
              <h2 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.03em] text-white mb-16">
                Opérationnel en 4 étapes.
              </h2>
            </FadeUp>

            <div className="space-y-0 divide-y divide-[#1e1e3f]">
              {[
                { n: '01', title: 'Crée ton compte', desc: 'Inscription gratuite en 30 secondes. 100 contacts et 100 emails offerts pour tester, sans carte bancaire.' },
                { n: '02', title: 'Connecte ton expéditeur', desc: 'Colle ta clé API Brevo, Mailgun, SendGrid ou tes credentials AWS SES. L\'infrastructure est isolée pour ton compte.' },
                { n: '03', title: 'Importe tes contacts', desc: 'Glisse ton CSV. Variables de personnalisation détectées automatiquement. Dédoublonnage et validation en un clic.' },
                { n: '04', title: 'Lance et monitore', desc: 'Écris ton email, configure le warmup, envoie. Stats en temps réel, alertes automatiques, séquences de suivi sur pilote.' },
              ].map((s, i) => (
                <FadeUp key={s.n} delay={i * 0.08}>
                  <div className="grid md:grid-cols-[80px_1fr_1fr] gap-6 py-8 items-center group">
                    <span className="text-4xl font-black font-mono text-[#1e1e3f] group-hover:text-[#8b5cf6] transition-colors">{s.n}</span>
                    <h3 className="text-xl font-bold text-white tracking-tight">{s.title}</h3>
                    <p className="text-sm text-[#64748b] leading-relaxed">{s.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section className="py-28 bg-[#0a0a18] border-y border-[#1e1e3f]">
          <div className="max-w-6xl mx-auto px-6">
            <FadeUp>
              <div className="mb-16">
                <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-4">Tarifs</p>
                <h2 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.03em] text-white">
                  Fixe. Prévisible. Sans surprise.
                </h2>
              </div>
            </FadeUp>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Starter */}
              <FadeIn delay={0.05}>
                <div className="border border-[#1e1e3f] rounded-xl p-6 h-full flex flex-col hover:border-[#3b3b6f] transition-colors">
                  <div className="mb-6 pb-6 border-b border-[#1e1e3f]">
                    <p className="text-xs font-mono text-[#334155] uppercase tracking-widest mb-4">Starter</p>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black font-mono text-white">147</span>
                      <span className="text-lg text-[#334155] mb-1">€/mois</span>
                    </div>
                    <p className="text-xs text-[#334155] mt-2 font-mono">ou 88€/mois en annuel −40%</p>
                  </div>
                  <ul className="space-y-3 flex-1 mb-6">
                    {['3 domaines', '5 boîtes mail', '3 campagnes actives', 'Warmup automatique', '100 contacts & emails offerts'].map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-[#64748b]">
                        <span className="text-[#334155] font-mono">—</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/pricing" className="block text-center text-sm font-medium py-2.5 px-4 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white transition-all">
                    Voir le plan
                  </Link>
                </div>
              </FadeIn>

              {/* Growth */}
              <FadeIn delay={0.1}>
                <div className="border border-[#7c3aed]/50 rounded-xl p-6 h-full flex flex-col bg-[#0d0d1c] relative">
                  <div className="absolute top-4 right-4">
                    <span className="text-[10px] font-mono text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-1 rounded">POPULAIRE</span>
                  </div>
                  <div className="mb-6 pb-6 border-b border-[#1e1e3f]">
                    <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-widest mb-4">Growth</p>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black font-mono text-white">197</span>
                      <span className="text-lg text-[#334155] mb-1">€/mois</span>
                    </div>
                    <p className="text-xs text-[#334155] mt-2 font-mono">ou 118€/mois en annuel −40%</p>
                  </div>
                  <ul className="space-y-3 flex-1 mb-6">
                    {['10 domaines', '20 boîtes mail', 'Campagnes illimitées', 'Warmup automatique', 'Séquences multi-étapes', 'Support prioritaire'].map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-[#94a3b8]">
                        <span className="text-[#8b5cf6] font-mono">—</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/pricing" className="block text-center text-sm font-semibold py-2.5 px-4 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white transition-colors">
                    Voir le plan →
                  </Link>
                </div>
              </FadeIn>

              {/* Agency */}
              <FadeIn delay={0.15}>
                <div className="border border-[#1e1e3f] rounded-xl p-6 h-full flex flex-col hover:border-amber-500/30 transition-colors">
                  <div className="mb-6 pb-6 border-b border-[#1e1e3f]">
                    <p className="text-xs font-mono text-amber-500 uppercase tracking-widest mb-4">Agency</p>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black font-mono text-white">347</span>
                      <span className="text-lg text-[#334155] mb-1">€/mois</span>
                    </div>
                    <p className="text-xs text-[#334155] mt-2 font-mono">ou 208€/mois en annuel −40%</p>
                  </div>
                  <ul className="space-y-3 flex-1 mb-6">
                    {['Domaines illimités', 'Boîtes illimitées', 'Campagnes illimitées', 'Warmup automatique', 'Séquences illimitées', 'White label', 'Support dédié'].map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-[#64748b]">
                        <span className="text-amber-500 font-mono">—</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/pricing" className="block text-center text-sm font-medium py-2.5 px-4 rounded-lg border border-amber-500/20 text-amber-400 hover:bg-amber-500/5 transition-all">
                    Voir le plan
                  </Link>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.2}>
              <p className="text-xs font-mono text-[#334155] text-center mt-8">
                ABONNEMENT ANNUEL — ÉCONOMIE DE 40% ·{' '}
                <Link href="/pricing" className="text-[#8b5cf6] hover:text-white transition-colors">
                  COMPARAISON COMPLÈTE →
                </Link>
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-28">
          <div className="max-w-4xl mx-auto px-6">
            <FadeUp>
              <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-4">FAQ</p>
              <h2 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.03em] text-white mb-16">
                Questions directes,<br />réponses directes.
              </h2>
            </FadeUp>

            <div className="space-y-0 divide-y divide-[#1e1e3f]">
              {FAQ_ITEMS.map((faq, i) => (
                <FadeUp key={faq.q} delay={i * 0.06}>
                  <div className="py-7 grid md:grid-cols-[1fr_1.2fr] gap-6">
                    <p className="font-bold text-white text-sm leading-snug">{faq.q}</p>
                    <p className="text-sm text-[#64748b] leading-relaxed">{faq.a}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ─── */}
        <section className="py-28 px-6 border-t border-[#1e1e3f]">
          <FadeUp>
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
                <div>
                  <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-6">Prêt ?</p>
                  <h2 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-[-0.04em] text-white">
                    Lance ta première<br />campagne ce soir.
                  </h2>
                </div>
                <div className="flex flex-col gap-4 md:items-end shrink-0">
                  <Link href="/signup" className="inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold px-7 py-4 rounded-lg transition-colors text-sm">
                    Créer mon compte gratuit
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <p className="text-xs font-mono text-[#334155]">100 EMAILS OFFERTS · SANS CARTE BANCAIRE</p>
                </div>
              </div>
            </div>
          </FadeUp>
        </section>

      </main>
      <MarketingFooter />
    </>
  )
}
