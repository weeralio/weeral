'use client'

import { useState, useTransition, useEffect } from 'react'
import { addSenderIdentitiesBulk } from '../actions'
import type { EmailProvider } from '../actions'

interface Mailbox {
  prefix: string
  displayName: string
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove accents
    .replace(/[^a-z0-9.]/g, '')
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function buildSuggestions(firstName: string, lastName: string): Mailbox[] {
  const fn = slugify(firstName)
  const ln = slugify(lastName)

  if (fn && ln) {
    return [
      { prefix: `${fn}.${ln}`,         displayName: `${cap(firstName)} ${cap(lastName)}` },
      { prefix: `${fn}.${ln[0]}`,      displayName: `${cap(firstName)} ${ln[0].toUpperCase()}.` },
      { prefix: `${fn[0]}.${ln}`,      displayName: `${fn[0].toUpperCase()}. ${cap(lastName)}` },
    ]
  }
  if (fn) {
    return [
      { prefix: fn,                    displayName: cap(firstName) },
      { prefix: `${fn}.pro`,           displayName: cap(firstName) },
      { prefix: `bonjour.${fn}`,       displayName: cap(firstName) },
    ]
  }
  return [
    { prefix: '', displayName: '' },
    { prefix: '', displayName: '' },
    { prefix: '', displayName: '' },
  ]
}

interface Props {
  domainId: string
  domain: string
  provider: EmailProvider
}

export default function BulkCreateForm({ domainId, domain, provider: _provider }: Props) {
  const [open, setOpen]             = useState(false)
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [mailboxes, setMailboxes]   = useState<Mailbox[]>([
    { prefix: '', displayName: '' },
    { prefix: '', displayName: '' },
    { prefix: '', displayName: '' },
  ])
  const [result, setResult]         = useState<{ created?: number; errors?: string[] } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Auto-update suggestions whenever firstName or lastName changes
  useEffect(() => {
    if (!firstName.trim() && !lastName.trim()) return
    setMailboxes(buildSuggestions(firstName, lastName))
  }, [firstName, lastName])

  function handleChange(index: number, field: 'prefix' | 'displayName', value: string) {
    setMailboxes(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  function handleSubmit() {
    setResult(null)
    startTransition(async () => {
      const res = await addSenderIdentitiesBulk(domainId, mailboxes)
      setResult(res)
      if (res.created > 0 && res.errors.length === 0) {
        setTimeout(() => {
          setOpen(false)
          setFirstName('')
          setLastName('')
          setMailboxes([
            { prefix: '', displayName: '' },
            { prefix: '', displayName: '' },
            { prefix: '', displayName: '' },
          ])
          setResult(null)
        }, 1500)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Créer 3 boîtes en lot
      </button>
    )
  }

  return (
    <div className="border border-[#8b5cf6]/20 bg-violet-950/10 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Créer 3 boîtes d&apos;envoi</p>
          <p className="text-xs text-[#475569] mt-0.5">Entre un prénom — le SaaS suggère 3 adresses</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Name inputs */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-[10px] font-medium text-[#475569] uppercase tracking-wider mb-1.5">Prénom *</label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Ex: Thomas"
            autoFocus
            className="w-full px-3 py-2.5 bg-[#07070f] border border-[#1e1e3f] rounded-xl text-sm text-white placeholder-[#3b3b6f] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-medium text-[#475569] uppercase tracking-wider mb-1.5">Nom (optionnel)</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Ex: Martin"
            className="w-full px-3 py-2.5 bg-[#07070f] border border-[#1e1e3f] rounded-xl text-sm text-white placeholder-[#3b3b6f] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
          />
        </div>
      </div>

      {/* Suggested mailboxes */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-[#475569] uppercase tracking-wider">Boîtes suggérées — modifiables</p>
        {mailboxes.map((mb, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Index */}
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#111128] border border-[#1e1e3f] text-[10px] font-bold text-[#475569] shrink-0">
              {i + 1}
            </span>

            {/* Prefix + domain */}
            <div className="flex items-center bg-[#07070f] border border-[#1e1e3f] rounded-xl overflow-hidden flex-1 focus-within:border-[#8b5cf6]/50 transition-colors">
              <input
                type="text"
                value={mb.prefix}
                onChange={e => handleChange(i, 'prefix', e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                placeholder="prefix"
                className="flex-1 px-3 py-2 text-sm text-white bg-transparent focus:outline-none min-w-0 placeholder-[#3b3b6f] font-mono"
              />
              <span className="px-2.5 py-2 text-xs text-[#3b3b6f] bg-[#111128] border-l border-[#1e1e3f] shrink-0 font-mono">
                @{domain}
              </span>
            </div>

            {/* Display name */}
            <input
              type="text"
              value={mb.displayName}
              onChange={e => handleChange(i, 'displayName', e.target.value)}
              placeholder="Nom affiché"
              className="w-36 px-3 py-2 bg-[#07070f] border border-[#1e1e3f] rounded-xl text-sm text-white placeholder-[#3b3b6f] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Domain suffix info */}
      <p className="text-xs text-[#475569]">
        Chaque boîte démarre son warmup indépendamment au Jour 1.
      </p>

      {/* Feedback */}
      {result && result.created > 0 && (
        <p className="text-sm text-emerald-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {result.created} boîte{result.created > 1 ? 's' : ''} créée{result.created > 1 ? 's' : ''} avec succès !
        </p>
      )}
      {result && result.errors && result.errors.length > 0 && (
        <p className="text-sm text-red-400">{result.errors.join(', ')}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 py-2.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:text-white transition-all"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending || mailboxes.every(m => !m.prefix.trim())}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold hover:from-[#6d28d9] hover:to-[#7c3aed] disabled:opacity-50 transition-all"
        >
          {isPending ? 'Création...' : 'Créer les 3 boîtes →'}
        </button>
      </div>
    </div>
  )
}
