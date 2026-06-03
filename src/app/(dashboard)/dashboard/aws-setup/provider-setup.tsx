'use client'

import { useState, useTransition } from 'react'
import AwsSetupGuide from './guide'
import { saveProviderApiKey, deleteProviderConfig, type ProviderType } from './provider-actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = {
  id: 'aws' | ProviderType
  name: string
  tagline: string
  difficulty: number
  difficultyLabel: string
  setupTime: string
  freeTier: string
  requirements: string[]
  recommended?: boolean
  pricing: (v: number) => { price: string; note: string }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PROVIDERS: Provider[] = [
  {
    id: 'brevo',
    name: 'Brevo',
    tagline: 'La solution la plus simple — idéale pour démarrer',
    difficulty: 1,
    difficultyLabel: 'Très facile',
    setupTime: '5 min',
    freeTier: '9 000 emails/mois (300/jour)',
    requirements: ['Un compte email', 'Un nom de domaine (recommandé)'],
    recommended: true,
    pricing: (v) => {
      if (v <= 9000)   return { price: 'Gratuit',    note: '300 emails/jour' }
      if (v <= 20000)  return { price: '19€/mois',   note: 'Starter 20k' }
      if (v <= 40000)  return { price: '29€/mois',   note: 'Starter 40k' }
      if (v <= 60000)  return { price: '39€/mois',   note: 'Starter 60k' }
      if (v <= 100000) return { price: '59€/mois',   note: 'Starter 100k' }
      return                 { price: '~99€+/mois',  note: 'Business' }
    },
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    tagline: 'Très fiable, populaire chez les devs',
    difficulty: 2,
    difficultyLabel: 'Facile',
    setupTime: '10 min',
    freeTier: '1 000 emails/mois inclus',
    requirements: ['Un compte email', 'Une carte bancaire (vérification)', 'Un nom de domaine'],
    pricing: (v) => {
      if (v <= 1000)  return { price: 'Gratuit',                                    note: '1 000 inclus' }
      if (v <= 50000) return { price: `~$${Math.round(v / 1000 * 0.80)}/mois`,     note: 'Flex $0.80/1k' }
      return                 { price: '$35/mois',                                   note: 'Foundation 50k' }
    },
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    tagline: 'Le standard de l\'industrie, analytics avancés',
    difficulty: 2,
    difficultyLabel: 'Facile',
    setupTime: '10 min',
    freeTier: '3 000 emails/mois (100/jour)',
    requirements: ['Un compte email', 'Un numéro de téléphone', 'Un nom de domaine'],
    pricing: (v) => {
      if (v <= 3000)   return { price: 'Gratuit',       note: '100 emails/jour' }
      if (v <= 50000)  return { price: '$19.95/mois',   note: 'Essentials' }
      if (v <= 100000) return { price: '$89.95/mois',   note: 'Pro' }
      return                  { price: '~$120+/mois',   note: 'Pro+' }
    },
  },
  {
    id: 'aws',
    name: 'AWS SES',
    tagline: 'Le moins cher à gros volume — configuration avancée',
    difficulty: 5,
    difficultyLabel: 'Expert',
    setupTime: '45–60 min',
    freeTier: '62 000 emails/mois (depuis EC2)',
    requirements: ['Compte AWS', 'Carte bancaire', 'Nom de domaine', 'Connaissances IAM & politiques'],
    pricing: (v) => {
      if (v === 0) return { price: '~$0/mois',  note: '$0.10/1 000 emails' }
      return             { price: `~$${(v / 1000 * 0.10).toFixed(2)}/mois`, note: '$0.10/1 000 emails' }
    },
  },
]

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30',
  2: 'text-sky-400 bg-sky-950/40 border-sky-800/30',
  3: 'text-amber-400 bg-amber-950/40 border-amber-800/30',
  4: 'text-orange-400 bg-orange-950/40 border-orange-800/30',
  5: 'text-red-400 bg-red-950/40 border-red-800/30',
}

const VOLUME_STEPS = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000]

function formatVolume(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000)    return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

// ─── Difficulty dots ──────────────────────────────────────────────────────────

function DifficultyDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i < score ? 'bg-current opacity-100' : 'bg-[#1e1e3f] opacity-60'}`}
        />
      ))}
    </div>
  )
}

// ─── Provider card ────────────────────────────────────────────────────────────

function ProviderCard({
  provider, volume, onSelect, isConfigured,
}: {
  provider: Provider
  volume: number
  onSelect: () => void
  isConfigured: boolean
}) {
  const pricing = provider.pricing(volume)
  const isExpensive = provider.id === 'aws' && volume >= 50000

  return (
    <div className={`relative flex flex-col bg-[#0d0d1c] border rounded-2xl p-5 transition-all ${
      isConfigured
        ? 'border-emerald-700/40 hover:border-emerald-600/50 hover:shadow-[0_0_24px_rgba(52,211,153,0.08)]'
        : provider.recommended
          ? 'border-[#8b5cf6]/40 hover:border-[#8b5cf6]/60 hover:shadow-[0_0_24px_rgba(139,92,246,0.08)]'
          : 'border-[#1e1e3f] hover:border-[#8b5cf6]/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.08)]'
    }`}>
      {/* Badges */}
      {isConfigured && (
        <span className="absolute -top-3 left-5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 border border-emerald-700/50 text-emerald-300 tracking-wide flex items-center gap-1">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          CONNECTÉ
        </span>
      )}
      {!isConfigured && provider.recommended && (
        <span className="absolute -top-3 left-5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white tracking-wide">
          RECOMMANDÉ
        </span>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white">{provider.name}</h3>
          <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">{provider.tagline}</p>
        </div>
        <div className={`shrink-0 ml-3 px-2.5 py-1 rounded-lg border text-xs font-semibold ${DIFFICULTY_COLORS[provider.difficulty]}`}>
          {provider.difficultyLabel}
        </div>
      </div>

      {/* Difficulty + time */}
      <div className="flex items-center gap-4 mb-4">
        <div className={DIFFICULTY_COLORS[provider.difficulty]}>
          <DifficultyDots score={provider.difficulty} />
        </div>
        <span className="text-xs text-[#475569] flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {provider.setupTime}
        </span>
      </div>

      {/* Price */}
      <div className="bg-[#07070f] border border-[#1e1e3f] rounded-xl p-3 mb-4">
        <p className="text-xs text-[#475569] mb-1">Pour {formatVolume(volume)} emails/mois</p>
        <p className={`text-xl font-bold ${pricing.price === 'Gratuit' ? 'text-emerald-400' : isExpensive ? 'text-amber-400' : 'text-white'}`}>
          {pricing.price}
        </p>
        <p className="text-xs text-[#475569] mt-0.5">{pricing.note}</p>
        <p className="text-xs text-[#334155] mt-1.5">Gratuit : {provider.freeTier}</p>
      </div>

      {/* Requirements */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold text-[#334155] uppercase tracking-widest mb-2">Prérequis</p>
        <ul className="space-y-1.5">
          {provider.requirements.map((req) => (
            <li key={req} className="flex items-start gap-2 text-xs text-[#94a3b8]">
              <svg className="w-3 h-3 text-[#475569] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {req}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onSelect}
        className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
          isConfigured
            ? 'border border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/20'
            : provider.recommended
              ? 'bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white hover:from-[#6d28d9] hover:to-[#7c3aed] shadow-[0_0_16px_rgba(139,92,246,0.25)]'
              : 'border border-[#1e1e3f] text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white'
        }`}
      >
        {isConfigured ? `Gérer ${provider.name}` : `Choisir ${provider.name}`}
      </button>
    </div>
  )
}

// ─── API key form with "already configured" state ─────────────────────────────

function ApiKeyForm({
  provider, isConfigured, onSaved,
}: {
  provider: ProviderType
  isConfigured: boolean
  onSaved: () => void
}) {
  const [editing, setEditing]         = useState(!isConfigured)
  const [confirming, setConfirming]   = useState(false)
  const [key, setKey]                 = useState('')
  const [status, setStatus]           = useState<{ error?: string; success?: string } | null>(null)
  const [pending, startTransition]    = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await saveProviderApiKey(provider, key)
      if (result && 'success' in result) {
        setStatus({ success: result.success })
        setEditing(false)
        setKey('')
        onSaved()
      } else if (result && 'error' in result) {
        setStatus({ error: result.error })
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteProviderConfig(provider)
      setConfirming(false)
      setEditing(true)
      setStatus(null)
      onSaved()
    })
  }

  // Already configured — not in edit mode
  if (!editing) {
    return (
      <div className="mt-6 space-y-3">
        {/* Connected banner */}
        <div className="flex items-center gap-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-400">Connexion active</p>
            <p className="text-xs text-emerald-700">Clé API vérifiée et chiffrée</p>
          </div>
        </div>

        {/* Options */}
        {confirming ? (
          <div className="bg-[#07070f] border border-red-800/30 rounded-xl p-4 space-y-3">
            <p className="text-sm text-[#94a3b8]">Supprimer la connexion ? Les campagnes utilisant ce provider s&apos;arrêteront.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={pending}
                className="flex-1 py-2 rounded-xl bg-red-900/40 border border-red-800/40 text-red-400 text-sm hover:bg-red-900/60 disabled:opacity-50 transition-all"
              >
                {pending ? '…' : 'Confirmer la suppression'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-2 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:text-white transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(true); setStatus(null) }}
              className="flex-1 py-2.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:border-[#8b5cf6]/40 hover:text-white transition-all"
            >
              Modifier la clé API
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="flex-1 py-2.5 rounded-xl border border-red-800/30 text-red-400 text-sm hover:bg-red-950/20 transition-all"
            >
              Déconnecter
            </button>
          </div>
        )}
      </div>
    )
  }

  // Edit / first-time setup
  return (
    <div className="mt-6 bg-[#07070f] border border-[#1e1e3f] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          {isConfigured ? 'Remplacer la clé API' : 'Entrer ta clé API'}
        </p>
        {isConfigured && (
          <button onClick={() => { setEditing(false); setStatus(null); setKey('') }} className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors">
            Annuler
          </button>
        )}
      </div>
      <input
        type="password"
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="Colle ta clé API ici"
        onKeyDown={e => e.key === 'Enter' && key.trim() && handleSave()}
        autoFocus
        className="w-full bg-[#0d0d1c] border border-[#1e1e3f] text-white rounded-xl px-4 py-3 text-sm font-mono placeholder-[#334155] focus:outline-none focus:border-[#8b5cf6]/60 focus:ring-1 focus:ring-[#8b5cf6]/30 transition-all"
      />
      {status?.error   && <p className="text-xs text-red-400">{status.error}</p>}
      {status?.success && <p className="text-xs text-emerald-400">{status.success}</p>}
      <button
        onClick={handleSave}
        disabled={pending || !key.trim()}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {pending ? 'Vérification...' : 'Vérifier & sauvegarder'}
      </button>
    </div>
  )
}

