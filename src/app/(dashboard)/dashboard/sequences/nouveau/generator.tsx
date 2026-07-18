'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateSequenceWithAI, createSequence, type GeneratedStep } from '../actions'
import { Card, CardContent } from '@/components/ui/card'
import EmailDesigner from '@/components/email-designer/EmailDesigner'

interface Identity { id: string; email: string; display_name: string | null }

const TONES = [
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'décontracté', label: 'Décontracté' },
  { value: 'direct', label: 'Direct' },
  { value: 'consultative', label: 'Consultatif' },
]

const STEP_COUNTS = [3, 4, 5, 6, 7]

const SEND_CONDITION_LABELS: Record<string, string> = {
  always: 'Toujours envoyer',
  no_reply: 'Seulement si pas de réponse',
  no_open: 'Seulement si pas d\'ouverture',
  no_click: 'Seulement si pas de clic',
}

function makeEmptyStep(stepNumber: number): GeneratedStep {
  return {
    step_number: stepNumber,
    delay_days: stepNumber === 1 ? 0 : 3,
    subject: '',
    body_html: '',
    send_condition: stepNumber === 1 ? 'always' : 'no_reply',
    objective: '',
    ai_tip: '',
  }
}

export default function SequenceGenerator({ identities }: { identities: Identity[] }) {
  const router = useRouter()

  const [mode, setMode] = useState<'ai' | 'manual'>('ai')
  const [name, setName] = useState('')
  const [senderIdentityId, setSenderIdentityId] = useState(identities[0]?.id ?? '')
  const [goal, setGoal] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('professionnel')
  const [stepsCount, setStepsCount] = useState(5)

  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<GeneratedStep[]>([])
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [isGenerating, startGenerate] = useTransition()
  const [isSaving, startSave] = useTransition()

  const hasSteps = steps.length > 0

  function generate() {
    if (!goal.trim() || !audience.trim()) return
    setError('')
    setSteps([])
    startGenerate(async () => {
      const res = await generateSequenceWithAI(goal, audience, stepsCount, tone)
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setDescription(res.data.description)
        setSteps(res.data.steps)
        setExpandedStep(1)
      }
    })
  }

  function addManualStep() {
    const newStep = makeEmptyStep(steps.length + 1)
    setSteps(prev => [...prev, newStep])
    setExpandedStep(newStep.step_number)
  }

  function removeStep(stepNumber: number) {
    setSteps(prev =>
      prev
        .filter(s => s.step_number !== stepNumber)
        .map((s, i) => ({ ...s, step_number: i + 1 }))
    )
    if (expandedStep === stepNumber) setExpandedStep(null)
  }

  function updateStep(idx: number, field: keyof GeneratedStep, value: string | number) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function save() {
    if (!name.trim() || steps.length === 0) return
    setError('')
    startSave(async () => {
      const res = await createSequence(name, goal, description, steps, senderIdentityId || undefined)
      if (res.error) {
        setError(res.error)
      } else if (res.id) {
        router.push(`/dashboard/sequences/${res.id}`)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Setup card ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">1 · Configure ta séquence</p>

          {/* Mode toggle */}
          <div className="flex gap-2 p-1 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] w-fit">
            <button
              type="button"
              onClick={() => { setMode('ai'); setSteps([]); setExpandedStep(null) }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'ai' ? 'bg-violet-600 text-white' : 'text-[#475569] hover:text-[#94a3b8]'}`}
            >
              ✦ Générer avec l&apos;IA
            </button>
            <button
              type="button"
              onClick={() => { setMode('manual'); setSteps([]); setExpandedStep(null) }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'manual' ? 'bg-violet-600 text-white' : 'text-[#475569] hover:text-[#94a3b8]'}`}
            >
              Rédiger moi-même
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-[#475569]">Nom de la séquence *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Prospection DRH Q2"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-[#475569]">Adresse d&apos;envoi *</label>
              {identities.length === 0 ? (
                <p className="text-xs text-[#475569]">
                  Aucune adresse configurée.{' '}
                  <a href="/dashboard/domaines" className="text-violet-400 hover:text-violet-300 transition-colors">Ajouter un domaine →</a>
                </p>
              ) : (
                <IdentityDropdown identities={identities} value={senderIdentityId} onChange={setSenderIdentityId} />
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-[#475569]">Objectif <span className="text-[#3b3b6f]">(ce que tu veux obtenir)</span>{mode === 'ai' ? ' *' : ''}</label>
              <input
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="Ex: Obtenir un appel de 15 min avec des DRH de PME"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>

            {mode === 'ai' && (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-[#475569]">Cible * <span className="text-[#3b3b6f]">(qui tu contactes et leur problème)</span></label>
                  <input
                    value={audience}
                    onChange={e => setAudience(e.target.value)}
                    placeholder="Ex: DRH et responsables RH de PME 50-500 employés"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[#475569]">Ton</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTone(t.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${tone === t.value ? 'border-violet-500/50 bg-violet-950/30 text-violet-300' : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[#475569]">Nombre d&apos;étapes</label>
                  <div className="flex gap-2">
                    {STEP_COUNTS.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setStepsCount(n)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all ${stepsCount === n ? 'border-violet-500/50 bg-violet-950/30 text-violet-300' : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {mode === 'ai' && (
            <button
              onClick={generate}
              disabled={!goal.trim() || !audience.trim() || !name.trim() || isGenerating}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Génération en cours...
                </>
              ) : hasSteps ? 'Regénérer' : '✦ Générer la séquence avec l\'IA'}
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── Steps (AI description) ─────────────────────────────────────────────── */}
      {mode === 'ai' && description && (
        <div className="px-4 py-3 rounded-xl border border-violet-700/30 bg-violet-950/15">
          <p className="text-xs font-medium text-violet-400 mb-1">Stratégie IA</p>
          <p className="text-sm text-[#94a3b8]">{description}</p>
        </div>
      )}

      {hasSteps && (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
              {mode === 'ai' ? '2 · Révise et personnalise chaque étape' : '2 · Rédige tes emails'}
            </p>
            {mode === 'manual' && (
              <button
                type="button"
                onClick={addManualStep}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-violet-500/40 hover:text-violet-300 transition-all"
              >
                + Ajouter une étape
              </button>
            )}
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <Card key={idx} className={expandedStep === step.step_number ? 'border-violet-500/30' : ''}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedStep(expandedStep === step.step_number ? null : step.step_number)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e1e3f] border border-[#3b3b6f] flex items-center justify-center text-xs font-bold text-[#94a3b8] shrink-0">
                        {step.step_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">
                            {step.subject || <span className="text-[#3b3b6f] italic">Objet non renseigné</span>}
                          </span>
                          <span className="text-xs text-[#3b3b6f] shrink-0">
                            {step.delay_days === 0 ? 'Envoi immédiat' : `J+${step.delay_days}`}
                          </span>
                        </div>
                        {step.objective && <p className="text-xs text-[#475569] mt-0.5 truncate">{step.objective}</p>}
                      </div>
                      <svg
                        className={`w-4 h-4 text-[#3b3b6f] shrink-0 transition-transform ${expandedStep === step.step_number ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </CardContent>
                </button>

                {expandedStep === step.step_number && (
                  <div className="px-4 pb-4 space-y-4 border-t border-[#1e1e3f] pt-4">
                    {step.ai_tip && (
                      <div className="px-3 py-2.5 rounded-xl bg-amber-950/20 border border-amber-700/30">
                        <p className="text-xs text-amber-400 font-medium mb-1">💡 Conseil IA</p>
                        <p className="text-xs text-amber-200/80">{step.ai_tip}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-[#475569]">Délai après l&apos;étape précédente</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={step.delay_days}
                            onChange={e => updateStep(idx, 'delay_days', parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-2 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm text-center focus:outline-none focus:border-violet-500/50"
                          />
                          <span className="text-xs text-[#475569]">jours</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-[#475569]">Condition d&apos;envoi</label>
                        <select
                          value={step.send_condition}
                          onChange={e => updateStep(idx, 'send_condition', e.target.value)}
                          className="w-full px-2 py-2 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50"
                        >
                          {Object.entries(SEND_CONDITION_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-[#475569]">Objet de l&apos;email</label>
                      <input
                        value={step.subject}
                        onChange={e => updateStep(idx, 'subject', e.target.value)}
                        placeholder="Ex: Une question rapide, {{first_name}}"
                        className="w-full px-3 py-2 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-[#475569]">Corps de l&apos;email <span className="text-[#3b3b6f]">({'{{first_name}}'} pour personnaliser)</span></label>
                      <EmailDesigner
                        value={step.body_html}
                        onChange={html => updateStep(idx, 'body_html', html)}
                      />
                    </div>

                    {mode === 'manual' && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeStep(step.step_number)}
                          className="px-3 py-2 rounded-xl border border-red-700/40 text-red-400 text-xs hover:bg-red-950/20 transition-all"
                        >
                          Supprimer cette étape
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Save */}
          <div className="pt-2 space-y-3">
            {mode === 'manual' && (
              <button
                type="button"
                onClick={addManualStep}
                className="w-full py-2.5 rounded-xl border border-dashed border-[#1e1e3f] text-[#475569] text-sm hover:border-violet-500/40 hover:text-violet-300 transition-all"
              >
                + Ajouter une étape
              </button>
            )}
            <button
              onClick={save}
              disabled={isSaving || !name.trim() || steps.length === 0}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
            >
              {isSaving ? 'Sauvegarde...' : `Sauvegarder la séquence (${steps.length} étape${steps.length > 1 ? 's' : ''}) →`}
            </button>
          </div>
        </>
      )}

      {/* Manual mode — initial empty state */}
      {mode === 'manual' && !hasSteps && (
        <div className="pt-2">
          <button
            type="button"
            onClick={addManualStep}
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl border border-dashed border-[#1e1e3f] text-[#475569] text-sm hover:border-violet-500/40 hover:text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            + Ajouter la première étape
          </button>
          {!name.trim() && <p className="text-xs text-[#3b3b6f] text-center mt-2">Remplis d&apos;abord le nom de la séquence</p>}
        </div>
      )}
    </div>
  )
}

function IdentityDropdown({ identities, value, onChange }: { identities: Identity[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = identities.find(i => i.id === value)
  const label = selected
    ? (selected.display_name ? `${selected.display_name} <${selected.email}>` : selected.email)
    : 'Choisir…'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-[#0a0a18] border rounded-xl text-sm transition-colors ${open ? 'border-violet-500/50' : 'border-[#1e1e3f] hover:border-[#3b3b6f]'} text-white`}
      >
        <span className="truncate">{label}</span>
        <svg className={`w-4 h-4 text-[#475569] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl shadow-xl overflow-hidden">
          {identities.map(i => (
            <button
              key={i.id}
              type="button"
              onClick={() => { onChange(i.id); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === i.id ? 'bg-violet-950/30 text-violet-300' : 'text-[#94a3b8] hover:bg-[#111128] hover:text-white'}`}
            >
              {i.display_name ? `${i.display_name} <${i.email}>` : i.email}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
