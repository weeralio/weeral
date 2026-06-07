'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDomain } from '../actions'

interface Props {
  domainId: string
  domain:   string
}

export default function DomainManage({ domainId, domain }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError,   setDeleteError]   = useState<string | null>(null)

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteDomain(domainId)
      if (res.error) {
        setDeleteError(res.error)
      } else {
        router.push('/dashboard/domaines')
      }
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Supprimer le domaine ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-red-400">Supprimer le domaine</p>
          <p className="text-xs text-[#475569] mt-0.5">
            Supprime <strong className="text-[#94a3b8]">{domain}</strong> et toutes ses adresses d&apos;envoi. Irréversible.
          </p>
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
            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 border border-red-800/50 text-red-400 hover:bg-red-900/70 disabled:opacity-50 transition-all"
              >
                {isPending ? 'Suppression...' : 'Oui, supprimer'}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
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
