'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Pour lancer votre prospection',
    monthly: 147,
    annual: 88,
    annualTotal: 1056,
    popular: false,
    cta: 'Commencer',
    ctaHref: '/checkout?plan=starter',
    accent: 'border-[#1e1e3f]',
    accentLabel: 'text-[#475569]',
    checkBg: 'bg-[#1e1e3f] border-[#3b3b6f]',
    checkColor: 'text-[#8b5cf6]',
    features: [
      { text: '3 domaines' },
      { text: '5 boîtes mail' },
      { text: '3 campagnes actives' },
      { text: 'Warmup automatique' },
      { text: 'Import CSV' },
      { text: 'Lien désinscription auto' },
      { text: 'Support email' },
    ],
    notIncluded: ['IA (génération & analyse)', 'Campagnes illimitées', 'White label'],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Pour les équipes sales qui scalent',
    monthly: 197,
    annual: 118,
    annualTotal: 1416,
    popular: true,
    cta: 'Commencer →',
    ctaHref: '/checkout?plan=growth',
    accent: 'border-[#8b5cf6]/40',
    accentLabel: 'text-[#8b5cf6]',
    checkBg: 'bg-[#8b5cf6]/20 border-[#8b5cf6]/40',
    checkColor: 'text-[#a78bfa]',
    features: [
      { text: '10 domaines' },
      { text: '20 boîtes mail' },
      { text: 'Campagnes illimitées' },
      { text: 'Warmup automatique' },
      { text: 'IA complète', sub: 'génération + analyse' },
      { text: 'Séquences multi-étapes' },
      { text: 'Répondeurs automatiques' },
      { text: 'Monitoring avancé' },
      { text: 'Alertes automatiques' },
      { text: 'Support prioritaire' },
    ],
    notIncluded: ['White label'],
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'Pour les agences et revendeurs',
    monthly: 347,
    annual: 208,
    annualTotal: 2496,
    popular: false,
    cta: 'Nous contacter',
    ctaHref: '/checkout?plan=agency',
    accent: 'border-amber-500/30',
    accentLabel: 'text-amber-400',
    checkBg: 'bg-amber-500/10 border-amber-500/30',
    checkColor: 'text-amber-300',
    features: [
      { text: 'Domaines illimités' },
      { text: 'Boîtes mail illimitées' },
      { text: 'Campagnes illimitées' },
      { text: 'Warmup automatique' },
      { text: 'IA complète', sub: 'génération + analyse' },
      { text: 'Séquences multi-étapes' },
      { text: 'Répondeurs automatiques' },
      { text: 'White label', sub: 'interface à votre marque' },
      { text: 'Monitoring avancé' },
      { text: 'Alertes automatiques' },
      { text: 'Support dédié' },
    ],
    notIncluded: [],
  },
]

