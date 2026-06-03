'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDomain, updateDomain } from '../actions'

interface Props {
  domainId: string
  domain:   string
  dailyLimit: number
}

export default function DomainManage({ domainId, domain, dailyLimit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError,   setDeleteError]   = useState<string | null>(null)

  // Edit limit state
  const [editLimit,  setEditLimit]  = useState(false)
  const [limitValue, setLimitValue] = useState(String(dailyLimit))
  const [limitError, setLimitError] = useState<string | null>(null)
  const [limitOk,    setLimitOk]    = useState(false)

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

  function handleSaveLimit() {
    const val = parseInt(limitValue, 10)
    if (isNaN(val) || val < 1) { setLimitError('Entier ≥ 1 requis'); return }
    startTransition(async () => {
      setLimitError(null)
      setLimitOk(false)
      const res = await updateDomain(domainId, { daily_limit: val })
      if (res.error) {
        setLimitError(res.error)
      } else {
        setLimitOk(true)
        setEditLimit(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Limite journalière ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Limite journalière</p>
          <p className="text-xs text-[#475569] mt-0.5">Emails max envoyés par jour sur ce domaine</p>
        </div>
        {!editLimit ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#94a3b8]">{dailyLimit} / jour</span>
            <button
              onClick={() => { setEditLimit(true); setLimitOk(false) }}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white transition-all"
            >
              Modifier
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={limitValue}
              onChange={e => setLimitValue(e.target.value)}
              className="w-24 px-3 py-1.5 bg-[#07070f] border border-[#1e1e3f] rounded-lg text-sm text-white focus:outline-none focus:border-[#8b5cf6]/50"
              onKeyDown={e => e.key === 'Enter' && handleSaveLimit()}
              autoFocus
            />
            <button
              onClick={handleSaveLimit}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
            >
              {isPending ? '...' : 'Sauver'}
            </button>
            <button
              onClick={() => { setEditLimit(false); setLimitValue(String(dailyLimit)); setLimitError(null) }}
              className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
      {limitError && <p className="text-xs text-red-400">{limitError}</p>}
      {limitOk    && <p className="text-xs text-emerald-400">Limite mise à jour.</p>}

      {/* ── Séparateur ── */}
      <div className="border-t border-[#1e1e3f]" />

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
