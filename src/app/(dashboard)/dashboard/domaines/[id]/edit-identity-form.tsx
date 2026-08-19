'use client'

import { useState, useTransition } from 'react'
import { updateSenderIdentity } from '../actions'

export default function EditIdentityForm({
  identityId,
  domainId,
  domain,
  email,
  displayName,
}: {
  identityId: string
  domainId: string
  domain: string
  email: string
  displayName: string | null
}) {
  const currentPrefix = email.split('@')[0] ?? ''

  const [open, setOpen]           = useState(false)
  const [prefix, setPrefix]       = useState(currentPrefix)
  const [name, setName]           = useState(displayName ?? '')
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function open_form() {
    setPrefix(currentPrefix)
    setName(displayName ?? '')
    setError(null)
    setOpen(true)
  }

  function cancel() {
    setOpen(false)
    setError(null)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateSenderIdentity(identityId, domainId, {
        emailPrefix: prefix,
        displayName: name,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={open_form}
        title="Modifier l'expéditeur"
        className="shrink-0 text-[#334155] hover:text-violet-400 transition-colors p-1 rounded"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="mt-3 ml-5 space-y-2 border-t border-[#1e1e3f] pt-3">
      <p className="text-[10px] text-[#475569] uppercase tracking-wider font-medium">Modifier l&apos;expéditeur</p>

      {/* Email */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={prefix}
          onChange={e => setPrefix(e.target.value.toLowerCase().replace(/\s/g, ''))}
          placeholder="prenom.nom"
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50"
        />
        <span className="text-xs text-[#475569] shrink-0">@{domain}</span>
      </div>

      {/* Display name */}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nom affiché (ex: Jean Dupont)"
        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-xs placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50"
      />

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={isPending || !prefix.trim()}
          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium transition-all"
        >
          {isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
        <button
          onClick={cancel}
          disabled={isPending}
          className="px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#475569] hover:text-white text-xs transition-all disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
