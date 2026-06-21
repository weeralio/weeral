'use client'

import { useState, useTransition } from 'react'
import { adjustWarmupDay } from '../actions'

interface Props {
  mailboxId: string
  campaignId: string
  currentDay: number
  maxDay?: number
}

export default function WarmupDayAdjuster({ mailboxId, campaignId, currentDay, maxDay = 14 }: Props) {
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState(currentDay)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await adjustWarmupDay(mailboxId, day, campaignId)
      if (res.error) {
        setError(res.error)
      } else {
        setOpen(false)
      }
    })
  }

  const phaseLabel =
    day <= 3  ? 'Repos (J1–J3)'          :
    day <= 8  ? 'Échauffement (J4–J8)'   :
    day <= 10 ? 'Lien neutre (J9–J10)'   :
    day < maxDay ? `Contenu (J11–J${maxDay - 1})` :
                `Terminé (J${maxDay}+)`

  const phaseColor =
    day <= 3        ? 'text-[#475569]'  :
    day <= 8        ? 'text-blue-400'   :
    day <= 10       ? 'text-violet-400' :
    day < maxDay    ? 'text-amber-400'  :
                      'text-emerald-400'

  if (!open) {
    return (
      <button
        onClick={() => { setDay(currentDay); setOpen(true) }}
        className="text-[10px] text-[#3b3b6f] hover:text-violet-400 transition-colors px-1.5 py-0.5 rounded hover:bg-[#1e1e3f]"
        title="Ajuster manuellement le jour de warmup"
      >
        Ajuster
      </button>
    )
  }

  return (
    <div className="mt-2 ml-4 p-3 rounded-lg bg-[#0d0d1f] border border-[#1e1e3f] space-y-3">
      <p className="text-xs text-[#475569]">
        Configurer manuellement l&apos;avancement — utile si le domaine a déjà une historique d&apos;envoi.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white font-medium">Jour actuel : <span className={phaseColor}>J{day}</span></span>
          <span className={`text-[10px] ${phaseColor}`}>{phaseLabel}</span>
        </div>

        <input
          type="range"
          min={1}
          max={maxDay}
          value={day}
          onChange={e => setDay(Number(e.target.value))}
          className="w-full accent-violet-500 cursor-pointer"
        />

        <div className="flex justify-between text-[9px] text-[#3b3b6f] select-none">
          <span>J1</span>
          <span>J4</span>
          <span>J{Math.round(maxDay / 2)}</span>
          <span>J{maxDay}</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 text-xs px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
        >
          {isPending ? 'Enregistrement…' : `Définir J${day}`}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs px-3 py-1.5 rounded-md border border-[#1e1e3f] text-[#475569] hover:text-white transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