const COMPARISON_ROWS: { label: string; starter: string; growth: string; agency: string }[] = [
  { label: 'Domaines',           starter: '3',           growth: '10',          agency: 'Illimités' },
  { label: 'Boîtes mail',        starter: '5',           growth: '20',          agency: 'Illimitées' },
  { label: 'Campagnes actives',  starter: '3',           growth: 'Illimitées',  agency: 'Illimitées' },
  { label: 'Warmup automatique', starter: '✓',           growth: '✓',           agency: '✓' },
  { label: 'Import CSV',         starter: '✓',           growth: '✓',           agency: '✓' },
  { label: 'Désinscription HMAC',starter: '✓',           growth: '✓',           agency: '✓' },
  { label: 'IA complète',        starter: '—',           growth: '✓',           agency: '✓' },
  { label: 'Séquences',          starter: '—',           growth: '✓',           agency: '✓' },
  { label: 'Répondeurs auto',    starter: '—',           growth: '✓',           agency: '✓' },
  { label: 'Monitoring avancé',  starter: '—',           growth: '✓',           agency: '✓' },
  { label: 'White label',        starter: '—',           growth: '—',           agency: '✓' },
  { label: 'Support',            starter: 'Email',       growth: 'Prioritaire', agency: 'Dédié' },
]

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-2.5 h-2.5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-3 h-3 text-[#3b3b6f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function PricingClient() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="bg-[#07070f] min-h-screen pb-28">

      {/* ─── Hero ─── */}
      <section className="relative py-24 text-center px-6 overflow-hidden">
        <div className="orb orb-purple w-[600px] h-[600px] -top-32 left-1/2 -translate-x-1/2 opacity-20" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Tarification</p>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 leading-tight">
            Simple.<br />
            <span className="gradient-text">Transparent.</span>
          </h1>
          <p className="text-lg text-[#94a3b8] max-w-xl mx-auto mb-10">
            Abonnement Weeral + frais AWS SES directs. Zéro frais caché, zéro frais par email côté nous.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !annual ? 'text-white' : 'text-[#475569] hover:text-[#94a3b8]'
              }`}
            >
              {!annual && (
                <motion.div
                  layoutId="billing-toggle"
                  className="absolute inset-0 bg-[#1e1e3f] rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">Mensuel</span>
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                annual ? 'text-white' : 'text-[#475569] hover:text-[#94a3b8]'
              }`}
            >
              {annual && (
                <motion.div
                  layoutId="billing-toggle"
                  className="absolute inset-0 bg-[#1e1e3f] rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">Annuel</span>
              <span className="relative z-10 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                −40%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── Cards ─── */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-3 gap-5 mb-16">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.popular
                  ? 'bg-[#111128] border-[#8b5cf6]/40 shadow-[0_0_40px_rgba(139,92,246,0.15)]'
                  : 'bg-[#0d0d1c] border-[#1e1e3f]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white text-xs font-bold px-5 py-2 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.5)] whitespace-nowrap">
                  ✦ Most Popular
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.accentLabel}`}>
                  {plan.name}
                </p>
                <p className="text-xs text-[#475569] mb-5">{plan.tagline}</p>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={annual ? 'annual' : 'monthly'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-5xl font-bold text-white tabular-nums">
                        {annual ? plan.annual : plan.monthly}€
                      </span>
                      <span className="text-base text-[#475569] pb-1.5">/mois</span>
                    </div>
                    {annual && (
                      <p className="text-xs text-[#475569]">
                        Facturé <span className="text-[#94a3b8] font-medium">{plan.annualTotal.toLocaleString()}€/an</span>
                      </p>
                    )}
                    {!annual && (
                      <p className="text-xs text-[#475569]">Facturé mensuellement</p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* CTA */}
              <Link
                href={`${plan.ctaHref}&billing=${annual ? 'annual' : 'monthly'}`}
                className={`block text-center text-sm font-medium py-3 px-4 rounded-xl mb-8 transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] hover:from-[#6d28d9] hover:to-[#7c3aed] text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:shadow-[0_0_32px_rgba(139,92,246,0.5)]'
                    : plan.id === 'agency'
                    ? 'border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400/50'
                    : 'border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-sm">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${plan.checkBg}`}>
                      <CheckIcon className={plan.checkColor} />
                    </div>
                    <span>
                      <span className="text-[#94a3b8]">{f.text}</span>
                      {f.sub && <span className="text-[#475569] text-xs ml-1">· {f.sub}</span>}
                    </span>
                  </li>
                ))}
                {plan.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm opacity-40">
                    <div className="w-4 h-4 rounded-full border border-[#1e1e3f] flex items-center justify-center shrink-0 mt-0.5">
                      <XIcon />
                    </div>
                    <span className="text-[#3b3b6f] line-through">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ─── AWS note ─── */}
        <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6 mb-16 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center shrink-0 text-[#8b5cf6]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1.5">Et les frais AWS SES ?</h3>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              AWS SES facture <span className="text-white font-medium">$0.10 pour 1&nbsp;000 emails</span>.
              Pour 10&nbsp;000 emails/mois, c&apos;est $1. Pour 100&nbsp;000, c&apos;est $10.
              Ces frais sont facturés directement par AWS sur <em>ton</em> compte — pas par nous.
            </p>
            <p className="text-xs text-[#475569] mt-1.5">Free tier AWS : 62&nbsp;000 emails/mois depuis une instance EC2.</p>
          </div>
        </div>

        {/* ─── Comparison table ─── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Comparaison complète</h2>
          <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e3f]">
                  <th className="text-left py-4 px-6 font-medium text-[#475569] text-xs uppercase tracking-wider">Fonctionnalité</th>
                  <th className="text-center py-4 px-4 font-semibold text-white">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold text-[#a78bfa]">Growth</th>
                  <th className="text-center py-4 px-4 font-semibold text-amber-400">Agency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e3f]">
                {COMPARISON_ROWS.map(({ label, starter, growth, agency }) => (
                  <tr key={label} className="hover:bg-[#111128] transition-colors">
                    <td className="py-3.5 px-6 text-[#94a3b8]">{label}</td>
                    {[
                      { val: starter, highlight: false },
                      { val: growth,  highlight: true },
                      { val: agency,  highlight: false, amber: true },
                    ].map(({ val, highlight, amber }) => (
                      <td
                        key={val + label}
                        className={`py-3.5 px-4 text-center font-medium ${
                          val === '—'
                            ? 'text-[#3b3b6f]'
                            : val === '✓'
                            ? amber ? 'text-amber-400' : highlight ? 'text-[#a78bfa]' : 'text-emerald-400'
                            : amber ? 'text-amber-300' : highlight ? 'text-[#a78bfa]' : 'text-[#94a3b8]'
                        }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── FAQ ─── */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Questions fréquentes</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              { q: 'Y a-t-il un essai gratuit ?', a: 'Tu peux créer un compte et configurer ton infrastructure. L\'abonnement est requis pour lancer des campagnes réelles.' },
              { q: 'Puis-je changer de plan ?', a: 'Oui, upgrade ou downgrade à tout moment. Le changement prend effet immédiatement, au prorata.' },
              { q: 'Y a-t-il un engagement ?', a: 'Non. Mensuel sans engagement. En annuel, tu es facturé pour 12 mois mais économises 40%.' },
              { q: 'Mes credentials AWS sont sécurisés ?', a: 'Chiffrés AES-256-GCM avant stockage. La clé est en variable d\'environnement serveur — même nous ne pouvons pas les lire en clair.' },
              { q: 'Qu\'est-ce que le White label ?', a: 'Le plan Agency te permet de déployer Weeral sous ta propre marque pour tes clients — logo, couleurs, domaine personnalisé.' },
              { q: 'Qu\'est-ce que l\'IA complète ?', a: 'Génération de séquences complètes (Opus), analyse et scoring du contenu (Sonnet), campagnes IA guidées avec brief par phase.' },
            ].map(({ q, a }) => (
              <div key={q} className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl p-5">
                <p className="font-medium text-white mb-2">{q}</p>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
