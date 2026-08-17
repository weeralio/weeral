'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { pauseSequence, resumeSequence, stopSequence, deleteSequence } from '../actions'

type SeqStatus = 'active' | 'paused' | 'stopped'

interface Props {
  seqId:       string
  initialStatus: SeqStatus
  activeCount: number
}

const STATUS_META: Record<SeqStatus, { label: string; dot: string; badge: string }> = {
  active:  { label: 'Active',    dot: 'bg-emerald-400', badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  paused:  { label: 'En pause',  dot: 'bg-amber-400',   badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  stopped: { label: 'Arrêtée',   dot: 'bg-[#3b3b6f]',   badge: 'text-[#475569] bg-[#0a0a18] border-[#1e1e3f]' },
}

export default function SequenceControls({ seqId, initialStatus, activeCount }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [error, setError]   = useState('')
  const [isPending, start]  = useTransition()
  const router = useRouter()

  const meta = STATUS_META[status]

  function act(fn: () => Promise<{ error?: string }>, next?: SeqStatus) {
    setError('')
    start(async () => {
      const res = await fn()
      if (res.error) { setError(res.error); return }
      if (next) setStatus(next)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status badge */}
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>

      {error && <span className="text-xs text-red-400">{error}</span>}

      <div className="flex items-center gap-2 ml-auto flex-wrap">
        {status === 'active' && (
          <button
            onClick={() => act(() => pauseSequence(seqId), 'paused')}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-950/30 transition-all disabled:opacity-50"
          >
            {isPending ? '…' : '⏸ Pause'}
          </button>
        )}

        {status === 'paused' && (
          <button
            onClick={() => act(() => resumeSequence(seqId), 'active')}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-500/40 text-violet-300 hover:bg-violet-950/30 transition-all disabled:opacity-50"
          >
            {isPending ? '…' : '▶ Reprendre'}
          </button>
        )}

        {status !== 'stopped' && (
          <button
            onClick={() => {
              const n = activeCount
              const warn = n > 0
                ? ` ${n} inscription${n > 1 ? 's' : ''} active${n > 1 ? 's' : ''} seront stoppée${n > 1 ? 's' : ''}.`
                : ''
              if (!confirm(`Arrêter définitivement cette séquence ?${warn} Cette action est irréversible.`)) return
              act(() => stopSequence(seqId), 'stopped')
            }}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#3b3b6f] text-[#94a3b8] hover:border-red-500/40 hover:text-red-400 transition-all disabled:opacity-50"
          >
            ⏹ Arrêter
          </button>
        )}

        <button
          onClick={() => {
            if (!confirm('Supprimer cette séquence ? Les logs d\'envoi sont conservés mais les contacts inscrits seront désinscits.')) return
            start(async () => {
              const res = await deleteSequence(seqId)
              if (res.error) { setError(res.error); return }
              router.push('/dashboard/sequences')
            })
          }}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#3b3b6f] text-[#475569] hover:border-red-500/40 hover:text-red-400 transition-all disabled:opacity-50"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
