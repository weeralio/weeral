'use client'

import { useState, useTransition } from 'react'
import AwsSetupGuide from './guide'
import { saveProviderApiKey, type ProviderType } from './provider-actions'

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
  provider, volume, onSelect,
}: {
  provider: Provider
  volume: number
  onSelect: () => void
}) {
  const pricing = provider.pricing(volume)
  const isExpensive = provider.id === 'aws' && volume >= 50000

  return (
    <div className={`relative flex flex-col bg-[#0d0d1c] border rounded-2xl p-5 transition-all hover:border-[#8b5cf6]/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.08)] ${
      provider.recommended ? 'border-[#8b5cf6]/40' : 'border-[#1e1e3f]'
    }`}>
      {provider.recommended && (
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
          provider.recommended
            ? 'bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white hover:from-[#6d28d9] hover:to-[#7c3aed] shadow-[0_0_16px_rgba(139,92,246,0.25)]'
            : 'border border-[#1e1e3f] text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white'
        }`}
      >
        Choisir {provider.name}
      </button>
    </div>
  )
}

// ─── Simple API key form (Brevo / Mailgun / SendGrid) ─────────────────────────

function ApiKeyForm({ provider, onSaved }: { provider: ProviderType; onSaved: () => void }) {
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await saveProviderApiKey(provider, key)
      if (result && 'success' in result) {
        setStatus({ success: result.success })
        onSaved()
      } else if (result && 'error' in result) {
        setStatus({ error: result.error })
      }
    })
  }

  return (
    <div className="mt-6 bg-[#07070f] border border-[#1e1e3f] rounded-xl p-5 space-y-3">
      <p className="text-sm font-semibold text-white">Entrer ta clé API</p>
      <input
        type="password"
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="Colle ta clé API ici"
        className="w-full bg-[#0d0d1c] border border-[#1e1e3f] text-white rounded-xl px-4 py-3 text-sm font-mono placeholder-[#334155] focus:outline-none focus:border-[#8b5cf6]/60 focus:ring-1 focus:ring-[#8b5cf6]/30 transition-all"
      />
      {status?.error && <p className="text-xs text-red-400">{status.error}</p>}
      {status?.success && <p className="text-xs text-emerald-400">{status.success}</p>}
      <button
        onClick={handleSave}
        disabled={pending || !key.trim()}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {pending ? 'Sauvegarde...' : 'Sauvegarder la clé API'}
      </button>
    </div>
  )
}

// ─── Guides ───────────────────────────────────────────────────────────────────

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
      <div className="flex-1 pb-6 border-l border-[#1e1e3f] pl-4 -ml-0 last:border-l-0">
        <p className="text-sm font-semibold text-white mb-2">{title}</p>
        <div className="text-sm text-[#94a3b8] space-y-2">{children}</div>
      </div>
    </div>
  )
}

function SqlMigration() {
  const [copied, setCopied] = useState(false)
  const sql = `CREATE TABLE IF NOT EXISTS provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL CHECK (provider IN ('brevo','mailgun','sendgrid')),
  api_key_encrypted text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own provider configs" ON provider_configs
  FOR ALL USING (auth.uid() = user_id);`

  return (
    <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-4 mb-6">
      <p className="text-xs font-semibold text-amber-400 mb-2">⚠ Migration SQL requise (une seule fois)</p>
      <p className="text-xs text-amber-300/70 mb-3">
        Exécute ce SQL dans <ExternalLink href="https://supabase.com/dashboard/project/koaacxwnhfortkhrjhlo/sql/new">Supabase → SQL Editor</ExternalLink> avant de sauvegarder ta clé.
      </p>
      <div className="relative bg-[#07070f] rounded-lg p-3 font-mono text-xs text-[#a78bfa] whitespace-pre overflow-x-auto">
        {sql}
        <button
          onClick={() => { navigator.clipboard.writeText(sql); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="absolute top-2 right-2 text-[#475569] hover:text-white text-xs transition-colors"
        >
          {copied ? '✓' : 'Copier'}
        </button>
      </div>
    </div>
  )
}

function BrevoGuide({ onSaved }: { onSaved: () => void }) {
  return (
    <div>
      <div className="space-y-0">
        <Step num={1} title="Créer un compte Brevo">
          <p>Va sur <ExternalLink href="https://app.brevo.com/account/register">brevo.com</ExternalLink> et crée un compte gratuit (email + mot de passe, pas de carte requise).</p>
        </Step>
        <Step num={2} title="Vérifier ton domaine">
          <p>Dans Brevo : <strong className="text-white">Paramètres → Expéditeurs & IP → Domaines → Ajouter un domaine</strong></p>
          <p>Entre ton domaine (ex: <code className="bg-[#1e1e3f] text-[#a78bfa] px-1.5 py-0.5 rounded text-xs">weeral.io</code>) et ajoute les enregistrements DNS fournis (DKIM + DMARC) chez ton registrar.</p>
        </Step>
        <Step num={3} title="Obtenir ta clé API">
          <p>Dans Brevo : <strong className="text-white">Paramètres → Clés API → Générer une nouvelle clé API</strong></p>
          <p>Copie la clé — elle commence par <code className="bg-[#1e1e3f] text-[#a78bfa] px-1.5 py-0.5 rounded text-xs">xkeysib-</code></p>
        </Step>
        <Step num={4} title="Coller ta clé ici">
          <ApiKeyForm provider="brevo" onSaved={onSaved} />
        </Step>
      </div>
    </div>
  )
}

function MailgunGuide({ onSaved }: { onSaved: () => void }) {
  return (
    <div>
      <div className="space-y-0">
        <Step num={1} title="Créer un compte Mailgun">
          <p>Va sur <ExternalLink href="https://signup.mailgun.com/new/signup">mailgun.com</ExternalLink>. Une carte bancaire est requise pour la vérification (aucun débit si tu restes dans la limite gratuite).</p>
        </Step>
        <Step num={2} title="Ajouter et vérifier ton domaine">
          <p>Dans Mailgun : <strong className="text-white">Sending → Domains → Add New Domain</strong></p>
          <p>Ajoute les enregistrements DNS fournis (SPF, DKIM, CNAME) chez ton registrar, puis clique <strong className="text-white">Verify DNS Settings</strong>.</p>
        </Step>
        <Step num={3} title="Créer une clé API">
          <p>Dans Mailgun : <strong className="text-white">Settings → API Keys → Create API Key</strong></p>
          <p>Crée une clé de type <strong className="text-white">Private API Key</strong>. Elle commence par <code className="bg-[#1e1e3f] text-[#a78bfa] px-1.5 py-0.5 rounded text-xs">key-</code></p>
        </Step>
        <Step num={4} title="Coller ta clé ici">
          <ApiKeyForm provider="mailgun" onSaved={onSaved} />
        </Step>
      </div>
    </div>
  )
}

function SendgridGuide({ onSaved }: { onSaved: () => void }) {
  return (
    <div>
      <div className="space-y-0">
        <Step num={1} title="Créer un compte SendGrid">
          <p>Va sur <ExternalLink href="https://signup.sendgrid.com/">sendgrid.com</ExternalLink>. Un numéro de téléphone est requis pour la vérification.</p>
        </Step>
        <Step num={2} title="Authentifier ton domaine">
          <p>Dans SendGrid : <strong className="text-white">Settings → Sender Authentication → Authenticate a Domain</strong></p>
          <p>Suis les étapes et ajoute les enregistrements CNAME fournis chez ton registrar.</p>
        </Step>
        <Step num={3} title="Créer une clé API">
          <p>Dans SendGrid : <strong className="text-white">Settings → API Keys → Create API Key</strong></p>
          <p>Choisis <strong className="text-white">Full Access</strong> ou au minimum <strong className="text-white">Mail Send</strong>. La clé commence par <code className="bg-[#1e1e3f] text-[#a78bfa] px-1.5 py-0.5 rounded text-xs">SG.</code></p>
        </Step>
        <Step num={4} title="Coller ta clé ici">
          <ApiKeyForm provider="sendgrid" onSaved={onSaved} />
        </Step>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProviderSetup({
  hasAwsCredentials,
  existingRegion,
}: {
  hasAwsCredentials: boolean
  existingRegion: string
}) {
  const [selected, setSelected] = useState<Provider['id'] | null>(null)
  const [volumeIdx, setVolumeIdx] = useState(2) // default 10k
  const [configured, setConfigured] = useState(false)

  const volume = VOLUME_STEPS[volumeIdx]
  const selectedProvider = PROVIDERS.find(p => p.id === selected)

  if (selected && selectedProvider) {
    return (
      <div className="space-y-6">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelected(null); setConfigured(false) }}
            className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Changer de fournisseur
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Configurer {selectedProvider.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${DIFFICULTY_COLORS[selectedProvider.difficulty]}`}>
                {selectedProvider.difficultyLabel}
              </span>
              <span className="text-xs text-[#475569]">~{selectedProvider.setupTime}</span>
            </div>
          </div>
          {configured && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-3 py-1.5 rounded-xl">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Configuré
            </span>
          )}
        </div>

        {selected === 'aws' && (
          <AwsSetupGuide hasCredentials={hasAwsCredentials} existingRegion={existingRegion} />
        )}
        {selected === 'brevo'    && <BrevoGuide    onSaved={() => setConfigured(true)} />}
        {selected === 'mailgun'  && <MailgunGuide  onSaved={() => setConfigured(true)} />}
        {selected === 'sendgrid' && <SendgridGuide onSaved={() => setConfigured(true)} />}
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
          />
        ))}
      </div>
    </div>
  )
}
