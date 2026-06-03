'use client'

import { useState, useTransition } from 'react'
import { launchCampaign, pauseCampaign, deleteCampaign, triggerSend } from '../actions'

export default function CampaignControls({ campaignId, status }: { campaignId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [sendResult, setSendResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  function handleSend() {
    setSendResult(null)
    startTransition(async () => {
      const result = await triggerSend(campaignId)
      if ('error' in result) setSendResult({ type: 'err', text: `Erreur : ${result.error}` })
      else setSendResult({ type: 'ok', text: `${result.sent} email(s) envoyé(s)` })
    })
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center gap-2.5 flex-wrap">

        {/* Lancer / Reprendre */}
        {(status === 'draft' || status === 'paused') && (
          <button
            onClick={() => startTransition(() => { launchCampaign(campaignId) })}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold hover:from-[#6d28d9] hover:to-[#7c3aed] disabled:opacity-50 transition-all"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {status === 'paused' ? 'Reprendre' : 'Lancer'}
          </button>
        )}

        {/* Déclencher envoi + Pause */}
        {status === 'running' && (
          <>
            <button
              onClick={handleSend}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#07070f] border border-[#1e1e3f] text-sm text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white disabled:opacity-50 transition-all"
            >
              {isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-[#475569] border-t-[#94a3b8] rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              {isPending ? 'Envoi…' : "Déclencher l'envoi"}
            </button>
            <button
              onClick={() => startTransition(() => { pauseCampaign(campaignId) })}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#07070f] border border-[#1e1e3f] text-sm text-[#94a3b8] hover:border-amber-700/40 hover:text-amber-400 disabled:opacity-50 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mettre en pause
            </button>
          </>
        )}

        {/* Supprimer */}
        {(status === 'draft' || status === 'paused' || status === 'completed') && (
          confirmDel ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94a3b8]">Supprimer cette campagne ?</span>
              <button
                onClick={() => startTransition(() => { deleteCampaign(campaignId) })}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 border border-red-800/50 text-red-400 hover:bg-red-900/70 disabled:opacity-50 transition-all"
              >
                {isPending ? '…' : 'Confirmer'}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#07070f] border border-red-800/40 text-sm text-red-400 hover:bg-red-950/20 disabled:opacity-50 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </button>
          )
        )}
      </div>

      {sendResult && (
        <p className={`text-xs px-3 py-2 rounded-lg border ${sendResult.type === 'ok' ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400' : 'bg-red-950/20 border-red-800/30 text-red-400'}`}>
          {sendResult.text}
        </p>
      )}
    </div>
  )
}
