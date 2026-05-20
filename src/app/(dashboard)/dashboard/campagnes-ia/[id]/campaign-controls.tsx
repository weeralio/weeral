'use client'

import { useTransition } from 'react'
import { pauseIACampaign, resumeIACampaign } from '../actions'

export default function CampaignControls({ campaignId, status }: { campaignId: string; status: string }) {
  const [isPending, start] = useTransition()

  function toggle() {
    start(async () => {
      if (status === 'active') await pauseIACampaign(campaignId)
      else await resumeIACampaign(campaignId)
    })
  }

  if (status === 'completed') return null

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
        status === 'active'
          ? 'border-amber-700/40 text-amber-400 hover:bg-amber-950/20'
          : 'border-emerald-700/40 text-emerald-400 hover:bg-emerald-950/20'
      }`}
    >
      {isPending ? '...' : status === 'active' ? '⏸ Pauser' : '▶ Reprendre'}
    </button>
  )
}
