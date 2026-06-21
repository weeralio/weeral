'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import EmailDesigner from '@/components/email-designer/EmailDesigner'
import {
  generateMessagesForPhase,
  saveWarmupMessage,
  pauseWarmupCampaign,
  resumeWarmupCampaign,
  deleteWarmupCampaign,
  type WarmupPhase,
} from '../actions'

interface Message {
  id: string
  phase: string
  variant_index: number
  subject: string
  body_html: string
  ai_generated: boolean
}

interface Props {
  campaignId:    string
  phase:         WarmupPhase | null
  messages:      Message[]
  variantCount:  number
  hasObjective:  boolean
  ctaUrl:        string | null
  campaignStatus?: string
  isControls?:   boolean
  domainNames?:  string[]
}

export default function MessageEditor({
  campaignId, phase, messages, variantCount, hasObjective, ctaUrl, campaignStatus, isControls, domainNames
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeVariant, setActiveVariant] = useState(0)
  const [editMode, setEditMode] = useState<number | null>(null)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Controls section ─────────────────────────────────────────────────────────
  if (isControls) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">
              {campaignStatus === 'active' ? 'Mettre en pause' : 'Reprendre'}
            </p>
            <p className="text-xs text-[#475569] mt-0.5">
              {campaignStatus === 'active'
                ? 'Aucun email ne sera envoyé pendant la pause.'
                : 'Les envois reprennent dès le prochain cron (17h Paris).'}
            </p>
          </div>
          <button
            disabled={isPending}
            onClick={() => startTransition(async () => {
              if (campaignStatus === 'active') await pauseWarmupCampaign(campaignId)
              else await resumeWarmupCampaign(campaignId)
              router.refresh()
            })}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white transition-all disabled:opacity-50"
          >
            {isPending ? '...' : campaignStatus === 'active' ? 'Mettre en pause' : 'Reprendre'}
          </button>
        </div>

        <div className="border-t border-[#1e1e3f]" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-400">Supprimer la campagne</p>
            <p className="text-xs text-[#475569] mt-0.5">Supprime la campagne et tous ses messages. Irréversible.</p>
          </div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-800/40 text-red-400 hover:bg-red-950/30 transition-all"
            >
              Supprimer
            </button>
          ) : (
            <div className="shrink-0 flex flex-col items-end gap-2">
              <p className="text-xs text-[#94a3b8]">Confirmer la suppression ?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => startTransition(() => deleteWarmupCampaign(campaignId))}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 border border-red-800/50 text-red-400 hover:bg-red-900/70 disabled:opacity-50 transition-all"
                >
                  {isPending ? '...' : 'Oui, supprimer'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#475569] hover:text-white transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!phase) return null

  // ── Message editor ───────────────────────────────────────────────────────────

  const variants = Array.from({ length: variantCount }, (_, i) => {
    return messages.find(m => m.variant_index === i) ?? null
  })

  function startEdit(i: number) {
    const msg = variants[i]
    setSubject(msg?.subject ?? '')
    setBodyHtml(msg?.body_html ?? '')
    setEditMode(i)
    setFeedback(null)
  }

  function cancelEdit() {
    setEditMode(null)
    setFeedback(null)
  }

  function save() {
    if (editMode === null || !phase) return
    startTransition(async () => {
      const result = await saveWarmupMessage(campaignId, phase, editMode, subject, bodyHtml)
      if (result.error) {
        setFeedback({ ok: false, msg: result.error })
      } else {
        setFeedback({ ok: true, msg: 'Enregistré' })
        setEditMode(null)
        router.refresh()
      }
    })
  }

  function generateAI() {
    if (!phase) return
    startTransition(async () => {
      setFeedback(null)
      const result = await generateMessagesForPhase(campaignId, phase)
      if (result.error) {
        setFeedback({ ok: false, msg: result.error })
      } else {
        setFeedback({ ok: true, msg: 'Messages générés par l\'IA' })
        router.refresh()
      }
    })
  }

  const activeMsg = variants[activeVariant]
  const hasAnyMessage = variants.some(v => v !== null)

  return (
    <div className="space-y-4">
      {/* Variant tabs */}
      {variantCount > 1 && (
        domainNames && domainNames.length > 1 ? (
          <div className="space-y-2">
            {domainNames.map((domain, dIdx) => (
              <div key={dIdx} className="space-y-1">
                <p className="text-[10px] text-[#475569] uppercase tracking-wider">{domain}</p>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(offset => {
                    const i = dIdx * 3 + offset
                    const v = variants[i]
                    return (
                      <button
                        key={i}
                        onClick={() => { setActiveVariant(i); setEditMode(null) }}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          activeVariant === i
                            ? 'border-violet-500/50 bg-violet-950/20 text-violet-200'
                            : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'
                        }`}
                      >
                        V{offset + 1}
                        {v?.ai_generated && <span className="ml-1 text-[9px] text-violet-400">IA</span>}
                        {!v && <span className="ml-1 text-[9px] text-[#3b3b6f]">vide</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => { setActiveVariant(i); setEditMode(null) }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  activeVariant === i
                    ? 'border-violet-500/50 bg-violet-950/20 text-violet-200'
                    : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'
                }`}
              >
                Variante {i + 1}
                {v?.ai_generated && <span className="ml-1 text-[9px] text-violet-400">IA</span>}
                {!v && <span className="ml-1 text-[9px] text-[#3b3b6f]">vide</span>}
              </button>
            ))}
          </div>
        )
      )}

      {/* No messages → CTA to generate or add */}
      {!hasAnyMessage && editMode === null && (
        <div className="text-center py-6 rounded-xl border border-dashed border-[#1e1e3f] space-y-3">
          <p className="text-sm text-[#475569]">Aucun message configuré pour cette phase.</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {hasObjective && (
              <button
                onClick={generateAI}
                disabled={isPending}
                className="text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-all flex items-center gap-2"
              >
                {isPending ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                )}
                Générer avec l&apos;IA
              </button>
            )}
            <button
              onClick={() => startEdit(activeVariant)}
              className="text-sm px-4 py-2 rounded-xl border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white transition-all"
            >
              Écrire manuellement
            </button>
          </div>
        </div>
      )}

      {/* Message display / edit */}
      {hasAnyMessage && editMode === null && activeMsg && (
        <div className="space-y-3">
          <div className="px-4 py-3 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[#475569] uppercase tracking-wider font-medium">Objet</p>
              {activeMsg.ai_generated && <span className="text-[9px] text-violet-400">Généré par IA</span>}
            </div>
            <p className="text-sm text-white font-medium">{activeMsg.subject}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-[#0a0a18] border border-[#1e1e3f]">
            <p className="text-xs text-[#475569] uppercase tracking-wider font-medium mb-2">Corps du message</p>
            <div
              className="text-sm text-[#94a3b8] prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: activeMsg.body_html }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => startEdit(activeVariant)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white transition-all"
            >
              Modifier
            </button>
            {hasObjective && (
              <button
                onClick={generateAI}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg border border-violet-800/40 text-violet-400 hover:bg-violet-950/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isPending ? '...' : '✦ Régénérer avec l\'IA'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Missing variant */}
      {hasAnyMessage && editMode === null && !activeMsg && (
        <div className="text-center py-4 rounded-xl border border-dashed border-[#1e1e3f]">
          <p className="text-xs text-[#475569] mb-2">Variante {activeVariant + 1} non configurée</p>
          <button
            onClick={() => startEdit(activeVariant)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white transition-all"
          >
            Écrire ce variant
          </button>
        </div>
      )}

      {/* Edit form */}
      {editMode !== null && (
        <div className="space-y-3">
          {phase === 'j4_j8' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/20 border border-amber-700/30">
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-xs text-amber-300">Phase J4–J8 : aucun lien dans ce message</p>
            </div>
          )}
          {(phase === 'j9' || phase === 'j10_j14') && ctaUrl && (
            <div className="px-3 py-2 rounded-lg bg-[#0a0a18] border border-[#1e1e3f]">
              <p className="text-xs text-[#475569]">CTA URL : <span className="text-violet-400">{ctaUrl}</span></p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Objet *</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Objet de l'email"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Corps du message *</label>
            <EmailDesigner value={bodyHtml} onChange={setBodyHtml} />
          </div>
          {feedback && (
            <p className={`text-xs ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.msg}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={cancelEdit}
              className="flex-1 py-2.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:border-[#3b3b6f] transition-all"
            >
              Annuler
            </button>
            <button
              onClick={save}
              disabled={isPending || !subject.trim() || !bodyHtml.trim()}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
            >
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {feedback && editMode === null && (
        <p className={`text-xs ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.msg}</p>
      )}
    </div>
  )
}
