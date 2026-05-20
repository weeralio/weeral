'use client'

import { useState, useTransition } from 'react'
import { submitContent, approveContent, type AnalysisResult } from '@/app/(dashboard)/dashboard/campagnes-ia/actions'

interface Request {
  id: string
  phase_name: string
  phase_id: number
  brief: string
  requirements: string[]
  status: string
  user_raw_input: string | null
  ai_score: number | null
  ai_checks: { label: string; passed: boolean; detail: string }[] | null
  ai_issues: string[] | null
  ai_improvements: string[] | null
  final_subject: string | null
  final_body: string | null
  due_date: string
}

const PHASE_COLORS: Record<number, { text: string; bg: string; border: string }> = {
  2: { text: 'text-blue-400',    bg: 'bg-blue-950/30',    border: 'border-blue-700/40' },
  3: { text: 'text-violet-400',  bg: 'bg-violet-950/30',  border: 'border-violet-700/40' },
  4: { text: 'text-amber-400',   bg: 'bg-amber-950/30',   border: 'border-amber-700/40' },
  5: { text: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-700/40' },
}

export default function ContentAnalyzer({ request }: { request: Request }) {
  const [message, setMessage] = useState(request.user_raw_input ?? '')
  const [result, setResult] = useState<Partial<AnalysisResult> | null>(
    request.ai_score !== null ? {
      score: request.ai_score ?? undefined,
      checks: request.ai_checks ?? undefined,
      issues: request.ai_issues ?? undefined,
      improvements: request.ai_improvements ?? undefined,
      final_subject: request.final_subject ?? undefined,
      final_body: request.final_body ?? undefined,
    } : null
  )
  const [error, setError] = useState('')
  const [isAnalyzing, startAnalyze] = useTransition()
  const [isApproving, startApprove] = useTransition()
  const [approved, setApproved] = useState(request.status === 'approved')

  const phase = PHASE_COLORS[request.phase_id] ?? PHASE_COLORS[2]
  const isUrgent = new Date(request.due_date) <= new Date(Date.now() + 86_400_000)
  const canApprove = result && (result.score ?? 0) >= 70 && !approved

  function analyze() {
    if (!message.trim()) return
    setError('')
    startAnalyze(async () => {
      const res = await submitContent(request.id, message)
      if (res.error) {
        setError(res.error)
      } else {
        setResult(res)
        if ((res.score ?? 0) >= 70) setApproved(true)
      }
    })
  }

  function approve() {
    startApprove(async () => {
      const res = await approveContent(request.id)
      if (res.error) setError(res.error)
      else setApproved(true)
    })
  }

  if (approved) {
    return (
      <div className="px-4 py-3 rounded-xl border border-emerald-700/40 bg-emerald-950/20 flex items-center gap-3">
        <span className="text-emerald-400 text-lg">✓</span>
        <div>
          <p className="text-sm font-medium text-emerald-300">Contenu approuvé</p>
          {result?.final_subject && (
            <p className="text-xs text-[#475569] mt-0.5">Objet : <span className="text-[#94a3b8]">{result.final_subject}</span></p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`px-4 py-3 rounded-xl border ${phase.bg} ${phase.border}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${phase.text}`}>
              Phase {request.phase_name}
            </p>
            <p className="text-sm text-white mt-1">{request.brief}</p>
          </div>
          {isUrgent && (
            <span className="shrink-0 text-xs text-red-400 font-medium">⚠ Urgent</span>
          )}
        </div>

        {/* Requirements */}
        {request.requirements.length > 0 && (
          <ul className="mt-3 space-y-1">
            {request.requirements.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#94a3b8]">
                <span className={`shrink-0 mt-0.5 ${phase.text}`}>·</span>
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Textarea */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Ton message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={6}
          placeholder="Écris ton message ici — l'IA va l'analyser et te donner un score..."
          className="w-full px-3 py-3 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#475569]">{message.length} caractères</span>
          <button
            onClick={analyze}
            disabled={!message.trim() || isAnalyzing}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
          >
            {isAnalyzing ? 'Analyse en cours...' : 'Analyser avec l\'IA →'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Analysis results */}
      {result && (
        <div className="space-y-4">
          {/* Score */}
          <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[#1e1e3f] bg-[#0a0a18]">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#1e1e3f" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="22" fill="none" strokeWidth="5"
                  stroke={(result.score ?? 0) >= 70 ? '#22c55e' : (result.score ?? 0) >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeDasharray={`${((result.score ?? 0) / 100) * 138.2} 138.2`}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${(result.score ?? 0) >= 70 ? 'text-emerald-400' : (result.score ?? 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {result.score}
              </span>
            </div>
            <div>
              <p className={`font-semibold ${(result.score ?? 0) >= 70 ? 'text-emerald-300' : (result.score ?? 0) >= 50 ? 'text-amber-300' : 'text-red-300'}`}>
                {(result.score ?? 0) >= 70 ? 'Bon message ✓' : (result.score ?? 0) >= 50 ? 'À améliorer' : 'Non conforme'}
              </p>
              <p className="text-xs text-[#475569] mt-0.5">
                {(result.score ?? 0) >= 70 ? 'Ce message peut être utilisé' : 'Révise le message selon les suggestions ci-dessous'}
              </p>
            </div>
          </div>

          {/* Checks */}
          {result.checks && result.checks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Vérifications</p>
              {result.checks.map((c, i) => (
                <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm ${c.passed ? 'border-emerald-700/30 bg-emerald-950/10' : 'border-red-700/30 bg-red-950/10'}`}>
                  <span className={`shrink-0 font-bold text-xs mt-0.5 ${c.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {c.passed ? '✓' : '✗'}
                  </span>
                  <div>
                    <p className={`font-medium text-sm ${c.passed ? 'text-emerald-300' : 'text-red-300'}`}>{c.label}</p>
                    <p className="text-xs text-[#475569] mt-0.5">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Issues */}
          {result.issues && result.issues.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Problèmes</p>
              <ul className="space-y-1">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                    <span className="text-red-500 shrink-0">·</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {result.improvements && result.improvements.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Suggestions</p>
              <ul className="space-y-1">
                {result.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-300">
                    <span className="text-amber-500 shrink-0">→</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Final content preview */}
          {result.final_subject && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Contenu optimisé par l&apos;IA</p>
              <div className="px-4 py-3 rounded-xl border border-[#1e1e3f] bg-[#0a0a18] space-y-3">
                <div>
                  <p className="text-xs text-[#475569]">Objet</p>
                  <p className="text-sm text-white mt-0.5 font-medium">{result.final_subject}</p>
                </div>
                {result.final_body && (
                  <div>
                    <p className="text-xs text-[#475569]">Corps</p>
                    <div
                      className="text-sm text-[#94a3b8] mt-0.5 prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: result.final_body }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={analyze}
              disabled={!message.trim() || isAnalyzing}
              className="flex-1 py-2.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:border-[#3b3b6f] disabled:opacity-50 transition-all"
            >
              Réanalyser
            </button>
            {canApprove && (
              <button
                onClick={approve}
                disabled={isApproving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium transition-all"
              >
                {isApproving ? 'Approbation...' : 'Approuver et utiliser →'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
