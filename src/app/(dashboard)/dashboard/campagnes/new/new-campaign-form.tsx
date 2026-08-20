'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import { createCampaign } from '../actions'
import ListPicker, { type ContactList } from '@/components/dashboard/list-picker'
import EmailDesigner from '@/components/email-designer/EmailDesigner'

type Identity = { id: string; email: string; display_name: string | null; domains: { domain: string } | { domain: string }[] | null }

function IdentitySelect({ identities }: { identities: Identity[] }) {
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState<Identity | null>(null)
  const ref                     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const label = selected
    ? (selected.display_name ? `${selected.display_name} <${selected.email}>` : selected.email)
    : 'Choisir une adresse d\'envoi…'

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="sender_identity_id" value={selected?.id ?? ''} required />
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-[#07070f] border rounded-xl text-sm transition-colors text-left ${open ? 'border-[#8b5cf6]/50' : 'border-[#1e1e3f] hover:border-[#3b3b6f]'} ${selected ? 'text-white' : 'text-[#3b3b6f]'}`}
      >
        <span className="truncate">{label}</span>
        <svg className={`w-4 h-4 text-[#475569] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl shadow-xl overflow-hidden">
          {identities.map((i) => {
            const lbl = i.display_name ? `${i.display_name} <${i.email}>` : i.email
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => { setSelected(i); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selected?.id === i.id ? 'bg-[#8b5cf6]/15 text-violet-300' : 'text-[#94a3b8] hover:bg-[#111128] hover:text-white'}`}
              >
                {lbl}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface Props {
  identities: Identity[]
  contactCount: number
  lists: ContactList[]
}

export default function NewCampaignForm({ identities, contactCount, lists }: Props) {
  const [state, formAction, pending] = useActionState(createCampaign, null)
  const [listIds, setListIds] = useState<string[]>([])
  const [bodyHtml, setBodyHtml] = useState('')
  const [trackingEnabled, setTrackingEnabled] = useState(true)

  const selectedCount = listIds.length === 0
    ? contactCount
    : lists.filter(l => listIds.includes(l.id)).reduce((s, l) => s + l.count, 0)

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden fields */}
      <input type="hidden" name="list_ids" value={JSON.stringify(listIds)} />
      <input type="hidden" name="tracking_enabled" value={trackingEnabled ? '1' : '0'} />

      <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6 space-y-5">

        {/* Nom */}
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Nom de la campagne</label>
          <input
            name="name"
            type="text"
            required
            placeholder="Ex: Prospection Juin 2026"
            className="w-full px-3 py-2.5 bg-[#07070f] border border-[#1e1e3f] rounded-xl text-sm text-white placeholder-[#3b3b6f] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
          />
        </div>

        {/* Expéditeur */}
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Expéditeur</label>
          <IdentitySelect identities={identities} />
        </div>

        {/* Objet */}
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Objet de l&apos;email</label>
          <input
            name="subject"
            type="text"
            required
            placeholder="Ex: Une question rapide sur {{company}}"
            className="w-full px-3 py-2.5 bg-[#07070f] border border-[#1e1e3f] rounded-xl text-sm text-white placeholder-[#3b3b6f] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
          />
        </div>

        {/* Corps */}
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Corps de l&apos;email</label>
          <input type="hidden" name="body_html" value={bodyHtml} />
          <EmailDesigner value={bodyHtml} onChange={setBodyHtml} />
        </div>

        {/* Audience */}
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-2">Audience</label>
          <ListPicker
            lists={lists}
            totalCount={contactCount}
            value={listIds}
            onChange={setListIds}
          />
        </div>

        {/* Tracking */}
        <div className="pt-1 border-t border-[#1e1e3f]">
          <button
            type="button"
            role="switch"
            aria-checked={trackingEnabled}
            onClick={() => setTrackingEnabled(v => !v)}
            className="flex items-center justify-between w-full group"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-[#94a3b8] group-hover:text-white transition-colors">
                Suivi d&apos;ouverture &amp; de clics
              </p>
              <p className="text-xs text-[#334155] mt-0.5">
                Ajoute un pixel invisible et réérit les liens pour traquer les opens/clics.
                Désactiver améliore la délivrabilité.
              </p>
            </div>
            <div className={`ml-4 shrink-0 w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${trackingEnabled ? 'bg-violet-600' : 'bg-[#1e1e3f]'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${trackingEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Info résumé */}
      <div className="flex items-center gap-3 px-4 py-3 bg-violet-950/20 border border-violet-800/30 rounded-xl">
        <div className="w-7 h-7 rounded-lg bg-violet-900/40 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm text-violet-300">
          Sera envoyée à <strong className="text-white">{selectedCount.toLocaleString()} contacts</strong>. L&apos;envoi sera progressif selon le warmup du domaine.
        </p>
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-red-400 bg-red-950/20 border border-red-800/30 px-4 py-3 rounded-xl">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || selectedCount === 0}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold hover:from-[#6d28d9] hover:to-[#7c3aed] disabled:opacity-50 transition-all"
      >
        {pending ? 'Création…' : 'Créer la campagne →'}
      </button>
    </form>
  )
}
