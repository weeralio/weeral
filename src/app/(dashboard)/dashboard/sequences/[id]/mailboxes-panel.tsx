'use client'

import { useState, useTransition } from 'react'
import { updateMailboxQuota } from '../actions'

export interface MailboxActivity {
  mailbox_id:           string
  email:                string
  display_name:         string | null
  throttle_daily_limit: number
  throttle_sent_today:  number
  next_available_at:    string | null
  min_interval_seconds: number
  pendingCount:         number
}

function nextLabel(iso: string | null): string {
  if (!iso) return 'Disponible'
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  if (diff <= 0) return 'Disponible'
  if (diff < 60) return `dans ${diff} s`
  return `dans ${Math.round(diff / 60)} min`
}

function statusBadge(m: MailboxActivity & { localLimit: number }): { label: string; cls: string } {
  if (m.throttle_sent_today >= m.localLimit)
    return { label: 'Quota atteint',   cls: 'text-red-400 bg-red-400/10 border-red-400/20' }
  const waitSec = m.next_available_at
    ? Math.round((new Date(m.next_available_at).getTime() - Date.now()) / 1000) : -1
  if (waitSec > 10)
    return { label: nextLabel(m.next_available_at), cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' }
  if (m.pendingCount === 0)
    return { label: 'Rien en attente', cls: 'text-[#475569] bg-[#0a0a18] border-[#1e1e3f]' }
  return   { label: 'Actif',           cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }
}

function MailboxCard({ m }: { m: MailboxActivity }) {
  const [editing,  setEditing]  = useState(false)
  const [limit,    setLimit]    = useState(m.throttle_daily_limit)
  const [interval, setInterval] = useState(Math.round(m.min_interval_seconds / 60))
  const [savedLimit,    setSavedLimit]    = useState(m.throttle_daily_limit)
  const [savedInterval, setSavedInterval] = useState(Math.round(m.min_interval_seconds / 60))
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, start]      = useTransition()

  function save() {
    start(async () => {
      const res = await updateMailboxQuota(m.mailbox_id, limit, interval)
      if (res.error) {
        setMsg({ ok: false, text: res.error })
      } else {
        setSavedLimit(limit)
        setSavedInterval(interval)
        setEditing(false)
        setMsg({ ok: true, text: 'Réglages sauvegardés.' })
        setTimeout(() => setMsg(null), 2500)
      }
    })
  }

  function cancel() {
    setLimit(savedLimit)
    setInterval(savedInterval)
    setEditing(false)
  }

  const pct = Math.min(100, Math.round((m.throttle_sent_today / Math.max(1, savedLimit)) * 100))
  const { label, cls } = statusBadge({ ...m, localLimit: savedLimit })

  return (
    <div className="rounded-xl border border-[#1e1e3f] bg-[#07070f] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {m.display_name && (
            <p className="text-sm font-medium text-white truncate">{m.display_name}</p>
          )}
          <p className="text-xs text-[#475569] truncate">{m.email}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
          {label}
        </span>
      </div>

      {/* Quota bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-[#475569]">
          <span>{m.throttle_sent_today} / {savedLimit} envois aujourd&apos;hui</span>
          <span className="text-[#3b3b6f]">{m.pendingCount} en attente</span>
        </div>
        <div className="h-1 rounded-full bg-[#1e1e3f] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-violet-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Settings — edit or read-only */}
      {editing ? (
        <div className="space-y-2 pt-1 border-t border-[#111128]">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-[#475569] uppercase tracking-wider">Limite / jour</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1} max={500}
                  value={limit}
                  onChange={e => setLimit(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50"
                />
                <span className="text-[10px] text-[#3b3b6f] shrink-0">emails</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[#475569] uppercase tracking-wider">Intervalle</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1} max={1440}
                  value={interval}
                  onChange={e => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50"
                />
                <span className="text-[10px] text-[#3b3b6f] shrink-0">min</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-[#3b3b6f]">
            S&apos;applique à toutes les séquences utilisant cette boîte.
          </p>
          {msg && <p className={`text-[10px] ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-medium transition-all"
            >
              {isPending ? 'Sauvegarde…' : '✓ Sauvegarder'}
            </button>
            <button
              onClick={cancel}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#475569] hover:text-white text-[11px] transition-all disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#3b3b6f]">
            {savedLimit} emails/jour · {savedInterval} min entre chaque
            {m.next_available_at && ` · Dispo ${nextLabel(m.next_available_at)}`}
          </p>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-[10px] text-[#3b3b6f] hover:text-violet-400 transition-colors flex items-center gap-1 ml-2"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier
          </button>
        </div>
      )}

      {msg && !editing && (
        <p className={`text-[10px] ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
      )}
    </div>
  )
}

export default function MailboxesPanel({ mailboxes }: { mailboxes: MailboxActivity[] }) {
  if (!mailboxes.length) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Boîtes au travail</p>
        <p className="text-[10px] text-[#3b3b6f]">Cliquer sur Modifier pour régler la cadence</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {mailboxes.map(m => <MailboxCard key={m.mailbox_id} m={m} />)}
      </div>
    </div>
  )
}
