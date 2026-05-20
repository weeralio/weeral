'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateSequence, createCampaignFromSequence } from './actions'
import type { GeneratedSequence, SequenceEmail } from '@/lib/anthropic'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Domain {
  id: string
  domain: string
  status: string
  sent_today: number
  daily_limit: number
}

interface SenderIdentity {
  id: string
  email: string
  domain_id: string
}

interface WizardProps {
  domains: Domain[]
  senderIdentities: SenderIdentity[]
}

type Step = 1 | 2 | 3 | 'generating' | 'preview' | 'creating' | 'done'

interface FormData {
  campaignName: string
  domainId: string
  senderIdentityId: string
  targetDescription: string
  whatYouSell: string
  mainArgument: string
  hasScript: boolean
  script: string
}

// ─── Email type config ──────────────────────────────────────────────────────

const EMAIL_TYPE_CONFIG: Record<SequenceEmail['email_type'], {
  label: string; color: string; bg: string; day: string; desc: string
}> = {
  accroche:  { label: 'Accroche',      color: 'text-violet-400',  bg: 'bg-violet-950/40',  day: 'J+0',  desc: 'Hook sur le pain point' },
  valeur:    { label: 'Valeur',        color: 'text-emerald-400', bg: 'bg-emerald-950/40', day: 'J+4',  desc: 'ROI + preuve sociale' },
  follow_up: { label: 'Follow-up',     color: 'text-amber-400',   bg: 'bg-amber-950/40',   day: 'J+10', desc: 'Relance légère' },
  breakup:   { label: 'Break-up',      color: 'text-red-400',     bg: 'bg-red-950/40',     day: 'J+18', desc: 'Dernière tentative' },
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const labels = ['Configuration', 'Votre cible', 'Votre contenu']
  return (
    <div className="flex items-center gap-0 mb-10">
      {labels.map((label, i) => {
        const num = i + 1
        const done = current > num
        const active = current === num
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'bg-[#8b5cf6] text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                : active ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6] text-[#a78bfa]'
                : 'bg-[#1e1e3f] text-[#475569]'
              }`}>
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : num}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-white' : done ? 'text-[#8b5cf6]' : 'text-[#475569]'}`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`flex-1 h-px mx-3 transition-all ${done ? 'bg-[#8b5cf6]' : 'bg-[#1e1e3f]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">{children}</label>
}

function Input({ value, onChange, placeholder, ...props }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'placeholder'>) {
  return (
    <input
      {...props}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="dash-input w-full px-4 py-3 text-sm"
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="dash-input w-full px-4 py-3 text-sm resize-none leading-relaxed"
    />
  )
}

// ─── Steps ──────────────────────────────────────────────────────────────────

function Step1({
  data, setData, domains, senderIdentities, onNext,
}: {
  data: FormData
  setData: (d: Partial<FormData>) => void
  domains: Domain[]
  senderIdentities: SenderIdentity[]
  onNext: () => void
}) {
  const filteredIdentities = senderIdentities.filter(
    si => !data.domainId || si.domain_id === data.domainId
  )
  const canNext = data.campaignName.trim() && data.senderIdentityId

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Nom de la séquence</FieldLabel>
        <Input
          value={data.campaignName}
          onChange={v => setData({ campaignName: v })}
          placeholder="Ex: Outreach DRH Q3 2026"
        />
      </div>

      <div>
        <FieldLabel>Domaine d&apos;envoi</FieldLabel>
        <select
          value={data.domainId}
          onChange={e => setData({ domainId: e.target.value, senderIdentityId: '' })}
          className="dash-input w-full px-4 py-3 text-sm"
        >
          <option value="">Sélectionner un domaine...</option>
          {domains.map(d => (
            <option key={d.id} value={d.id}>
              {d.domain} — {d.status === 'warmup' ? `Warmup` : d.status === 'active' ? 'Actif' : d.status}
              {' '}({d.sent_today}/{d.daily_limit} emails/jour)
            </option>
          ))}
        </select>
        {domains.length === 0 && (
          <p className="text-xs text-amber-400 mt-2">
            ⚠ Aucun domaine configuré.{' '}
            <a href="/dashboard/parametres" className="underline">Configure AWS SES →</a>
          </p>
        )}
      </div>

      <div>
        <FieldLabel>Adresse d&apos;envoi</FieldLabel>
        <select
          value={data.senderIdentityId}
          onChange={e => setData({ senderIdentityId: e.target.value })}
          className="dash-input w-full px-4 py-3 text-sm"
          disabled={filteredIdentities.length === 0}
        >
          <option value="">Sélectionner une adresse...</option>
          {filteredIdentities.map(si => (
            <option key={si.id} value={si.id}>{si.email}</option>
          ))}
        </select>
        {data.domainId && filteredIdentities.length === 0 && (
          <p className="text-xs text-amber-400 mt-2">
            ⚠ Aucune adresse sur ce domaine.{' '}
            <a href="/dashboard/domaines" className="underline">Ajouter une adresse →</a>
          </p>
        )}
      </div>

      <div className="pt-2 flex justify-end">
        <button onClick={onNext} disabled={!canNext} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
          Suivant →
        </button>
      </div>
    </div>
  )
}

function Step2({
  data, setData, onNext, onBack,
}: {
  data: FormData
  setData: (d: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const canNext = data.targetDescription.trim() && data.whatYouSell.trim() && data.mainArgument.trim()

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Qui sont vos prospects ?</FieldLabel>
        <Textarea
          value={data.targetDescription}
          onChange={v => setData({ targetDescription: v })}
          placeholder="Ex: DRH et Directeurs des Ressources Humaines de PME françaises (50-500 employés), secteurs industrie et services"
          rows={3}
        />
        <p className="text-xs text-[#475569] mt-1.5">Plus tu es précis, meilleure sera la personnalisation.</p>
      </div>

      <div>
        <FieldLabel>Ce que vous vendez ?</FieldLabel>
        <Input
          value={data.whatYouSell}
          onChange={v => setData({ whatYouSell: v })}
          placeholder="Ex: SaaS RH pour simplifier la gestion des congés et absences"
        />
      </div>

      <div>
        <FieldLabel>Votre principal argument (ROI ou bénéfice concret)</FieldLabel>
        <Input
          value={data.mainArgument}
          onChange={v => setData({ mainArgument: v })}
          placeholder="Ex: Gain de temps moyen de 3h/semaine par manager, visible en 2 semaines"
        />
        <p className="text-xs text-[#475569] mt-1.5">Chiffre ou résultat mesurable = taux de réponse x3.</p>
      </div>

      <div className="pt-2 flex justify-between">
        <button onClick={onBack} className="btn-ghost px-6 py-2.5 text-sm text-[#94a3b8]">
          ← Retour
        </button>
        <button onClick={onNext} disabled={!canNext} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
          Suivant →
        </button>
      </div>
    </div>
  )
}

function Step3({
  data, setData, onGenerate, onBack, isPending,
}: {
  data: FormData
  setData: (d: Partial<FormData>) => void
  onGenerate: () => void
  onBack: () => void
  isPending: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div>
        <FieldLabel>Avez-vous déjà un script ?</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setData({ hasScript: false })}
            className={`p-4 rounded-xl border text-sm transition-all text-left ${
              !data.hasScript
                ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/10 text-white'
                : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'
            }`}
          >
            <div className="font-medium mb-1">✨ Génère pour moi</div>
            <div className="text-xs opacity-70">L&apos;IA crée une séquence complète depuis tes informations</div>
          </button>
          <button
            onClick={() => setData({ hasScript: true })}
            className={`p-4 rounded-xl border text-sm transition-all text-left ${
              data.hasScript
                ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/10 text-white'
                : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'
            }`}
          >
            <div className="font-medium mb-1">📝 J&apos;ai un script</div>
            <div className="text-xs opacity-70">L&apos;IA analyse et restructure ton contenu existant</div>
          </button>
        </div>
      </div>

      {data.hasScript && (
        <div>
          <FieldLabel>Votre script (colle ici vos messages bruts)</FieldLabel>
          <Textarea
            value={data.script}
            onChange={v => setData({ script: v })}
            placeholder="Colle ici tes emails existants, notes de vente, pitch deck, ou même des brouillons. L'IA va analyser et restructurer."
            rows={8}
          />
          <p className="text-xs text-[#475569] mt-1.5">
            Pas besoin que ce soit parfait — l&apos;IA va tout reformater.
          </p>
        </div>
      )}

      {!data.hasScript && (
        <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl p-5">
          <p className="text-sm font-medium text-white mb-3">Ce que l&apos;IA va générer pour toi :</p>
          <div className="space-y-2.5">
            {[
              { day: 'J+0',  type: 'Accroche',  desc: 'Hook sur un pain point spécifique de ta cible' },
              { day: 'J+4',  type: 'Valeur',    desc: 'ROI concret + preuve sociale' },
              { day: 'J+10', type: 'Follow-up', desc: 'Relance légère et humaine' },
              { day: 'J+18', type: 'Break-up',  desc: 'Dernière tentative directe' },
            ].map(e => (
              <div key={e.day} className="flex items-center gap-3 text-sm">
                <span className="text-[#8b5cf6] font-mono text-xs w-10 shrink-0">{e.day}</span>
                <span className="text-white font-medium w-20 shrink-0">{e.type}</span>
                <span className="text-[#475569]">{e.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 flex justify-between">
        <button onClick={onBack} className="btn-ghost px-6 py-2.5 text-sm text-[#94a3b8]" disabled={isPending}>
          ← Retour
        </button>
        <button
          onClick={onGenerate}
          disabled={isPending || (data.hasScript && !data.script.trim())}
          className="btn-primary px-8 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Génération en cours...
            </>
          ) : (
            '✨ Générer la séquence'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Preview ────────────────────────────────────────────────────────────────

function EmailCard({
  email, index, total,
}: {
  email: SequenceEmail
  index: number
  total: number
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const [showTip, setShowTip] = useState(false)
  const cfg = EMAIL_TYPE_CONFIG[email.email_type] ?? EMAIL_TYPE_CONFIG.accroche

  return (
    <div className="flex gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center w-10 shrink-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border ${cfg.bg} border-current ${cfg.color}`}>
          {cfg.day}
        </div>
        {index < total - 1 && (
          <div className="flex-1 w-px bg-gradient-to-b from-[#3b3b6f] to-transparent mt-2 min-h-[2rem]" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <Card className={`transition-all hover:border-[#8b5cf6]/30 ${expanded ? 'border-[#8b5cf6]/30' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-[#475569]">{cfg.desc}</span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    <span className="text-[#475569] mr-2">Objet :</span>
                    {email.subject}
                  </p>
                  {!expanded && (
                    <p className="text-xs text-[#475569] mt-1 truncate">
                      {email.text_body?.slice(0, 80)}...
                    </p>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-[#475569] shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </button>

        {expanded && (
          <div className="mt-2 space-y-3">
            {/* Email body */}
            <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl p-5">
              <div
                className="text-sm text-[#94a3b8] leading-relaxed prose-dark"
                dangerouslySetInnerHTML={{ __html: email.html_body }}
              />
            </div>

            {/* AI Tip */}
            <button
              onClick={() => setShowTip(!showTip)}
              className="flex items-center gap-2 text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {showTip ? 'Masquer le conseil IA' : 'Conseil IA →'}
            </button>
            {showTip && (
              <div className="bg-[#8b5cf6]/8 border border-[#8b5cf6]/20 rounded-xl p-4">
                <p className="text-xs text-[#a78bfa] leading-relaxed">{email.ai_tip}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SequencePreview({
  sequence, campaignName, senderIdentityId, targetDescription, onBack, onReset,
}: {
  sequence: GeneratedSequence
  campaignName: string
  senderIdentityId: string
  targetDescription: string
  onBack: () => void
  onReset: () => void
}) {
  const [isCreating, startCreating] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCreate = () => {
    setError(null)
    startCreating(async () => {
      const result = await createCampaignFromSequence({
        name:               campaignName,
        senderIdentityId:   senderIdentityId,
        targetDescription:  targetDescription,
        aiStrategy:         sequence.strategy,
        sequence:           sequence.sequence,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(`/dashboard/campagnes/${result.campaignId}`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Strategy */}
      <div className="bg-gradient-to-r from-[#2d1b69]/50 to-[#1e1b4b]/50 border border-[#8b5cf6]/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider">Stratégie IA</span>
        </div>
        <p className="text-sm text-[#c4b5fd] leading-relaxed italic">&ldquo;{sequence.strategy}&rdquo;</p>
      </div>

      {/* Progress metric */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Emails', value: `${sequence.sequence.length}` },
          { label: 'Durée', value: `${sequence.sequence.at(-1)?.day_offset ?? 0}j` },
          { label: 'Variables', value: sequence.sequence.some(e => e.html_body.includes('{{')) ? 'Oui' : 'Non' },
        ].map(m => (
          <div key={m.label} className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-white">{m.value}</p>
            <p className="text-xs text-[#475569]">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Email cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Séquence générée</h3>
          <button
            onClick={onReset}
            className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors underline underline-offset-2"
          >
            Regénérer
          </button>
        </div>
        <div>
          {sequence.sequence.map((email, i) => (
            <EmailCard
              key={email.order}
              email={email}
              index={i}
              total={sequence.sequence.length}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} disabled={isCreating} className="btn-ghost px-6 py-2.5 text-sm text-[#94a3b8]">
          ← Modifier
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="btn-primary px-8 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Création de la campagne...
            </>
          ) : (
            '🚀 Créer cette campagne'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Generating animation ────────────────────────────────────────────────────

function GeneratingState() {
  const steps = [
    'Analyse de votre cible...',
    'Structuration de la séquence...',
    'Rédaction des emails...',
    'Optimisation des sujets...',
    'Finalisation...',
  ]
  const [currentStep, setCurrentStep] = useState(0)

  useState(() => {
    const interval = setInterval(() => {
      setCurrentStep(s => (s + 1) % steps.length)
    }, 1200)
    return () => clearInterval(interval)
  })

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      {/* Animated orb */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] animate-pulse opacity-20 blur-xl" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] animate-spin-slow opacity-40" />
        <div className="absolute inset-4 rounded-full bg-[#07070f] flex items-center justify-center">
          <svg className="w-6 h-6 text-[#8b5cf6] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-medium mb-2">L&apos;IA rédige votre séquence</p>
        <p className="text-sm text-[#94a3b8] animate-pulse">{steps[currentStep]}</p>
      </div>
      <div className="w-48">
        <Progress value={((currentStep + 1) / steps.length) * 100} />
      </div>
    </div>
  )
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function SequenceWizard({ domains, senderIdentities }: WizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sequence, setSequence] = useState<GeneratedSequence | null>(null)

  const [form, setForm] = useState<FormData>({
    campaignName:      '',
    domainId:          domains[0]?.id ?? '',
    senderIdentityId:  '',
    targetDescription: '',
    whatYouSell:       '',
    mainArgument:      '',
    hasScript:         false,
    script:            '',
  })

  const updateForm = (partial: Partial<FormData>) => setForm(f => ({ ...f, ...partial }))

  const handleGenerate = () => {
    setError(null)
    setStep('generating')
    startTransition(async () => {
      const result = await generateSequence({
        targetDescription: form.targetDescription,
        whatYouSell:       form.whatYouSell,
        mainArgument:      form.mainArgument,
        script:            form.hasScript ? form.script : undefined,
      })
      if (!result.success) {
        setError(result.error)
        setStep(3)
        return
      }
      setSequence(result.data)
      setStep('preview')
    })
  }

  const stepNum = step === 'preview' || step === 'generating' ? 3 : (step as number)

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            {step === 'preview' ? 'Votre séquence est prête 🎉' : 'Nouvelle séquence de cold email'}
          </CardTitle>
          <CardDescription>
            {step === 'preview'
              ? 'Revue la séquence générée par l\'IA et crée ta campagne.'
              : 'L\'IA génère une séquence complète d\'emails B2B optimisés pour ta cible.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step !== 'preview' && step !== 'generating' && (
            <StepIndicator current={stepNum} />
          )}

          {step === 1 && (
            <Step1
              data={form}
              setData={updateForm}
              domains={domains}
              senderIdentities={senderIdentities}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2
              data={form}
              setData={updateForm}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <>
              {error && (
                <div className="bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-400 mb-5">
                  {error}
                </div>
              )}
              <Step3
                data={form}
                setData={updateForm}
                onGenerate={handleGenerate}
                onBack={() => setStep(2)}
                isPending={isPending}
              />
            </>
          )}
          {step === 'generating' && <GeneratingState />}
          {step === 'preview' && sequence && (
            <SequencePreview
              sequence={sequence}
              campaignName={form.campaignName}
              senderIdentityId={form.senderIdentityId}
              targetDescription={form.targetDescription}
              onBack={() => setStep(3)}
              onReset={() => { setSequence(null); setStep(3) }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
