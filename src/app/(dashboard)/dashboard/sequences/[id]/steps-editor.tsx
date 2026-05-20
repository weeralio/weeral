'use client'

import { useState, useTransition } from 'react'
import { updateStep, deleteStep } from '../actions'

interface Step {
  id: string
  sequence_id: string
  step_number: number
  delay_days: number
  subject: string
  body_html: string
  send_condition: string
  objective: string | null
  ai_tip: string | null
}

const CONDITION_LABELS: Record<string, string> = {
  always:   'Toujours envoyer',
  no_reply: 'Si pas de réponse',
  no_open:  'Si pas d\'ouverture',
  no_click: 'Si pas de clic',
}

export default function StepsEditor({ sequenceId, steps: initial }: { sequenceId: string; steps: Step[] }) {
  const [steps, setSteps] = useState(initial)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, Partial<Step>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  function getEdit(id: string): Step {
    const base = steps.find(s => s.id === id)!
    return { ...base, ...(editing[id] ?? {}) }
  }

  function setField(id: string, field: keyof Step, value: string | number) {
    setEditing(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }))
  }

  function save(stepId: string) {
    const edits = editing[stepId]
    if (!edits || Object.keys(edits).length === 0) return
    setSaving(stepId)
    start(async () => {
      await updateStep(stepId, {
        subject: edits.subject,
        body_html: edits.body_html,
        delay_days: edits.delay_days as number | undefined,
        send_condition: edits.send_condition,
      })
      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...edits } : s))
      setEditing(prev => { const next = { ...prev }; delete next[stepId]; return next })
      setSaving(null)
    })
  }

  function remove(stepId: string) {
    setDeleting(stepId)
    start(async () => {
      await deleteStep(stepId, sequenceId)
      setSteps(prev => prev.filter(s => s.id !== stepId))
      setDeleting(null)
      if (expandedId === stepId) setExpandedId(null)
    })
  }

  if (steps.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-[#475569]">Aucune étape.</p>
  }

  return (
    <div className="divide-y divide-[#1e1e3f]">
      {steps.map((step, idx) => {
        const ed = getEdit(step.id)
        const isDirty = !!editing[step.id] && Object.keys(editing[step.id]).length > 0
        const isOpen = expandedId === step.id

        return (
          <div key={step.id}>
            {/* Row header */}
            <button
              type="button"
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#07070f] transition-colors text-left"
              onClick={() => setExpandedId(isOpen ? null : step.id)}
            >
              {/* Step number */}
              <div className="w-7 h-7 rounded-full bg-[#1e1e3f] flex items-center justify-center text-xs font-bold text-[#94a3b8] shrink-0">
                {step.step_number}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white truncate">{step.subject}</span>
                  {isDirty && <span className="text-xs text-amber-400 shrink-0">● modifié</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-[#475569]">
                  <span>{step.delay_days === 0 ? 'Envoi immédiat' : `J+${step.delay_days}`}</span>
                  <span>{CONDITION_LABELS[step.send_condition] ?? step.send_condition}</span>
                </div>
              </div>

              <svg
                className={`w-4 h-4 text-[#3b3b6f] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded editor */}
            {isOpen && (
              <div className="px-5 pb-5 space-y-4 bg-[#07070f]">
                {/* AI tip */}
                {step.ai_tip && (
                  <div className="px-3 py-2.5 rounded-xl bg-amber-950/20 border border-amber-700/30">
                    <p className="text-xs text-amber-400 font-medium mb-1">💡 Conseil IA</p>
                    <p className="text-xs text-amber-200/80">{step.ai_tip}</p>
                  </div>
                )}

                {/* Objective */}
                {step.objective && (
                  <p className="text-xs text-[#475569]">
                    <span className="text-[#94a3b8] font-medium">Objectif :</span> {step.objective}
                  </p>
                )}

                {/* Delay + condition */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#475569]">Délai (jours)</label>
                    <input
                      type="number"
                      min={0}
                      value={ed.delay_days}
                      onChange={e => setField(step.id, 'delay_days', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#475569]">Condition d&apos;envoi</label>
                    <select
                      value={ed.send_condition}
                      onChange={e => setField(step.id, 'send_condition', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50"
                    >
                      {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#475569]">Objet</label>
                  <input
                    value={ed.subject}
                    onChange={e => setField(step.id, 'subject', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#475569]">Corps (HTML)</label>
                  <textarea
                    value={ed.body_html}
                    onChange={e => setField(step.id, 'body_html', e.target.value)}
                    rows={7}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>

                {/* Preview */}
                <div className="space-y-1.5">
                  <p className="text-xs text-[#475569]">Aperçu</p>
                  <div
                    className="px-4 py-3 rounded-xl bg-white/5 border border-[#1e1e3f] text-sm text-[#94a3b8]"
                    dangerouslySetInnerHTML={{ __html: ed.body_html.replace(/\{\{first_name\}\}/g, 'Marie') }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => remove(step.id)}
                    disabled={deleting === step.id}
                    className="px-3 py-2 rounded-xl border border-red-700/40 text-red-400 text-xs hover:bg-red-950/20 disabled:opacity-50 transition-all"
                  >
                    {deleting === step.id ? '...' : 'Supprimer'}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => { setEditing(prev => { const n = { ...prev }; delete n[step.id]; return n }) }}
                    className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-[#475569] text-xs hover:border-[#3b3b6f] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => save(step.id)}
                    disabled={!isDirty || saving === step.id}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-medium transition-all"
                  >
                    {saving === step.id ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
