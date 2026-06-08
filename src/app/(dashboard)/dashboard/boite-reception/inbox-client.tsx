'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { InboxEmail } from './actions'
import { markEmailRead, markAllRead } from './actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "À l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'hier'
  if (d < 7) return `il y a ${d}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function senderName(email: InboxEmail) {
  if (email.from_name) return email.from_name
  const enr = email.sequence_enrollments
  const c = enr?.contacts
  if (c) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
    if (name) return name
    return c.email
  }
  return email.from_email
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  emails: InboxEmail[]
  domains: { id: string; domain: string }[]
  identities: { id: string; email: string; display_name: string | null; domain_id: string }[]
  activeDomain?: string
  activeIdentity?: string
  unreadOnly: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InboxClient({
  emails: initialEmails,
  domains,
  identities,
  activeDomain,
  activeIdentity,
  unreadOnly,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<InboxEmail | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(initialEmails.filter(e => e.read_at).map(e => e.id)),
  )
  const [isPending, startTransition] = useTransition()

  // Filtered identities based on active domain
  const filteredIdentities = useMemo(
    () => activeDomain
      ? identities.filter(i => i.domain_id === activeDomain)
      : identities,
    [identities, activeDomain],
  )

  const unreadCount = initialEmails.filter(e => !readIds.has(e.id)).length

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams()
    if (activeDomain && updates.domain !== null) params.set('domain', updates.domain ?? activeDomain)
    if (activeIdentity && updates.identity !== null) params.set('identity', updates.identity ?? activeIdentity)
    if (unreadOnly && updates.unread !== null) params.set('unread', updates.unread ?? '1')
    Object.entries(updates).forEach(([k, v]) => {
      if (v && !params.has(k)) params.set(k, v)
    })
    router.push(`/dashboard/boite-reception?${params.toString()}`)
  }

  function handleSelect(email: InboxEmail) {
    setSelected(email)
    if (!readIds.has(email.id)) {
      setReadIds(prev => new Set([...prev, email.id]))
      startTransition(() => markEmailRead(email.id))
    }
  }

  function handleMarkAllRead() {
    const unread = initialEmails.filter(e => !readIds.has(e.id)).map(e => e.id)
    setReadIds(prev => new Set([...prev, ...unread]))
    startTransition(() => markAllRead())
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">

      {/* ─── Top bar ─── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e1e3f] bg-[#07070f] shrink-0 flex-wrap">
        <h1 className="text-base font-semibold text-white mr-auto">
          Boîte de réception
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-medium bg-[#8b5cf6] text-white px-2 py-0.5 rounded-full">
              {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </h1>

        {/* Domain filter */}
        <select
          value={activeDomain ?? ''}
          onChange={e => updateParams({ domain: e.target.value || null, identity: null })}
          className="text-xs bg-[#111128] border border-[#1e1e3f] text-[#94a3b8] rounded-lg px-3 py-2 focus:outline-none focus:border-[#8b5cf6]"
        >
          <option value="">Tous les domaines</option>
          {domains.map(d => (
            <option key={d.id} value={d.id}>{d.domain}</option>
          ))}
        </select>

        {/* Mailbox filter */}
        <select
          value={activeIdentity ?? ''}
          onChange={e => updateParams({ identity: e.target.value || null })}
          className="text-xs bg-[#111128] border border-[#1e1e3f] text-[#94a3b8] rounded-lg px-3 py-2 focus:outline-none focus:border-[#8b5cf6]"
        >
          <option value="">Toutes les boîtes</option>
          {filteredIdentities.map(i => (
            <option key={i.id} value={i.id}>{i.display_name ? `${i.display_name} <${i.email}>` : i.email}</option>
          ))}
        </select>

        {/* Unread toggle */}
        <button
          onClick={() => updateParams({ unread: unreadOnly ? null : '1' })}
          className={`text-xs px-3 py-2 rounded-lg border transition-all ${
            unreadOnly
              ? 'border-[#8b5cf6]/60 bg-[#8b5cf6]/10 text-[#a78bfa]'
              : 'border-[#1e1e3f] text-[#475569] hover:text-[#94a3b8]'
          }`}
        >
          Non lus seulement
        </button>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Tout marquer lu
          </button>
        )}
      </div>

      {/* ─── Split pane ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── Email list ─── */}
        <div className={`flex flex-col border-r border-[#1e1e3f] overflow-y-auto bg-[#0a0a18] ${selected ? 'w-72 shrink-0' : 'flex-1'}`}>
          {initialEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#111128] border border-[#1e1e3f] flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-[#3b3b6f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-[#475569]">
                {unreadOnly ? 'Aucun message non lu.' : 'Aucune réponse reçue pour l\'instant.'}
              </p>
              <p className="text-xs text-[#334155] mt-1">
                Les réponses à tes séquences apparaîtront ici automatiquement.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e3f]">
              {initialEmails.map(email => {
                const isUnread = !readIds.has(email.id)
                const isActive = selected?.id === email.id
                const enr = email.sequence_enrollments
                const domain = enr?.sender_identities?.domains?.domain

                return (
                  <button
                    key={email.id}
                    onClick={() => handleSelect(email)}
                    className={`w-full text-left px-4 py-3.5 transition-all group ${
                      isActive
                        ? 'bg-[#111128] border-l-2 border-l-[#8b5cf6]'
                        : 'border-l-2 border-l-transparent hover:bg-[#0d0d1c]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${isUnread ? 'bg-[#8b5cf6]' : 'bg-transparent'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'font-medium text-[#94a3b8]'}`}>
                            {senderName(email)}
                          </span>
                          <span className="text-[10px] text-[#334155] shrink-0">{relativeTime(email.received_at)}</span>
                        </div>
                        <p className={`text-xs truncate mb-1 ${isUnread ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                          {email.subject ?? '(sans objet)'}
                        </p>
                        <div className="flex items-center gap-2">
                          {domain && (
                            <span className="text-[10px] text-[#3b3b6f] bg-[#111128] border border-[#1e1e3f] px-1.5 py-0.5 rounded">
                              {domain}
                            </span>
                          )}
                          {enr?.sequences?.name && (
                            <span className="text-[10px] text-[#3b3b6f] truncate">
                              {enr.sequences.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── Email detail ─── */}
        {selected ? (
          <div className="flex-1 overflow-y-auto bg-[#07070f] flex flex-col">

            {/* Header */}
            <div className="px-8 py-6 border-b border-[#1e1e3f]">
              <div className="flex items-start justify-between gap-4 mb-5">
                <h2 className="text-lg font-semibold text-white leading-snug">
                  {selected.subject ?? '(sans objet)'}
                </h2>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 text-[#475569] hover:text-[#94a3b8] transition-colors mt-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-[#475569] w-10">De</span>
                  <span className="text-[#94a3b8]">
                    {selected.from_name
                      ? <>{selected.from_name} <span className="text-[#475569]">&lt;{selected.from_email}&gt;</span></>
                      : selected.from_email
                    }
                  </span>
                </div>
                {selected.sequence_enrollments?.sender_identities && (
                  <div className="flex gap-2">
                    <span className="text-[#475569] w-10">À</span>
                    <span className="text-[#94a3b8]">
                      {selected.sequence_enrollments.sender_identities.display_name
                        ? `${selected.sequence_enrollments.sender_identities.display_name} <${selected.sequence_enrollments.sender_identities.email}>`
                        : selected.sequence_enrollments.sender_identities.email
                      }
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-[#475569] w-10">Date</span>
                  <span className="text-[#94a3b8]">
                    {new Date(selected.received_at).toLocaleString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Context (sequence + contact) */}
            {selected.sequence_enrollments && (
              <div className="px-8 py-4 border-b border-[#1e1e3f] bg-[#0a0a18] flex items-center gap-4 flex-wrap">
                {selected.sequence_enrollments.sequences && (
                  <Link
                    href={`/dashboard/sequences/${selected.sequence_enrollments.sequence_id}`}
                    className="flex items-center gap-1.5 text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Séquence : {selected.sequence_enrollments.sequences.name}
                  </Link>
                )}
                {selected.sequence_enrollments.contacts && (
                  <span className="flex items-center gap-1.5 text-xs text-[#475569]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {[
                      selected.sequence_enrollments.contacts.first_name,
                      selected.sequence_enrollments.contacts.last_name,
                    ].filter(Boolean).join(' ') || selected.sequence_enrollments.contacts.email}
                    <span className="text-[#334155]">· {selected.sequence_enrollments.contacts.email}</span>
                  </span>
                )}
                {selected.sequence_enrollments.sender_identities?.domains && (
                  <span className="text-xs text-[#3b3b6f] bg-[#111128] border border-[#1e1e3f] px-2 py-0.5 rounded">
                    {selected.sequence_enrollments.sender_identities.domains.domain}
                  </span>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 px-8 py-6">
              {selected.body_plain ? (
                <pre className="text-sm text-[#94a3b8] font-sans leading-relaxed whitespace-pre-wrap break-words">
                  {selected.body_plain.trim()}
                </pre>
              ) : (
                <p className="text-sm text-[#475569] italic">Corps du message non disponible.</p>
              )}
            </div>
          </div>
        ) : (
          /* Placeholder when nothing selected */
          initialEmails.length > 0 && (
            <div className="flex-1 flex items-center justify-center bg-[#07070f]">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#111128] border border-[#1e1e3f] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[#3b3b6f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-[#475569]">Sélectionne un message pour le lire.</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
