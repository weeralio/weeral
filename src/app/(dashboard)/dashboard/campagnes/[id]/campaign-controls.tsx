'use client'

import { useState, useTransition } from 'react'
import { launchCampaign, pauseCampaign, deleteCampaign, triggerSend } from '../actions'

export default function CampaignControls({ campaignId, status }: { campaignId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [sendResult, setSendResult] = useState<string | null>(null)

  function handleSend() {
    setSendResult(null)
    startTransition(async () => {
      const result = await triggerSend(campaignId)
      if ('error' in result) setSendResult(`Erreur : ${result.error}`)
      else setSendResult(`${result.sent} email(s) envoyé(s)`)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {(status === 'draft' || status === 'paused') && (
          <button
            onClick={() => startTransition(() => { launchCampaign(campaignId) })}
            disabled={isPending}
            className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isPending ? '...' : status === 'paused' ? 'Reprendre' : 'Lancer'}
          </button>
        )}
        {status === 'running' && (
          <>
            <button
              onClick={handleSend}
              disabled={isPending}
              className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Envoi en cours...' : 'Déclencher l\'envoi'}
            </button>
            <button
              onClick={() => startTransition(() => { pauseCampaign(campaignId) })}
              disabled={isPending}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Mettre en pause
            </button>
          </>
        )}
        {(status === 'draft' || status === 'paused' || status === 'completed') && (
          <button
            onClick={() => {
              if (confirm('Supprimer cette campagne ?')) {
                startTransition(() => deleteCampaign(campaignId))
              }
            }}
            disabled={isPending}
            className="px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Supprimer
          </button>
        )}
      </div>

      {sendResult && (
        <p className={`text-sm px-3 py-2 rounded-lg ${sendResult.startsWith('Erreur') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {sendResult}
        </p>
      )}
    </div>
  )
}