// ─── Shared guide helpers ─────────────────────────────────────────────────────

function ExternalLink({ href, children }: { children: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#8b5cf6] hover:text-[#a78bfa] underline underline-offset-2 transition-colors text-sm">
      {children}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-xs font-bold text-[#8b5cf6]">
        {num}
      </div>
      <div className="flex-1 pb-6 border-l border-[#1e1e3f] pl-4 last:border-l-0">
        <p className="text-sm font-semibold text-white mb-2">{title}</p>
        <div className="text-sm text-[#94a3b8] space-y-2">{children}</div>
      </div>
    </div>
  )
}

// ─── Provider guides ──────────────────────────────────────────────────────────

function BrevoGuide({ isConfigured, onSaved }: { isConfigured: boolean; onSaved: () => void }) {
  return (
    <div className="space-y-0">
      <Step num={1} title="Créer un compte Brevo">
        <p>Va sur <ExternalLink href="https://app.brevo.com/account/register">brevo.com</ExternalLink> et crée un compte gratuit (email + mot de passe, pas de carte requise).</p>
      </Step>
      <Step num={2} title="Vérifier tes domaines">
        <p>Dans Brevo : <strong className="text-white">Paramètres → Expéditeurs & IP → Domaines → Ajouter un domaine</strong></p>
        <p>Tu peux ajouter <strong className="text-white">autant de domaines que tu veux</strong> — la clé API couvre tous les domaines vérifiés. Ajoute les enregistrements DNS fournis (DKIM + DMARC) chez ton registrar.</p>
      </Step>
      <Step num={3} title="Obtenir ta clé API">
        <p>Dans Brevo : <strong className="text-white">Paramètres → Clés API → Générer une nouvelle clé API</strong></p>
        <p>Copie la clé — elle commence par <code className="bg-[#1e1e3f] text-[#a78bfa] px-1.5 py-0.5 rounded text-xs">xkeysib-</code></p>
      </Step>
      <Step num={4} title={isConfigured ? 'Connexion Brevo' : 'Coller ta clé ici'}>
        <ApiKeyForm provider="brevo" isConfigured={isConfigured} onSaved={onSaved} />
      </Step>
    </div>
  )
}

function MailgunGuide({ isConfigured, onSaved }: { isConfigured: boolean; onSaved: () => void }) {
  return (
    <div className="space-y-0">
      <Step num={1} title="Créer un compte Mailgun">
        <p>Va sur <ExternalLink href="https://signup.mailgun.com/new/signup">mailgun.com</ExternalLink>. Une carte bancaire est requise pour la vérification.</p>
      </Step>
      <Step num={2} title="Ajouter et vérifier tes domaines">
        <p>Dans Mailgun : <strong className="text-white">Sending → Domains → Add New Domain</strong></p>
        <p>Ajoute les enregistrements DNS fournis (SPF, DKIM, CNAME), puis clique <strong className="text-white">Verify DNS Settings</strong>.</p>
      </Step>
      <Step num={3} title="Créer une clé API">
        <p>Dans Mailgun : <strong className="text-white">Settings → API Keys → Create API Key</strong></p>
        <p>Crée une clé <strong className="text-white">Private API Key</strong> — commence par <code className="bg-[#1e1e3f] text-[#a78bfa] px-1.5 py-0.5 rounded text-xs">key-</code></p>
      </Step>
      <Step num={4} title={isConfigured ? 'Connexion Mailgun' : 'Coller ta clé ici'}>
        <ApiKeyForm provider="mailgun" isConfigured={isConfigured} onSaved={onSaved} />
      </Step>
    </div>
  )
}

function SendgridGuide({ isConfigured, onSaved }: { isConfigured: boolean; onSaved: () => void }) {
  return (
    <div className="space-y-0">
      <Step num={1} title="Créer un compte SendGrid">
        <p>Va sur <ExternalLink href="https://signup.sendgrid.com/">sendgrid.com</ExternalLink>. Un numéro de téléphone est requis.</p>
      </Step>
      <Step num={2} title="Authentifier tes domaines">
        <p>Dans SendGrid : <strong className="text-white">Settings → Sender Authentication → Authenticate a Domain</strong></p>
        <p>Ajoute les enregistrements CNAME fournis chez ton registrar.</p>
      </Step>
      <Step num={3} title="Créer une clé API">
        <p>Dans SendGrid : <strong className="text-white">Settings → API Keys → Create API Key</strong></p>
        <p>Choisis <strong className="text-white">Full Access</strong> ou <strong className="text-white">Mail Send</strong>. La clé commence par <code className="bg-[#1e1e3f] text-[#a78bfa] px-1.5 py-0.5 rounded text-xs">SG.</code></p>
      </Step>
      <Step num={4} title={isConfigured ? 'Connexion SendGrid' : 'Coller ta clé ici'}>
        <ApiKeyForm provider="sendgrid" isConfigured={isConfigured} onSaved={onSaved} />
      </Step>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProviderSetup({
  hasAwsCredentials,
  existingRegion,
  configuredProviders,
}: {
  hasAwsCredentials: boolean
  existingRegion: string
  configuredProviders: ProviderType[]
}) {
  const [selected, setSelected]   = useState<Provider['id'] | null>(null)
  const [volumeIdx, setVolumeIdx] = useState(2)
  const [localConfigured, setLocalConfigured] = useState<ProviderType[]>(configuredProviders)

  const volume = VOLUME_STEPS[volumeIdx]
  const selectedProvider = PROVIDERS.find(p => p.id === selected)

  const isProviderConfigured = (id: Provider['id']) =>
    id === 'aws' ? hasAwsCredentials : localConfigured.includes(id as ProviderType)

  if (selected && selectedProvider) {
    const isConfigured = isProviderConfigured(selected)

    return (
      <div className="space-y-6">
        {/* Back */}
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Changer de fournisseur
        </button>

        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">{selectedProvider.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${DIFFICULTY_COLORS[selectedProvider.difficulty]}`}>
                {selectedProvider.difficultyLabel}
              </span>
              <span className="text-xs text-[#475569]">~{selectedProvider.setupTime}</span>
            </div>
          </div>
          {isConfigured && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-3 py-1.5 rounded-xl">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Connecté
            </span>
          )}
        </div>

        {selected === 'aws' && (
          <AwsSetupGuide hasCredentials={hasAwsCredentials} existingRegion={existingRegion} />
        )}
        {selected === 'brevo' && (
          <BrevoGuide
            isConfigured={localConfigured.includes('brevo')}
            onSaved={() => setLocalConfigured(prev => prev.includes('brevo') ? prev : [...prev, 'brevo'])}
          />
        )}
        {selected === 'mailgun' && (
          <MailgunGuide
            isConfigured={localConfigured.includes('mailgun')}
            onSaved={() => setLocalConfigured(prev => prev.includes('mailgun') ? prev : [...prev, 'mailgun'])}
          />
        )}
        {selected === 'sendgrid' && (
          <SendgridGuide
            isConfigured={localConfigured.includes('sendgrid')}
            onSaved={() => setLocalConfigured(prev => prev.includes('sendgrid') ? prev : [...prev, 'sendgrid'])}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Volume calculator */}
      <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Calculateur de coût</p>
          <span className="text-sm font-bold text-[#8b5cf6]">{formatVolume(volume)} emails/mois</span>
        </div>
        <input
          type="range"
          min={0}
          max={VOLUME_STEPS.length - 1}
          value={volumeIdx}
          onChange={e => setVolumeIdx(Number(e.target.value))}
          className="w-full accent-[#8b5cf6] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#334155] mt-1">
          <span>1k</span>
          <span>10k</span>
          <span>50k</span>
          <span>100k</span>
          <span>500k</span>
        </div>
      </div>

      {/* Provider cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROVIDERS.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            volume={volume}
            onSelect={() => setSelected(p.id)}
            isConfigured={isProviderConfigured(p.id)}
          />
        ))}
      </div>
    </div>
  )
}
