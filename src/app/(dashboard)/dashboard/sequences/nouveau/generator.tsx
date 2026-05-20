'use client'

import { useState, useTransition } from 'react'
import { generateSequenceWithAI, createSequence, type GeneratedStep } from '../actions'
import { Card, CardContent } from '@/components/ui/card'

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

export default function SequenceGenerator() {
  // Form state
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('professionnel')
  const [stepsCount, setStepsCount] = useState(5)

  // Result state
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<GeneratedStep[]>([])
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [isGenerating, startGenerate] = useTransition()
  const [isSaving, startSave] = useTransition()

  const hasResult = steps.length > 0

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

  function updateStep(idx: number, field: keyof GeneratedStep, value: string | number) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function save() {
    if (!name.trim() || steps.length === 0) return
    startSave(async () => {
      await createSequence(name, goal, description, steps)
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Step 1: Setup form ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">1 · Décris ta séquence</p>

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
              <label className="text-xs text-[#475569]">Objectif * <span className="text-[#3b3b6f]">(ce que tu veux obtenir)</span></label>
              <input
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="Ex: Obtenir un appel de 15 min avec des DRH de PME pour présenter notre logiciel RH"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-[#475569]">Cible * <span className="text-[#3b3b6f]">(qui tu contactes et leur problème)</span></label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="Ex: DRH et responsables RH de PME 50-500 employés, problème de gestion des congés et ATS"
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
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

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
            ) : hasResult ? 'Regénérer' : '✦ Générer la séquence avec l\'IA'}
          </button>
        </CardContent>
      </Card>

      {/* ── Step 2: Generated steps ────────────────────────────────────────── */}
      {hasResult && (
        <>
          {/* Strategy description */}
          <div className="px-4 py-3 rounded-xl border border-violet-700/30 bg-violet-950/15">
            <p className="text-xs font-medium text-violet-400 mb-1">Stratégie IA</p>
            <p className="text-sm text-[#94a3b8]">{description}</p>
          </div>

          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider px-1">
            2 · Révise et personnalise chaque étape
          </p>

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
                      {/* Step indicator */}
                      <div className="w-8 h-8 rounded-full bg-[#1e1e3f] border border-[#3b3b6f] flex items-center justify-center text-xs font-bold text-[#94a3b8] shrink-0">
                        {step.step_number}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">{step.subject}</span>
                          <span className="text-xs text-[#3b3b6f] shrink-0">
                            {step.delay_days === 0 ? 'Envoi immédiat' : `J+${step.delay_days}`}
                          </span>
                        </div>
                        <p className="text-xs text-[#475569] mt-0.5 truncate">{step.objective}</p>
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
                    {/* AI tip */}
                    <div className="px-3 py-2.5 rounded-xl bg-amber-950/20 border border-amber-700/30">
                      <p className="text-xs text-amber-400 font-medium mb-1">💡 Conseil IA</p>
                      <p className="text-xs text-amber-200/80">{step.ai_tip}</p>
                    </div>

                    {/* Delay + condition */}
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

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#475569]">Objet de l&apos;email</label>
                      <input
                        value={step.subject}
                        onChange={e => updateStep(idx, 'subject', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>

                    {/* Body */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#475569]">Corps de l&apos;email <span className="text-[#3b3b6f]">(HTML — {'{{'+'first_name'+'}}'} pour personnaliser)</span></label>
                      <textarea
                        value={step.body_html}
                        onChange={e => updateStep(idx, 'body_html', e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                      />
                    </div>

                    {/* Preview */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-[#475569]">Aperçu</p>
                      <div
                        className="px-4 py-3 rounded-xl bg-white/5 border border-[#1e1e3f] text-sm text-[#94a3b8] prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: step.body_html.replace(/\{\{first_name\}\}/g, 'Marie') }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Save */}
          <div className="pt-2">
            <button
              onClick={save}
              disabled={isSaving || !name.trim()}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
            >
              {isSaving ? 'Sauvegarde...' : `Sauvegarder la séquence (${steps.length} étapes) →`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
