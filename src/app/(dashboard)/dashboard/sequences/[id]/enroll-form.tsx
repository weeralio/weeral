'use client'

import { useState, useTransition } from 'react'
import { enrollContacts, addSeqMailbox, removeSeqMailbox } from '../actions'
import ListPicker, { type ContactList } from '@/components/dashboard/list-picker'

interface Mailbox  { mailbox_id: string; email: string; display_name: string | null }
interface Identity { id: string; email: string; display_name: string | null }

interface Props {
  sequenceId:          string
  assignedMailboxes:   Mailbox[]
  availableIdentities: Identity[]
  lists:               ContactList[]
  totalCount:          number
}

export default function EnrollForm({ sequenceId, assignedMailboxes: initial, availableIdentities: initialAvail, lists, totalCount }: Props) {
  const [assigned, setAssigned] = useState(initial)
  const [avail,    setAvail]    = useState(initialAvail)
  const [listIds,    setListIds]    = useState<string[]>([])
  const [addOpen,    setAddOpen]    = useState(false)
  const [result,     setResult]     = useState<string | null>(null)
  const [error,      setError]      = useState('')
  const [startMode,  setStartMode]  = useState<'now' | 'later'>('now')
  const [startAt,    setStartAt]    = useState('')

  const [isPending,    start]    = useTransition()
  const [isMailboxOp,  startMbx] = useTransition()

  const selectedCount = listIds.length === 0
    ? totalCount
    : lists.filter(l => listIds.includes(l.id)).reduce((s, l) => s + l.count, 0)

  function handleAdd(identity: Identity) {
    setAddOpen(false)
    startMbx(async () => {
      const res = await addSeqMailbox(sequenceId, identity.id)
      if (res.error) { setError(res.error); return }
      setAssigned(prev => [...prev, { mailbox_id: identity.id, email: identity.email, display_name: identity.display_name }])
      setAvail(prev => prev.filter(i => i.id !== identity.id))
    })
  }

  function handleRemove(mailboxId: string) {
    startMbx(async () => {
      const res = await removeSeqMailbox(sequenceId, mailboxId)
      if (res.error) { setError(res.error); return }
      const removed = assigned.find(m => m.mailbox_id === mailboxId)
      setAssigned(prev => prev.filter(m => m.mailbox_id !== mailboxId))
      if (removed) setAvail(prev => [...prev, { id: removed.mailbox_id, email: removed.email, display_name: removed.display_name }])
    })
  }

  function enroll() {
    if (!assigned.length) return
    if (startMode === 'later' && !startAt) { setError('Sélectionne une date de démarrage.'); return }
    setError('')
    setResult(null)
    start(async () => {
      const res = await enrollContacts(
        sequenceId,
        listIds,
        startMode === 'later' ? startAt : undefined,
      )
      if (res.error) setError(res.error)
      else setResult(`${res.enrolled ?? 0} contacts inscrits${startMode === 'later' ? ` — démarrage le ${new Date(startAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}`)
    })
  }

  return (
    <div className="space-y-5">
      {/* Boîtes d'envoi */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Boîtes d&apos;envoi</label>
          {avail.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAddOpen(o => !o)}
                disabled={isMailboxOp}
                className="text-xs px-2.5 py-1 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-violet-500/40 hover:text-violet-300 transition-all disabled:opacity-50"
              >
                + Ajouter
              </button>
              {addOpen && (
                <div className="absolute right-0 z-10 mt-1 min-w-[220px] bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl shadow-xl overflow-hidden">
                  {avail.map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => handleAdd(i)}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#94a3b8] hover:bg-[#111128] hover:text-white transition-colors"
                    >
                      {i.display_name ? `${i.display_name} <${i.email}>` : i.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {assigned.length === 0 ? (
          <p className="text-sm text-[#475569] py-2">
            Aucune boîte assignée.{' '}
            {avail.length === 0
              ? <a href="/dashboard/domaines" className="text-violet-400 hover:text-violet-300 transition-colors">Configurer un domaine →</a>
              : 'Clique sur "+ Ajouter" pour en assigner une.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {assigned.map(m => (
              <div key={m.mailbox_id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#07070f] border border-[#1e1e3f]">
                <span className="text-sm text-[#94a3b8]">
                  {m.display_name ? `${m.display_name} <${m.email}>` : m.email}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(m.mailbox_id)}
                  disabled={isMailboxOp}
                  className="text-xs text-[#3b3b6f] hover:text-red-400 transition-colors disabled:opacity-40 ml-3 shrink-0"
                >
                  Retirer
                </button>
              </div>
            ))}
            {assigned.length > 1 && (
              <p className="text-xs text-[#3b3b6f] pl-1">Round-robin : les contacts seront répartis entre ces {assigned.length} boîtes.</p>
            )}
          </div>
        )}
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

      {/* Date de démarrage */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Démarrage</label>
        <div className="flex gap-2">
          {(['now', 'later'] as const).map(m => (
            <button key={m} type="button" onClick={() => setStartMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                startMode === m
                  ? 'border-violet-500/60 bg-violet-950/30 text-violet-300'
                  : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f] hover:text-[#94a3b8]'
              }`}>
              {m === 'now' ? 'Maintenant' : 'Planifier'}
            </button>
          ))}
        </div>
        {startMode === 'later' && (
          <input
            type="datetime-local"
            value={startAt}
            onChange={e => setStartAt(e.target.value)}
            min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
          />
        )}
      </div>

      {error  && <p className="text-sm text-red-400">{error}</p>}
      {result && <p className="text-sm text-emerald-400">✓ {result}</p>}

      <button
        onClick={enroll}
        disabled={isPending || assigned.length === 0 || selectedCount === 0}
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
