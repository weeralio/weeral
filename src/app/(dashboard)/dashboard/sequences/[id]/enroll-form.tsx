'use client'

import { useState, useTransition } from 'react'
import { enrollContacts, updateSequenceSender } from '../actions'
import ListPicker, { type ContactList } from '@/components/dashboard/list-picker'

interface Identity { id: string; email: string; display_name: string | null }

interface Props {
  sequenceId: string
  identities: Identity[]
  lists: ContactList[]
  totalCount: number
  defaultIdentityId: string
}

export default function EnrollForm({ sequenceId, identities, lists, totalCount, defaultIdentityId }: Props) {
  const [identityId, setIdentityId] = useState(defaultIdentityId || identities[0]?.id || '')
  const [listIds, setListIds]        = useState<string[]>([])
  const [result, setResult]          = useState<string | null>(null)
  const [error, setError]            = useState('')
  const [isPending, start]           = useTransition()

  const selectedCount = listIds.length === 0
    ? totalCount
    : lists.filter(l => listIds.includes(l.id)).reduce((s, l) => s + l.count, 0)

  function enroll() {
    if (!identityId) return
    setError('')
    setResult(null)
    start(async () => {
      await updateSequenceSender(sequenceId, identityId)
      const res = await enrollContacts(sequenceId, listIds, identityId)
      if (res.error) setError(res.error)
      else setResult(`${res.enrolled ?? 0} contacts inscrits`)
    })
  }

  if (identities.length === 0) {
    return (
      <p className="text-sm text-[#475569]">
        Aucune adresse d&apos;envoi configurée.{' '}
        <a href="/dashboard/domaines" className="text-violet-400 hover:text-violet-300 transition-colors">Ajouter un domaine →</a>
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Adresse d'envoi */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Adresse d&apos;envoi</label>
        <IdentityDropdown
          identities={identities}
          value={identityId}
          onChange={setIdentityId}
        />
      </div>

      {/* Audience */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Audience</label>
        <ListPicker
          lists={lists}
          totalCount={totalCount}
          value={listIds}
          onChange={setListIds}
        />
      </div>

      {error  && <p className="text-sm text-red-400">{error}</p>}
      {result && <p className="text-sm text-emerald-400">✓ {result}</p>}

      <button
        onClick={enroll}
        disabled={isPending || !identityId || selectedCount === 0}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
      >
        {isPending
          ? 'Inscription en cours…'
          : `Inscrire ${selectedCount.toLocaleString()} contact${selectedCount > 1 ? 's' : ''} →`}
      </button>
      <p className="text-xs text-[#475569]">Les contacts déjà inscrits dans cette séquence seront ignorés.</p>
    </div>
  )
}

function IdentityDropdown({ identities, value, onChange }: { identities: Identity[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = identities.find(i => i.id === value)
  const label = selected
    ? (selected.display_name ? `${selected.display_name} <${selected.email}>` : selected.email)
    : 'Choisir…'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-[#07070f] border rounded-xl text-sm transition-colors ${open ? 'border-violet-500/50' : 'border-[#1e1e3f] hover:border-[#3b3b6f]'} text-white`}
      >
        <span className="truncate">{label}</span>
        <svg className={`w-4 h-4 text-[#475569] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl shadow-xl overflow-hidden">
          {identities.map(i => (
            <button
              key={i.id}
              type="button"
              onClick={() => { onChange(i.id); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === i.id ? 'bg-violet-950/30 text-violet-300' : 'text-[#94a3b8] hover:bg-[#111128] hover:text-white'}`}
            >
              {i.display_name ? `${i.display_name} <${i.email}>` : i.email}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
