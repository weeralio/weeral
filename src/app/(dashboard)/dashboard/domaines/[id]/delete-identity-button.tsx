'use client'

import { useState, useTransition } from 'react'
import { deleteSenderIdentity } from '../actions'

export default function DeleteIdentityButton({
  identityId,
  domainId,
  email,
}: {
  identityId: string
  domainId: string
  email: string
}) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteSenderIdentity(identityId, domainId)
      if (result?.error) {
        setError(result.error)
        setConfirm(false)
      }
    })
  }

  if (error) {
    return (
      <span className="text-xs text-red-400 shrink-0">
        Erreur · <button onClick={() => setError(null)} className="underline">Réessayer</button>
      </span>
    )
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-[#94a3b8]">Supprimer ?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          {isPending ? '...' : 'Oui'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={isPending}
          className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          Non
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title={`Supprimer ${email}`}
      className="shrink-0 text-[#334155] hover:text-red-400 transition-colors p-1 rounded"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
}
