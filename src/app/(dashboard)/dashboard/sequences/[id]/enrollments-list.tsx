'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import {
  getEnrollmentsPage,
  cancelEnrollment,
  setContactStatusFromSeq,
  addContactTagFromSeq,
  type EnrollmentRow,
} from '../actions'

const PER_PAGE = 20

const PROSPECT_OPTIONS = [
  { value: '',          label: '— statut —' },
  { value: 'new',       label: 'Nouveau' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'qualified', label: 'Qualifié' },
  { value: 'refused',   label: 'Refusé' },
  { value: 'converted', label: 'Converti' },
]

function eventLabel(row: EnrollmentRow): { text: string; cls: string } {
  if (row.status === 'replied')   return { text: 'A répondu',     cls: 'text-amber-400' }
  if (row.status === 'bounced')   return { text: 'Bounce',         cls: 'text-red-400' }
  if (row.status === 'completed') return { text: 'Séq. terminée', cls: 'text-emerald-400' }
  if (row.status === 'stopped')   return {
    text: row.stop_reason === 'manual' ? 'Arrêté manuellement' : row.stop_reason === 'refused' ? 'Refusé' : row.stop_reason === 'converted' ? 'Converti' : (row.stop_reason ?? 'Arrêté'),
    cls: 'text-[#475569]',
  }
  const ev = row.lastEvent
  if (!ev) return { text: 'En attente', cls: 'text-[#3b3b6f]' }
  if (ev.status === 'failed')  return { text: `Erreur : ${ev.last_error?.slice(0, 40) ?? '?'}`, cls: 'text-red-400' }
  if (ev.clicked_at)           return { text: 'Cliqué',          cls: 'text-blue-400' }
  if (ev.opened_at)            return { text: 'Ouvert',           cls: 'text-emerald-400' }
  if (ev.status === 'sent')    return { text: 'Envoyé',           cls: 'text-[#94a3b8]' }
  if (ev.status === 'cancelling' || ev.status === 'cancelled') return { text: 'Annulé', cls: 'text-[#475569]' }
  if (ev.status === 'pending') {
    const d = new Date(ev.scheduled_at)
    if (d.getFullYear() > 2090) return { text: 'En pause (séquence)', cls: 'text-amber-400' }
    return {
      text: `Prévu ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      cls: 'text-[#475569]',
    }
  }
  return { text: 'En attente', cls: 'text-[#3b3b6f]' }
}

function enrollmentBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'active':       return { label: 'Actif',       cls: 'text-violet-400 border-violet-400/20 bg-violet-400/10' }
    case 'completed':    return { label: 'Terminé',     cls: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' }
    case 'replied':      return { label: 'A répondu',   cls: 'text-amber-400 border-amber-400/20 bg-amber-400/10' }
    case 'bounced':      return { label: 'Bounce',      cls: 'text-red-400 border-red-400/20 bg-red-400/10' }
    case 'stopped':      return { label: 'Arrêté',      cls: 'text-[#475569] border-[#1e1e3f] bg-[#0a0a18]' }
    case 'unsubscribed': return { label: 'Désabonné',   cls: 'text-[#475569] border-[#1e1e3f] bg-[#0a0a18]' }
    default:             return { label: status,        cls: 'text-[#475569] border-[#1e1e3f]' }
  }
}

interface Props {
  seqId:               string
  totalSteps:          number
  initialEnrollments:  EnrollmentRow[]
  initialTotal:        number
}

export default function EnrollmentsList({ seqId, totalSteps, initialEnrollments, initialTotal }: Props) {
  const [rows,      setRows]      = useState(initialEnrollments)
  const [total,     setTotal]     = useState(initialTotal)
  const [page,      setPage]      = useState(1)
  const [search,    setSearch]    = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [loading,   startLoad]    = useTransition()
  const [acting,    startAction]  = useTransition()

  const [cancelledIds,    setCancelledIds]    = useState<Set<string>>(new Set())
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const [tagOpen,         setTagOpen]         = useState<string | null>(null)
  const [tagInput,        setTagInput]        = useState('')
  const [msgs,            setMsgs]            = useState<Record<string, { ok: boolean; text: string }>>({})

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input — fire after 400 ms idle
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (search !== activeSearch) goPage(1, search)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function flash(id: string, ok: boolean, text: string) {
    setMsgs(m => ({ ...m, [id]: { ok, text } }))
    setTimeout(() => setMsgs(m => { const n = { ...m }; delete n[id]; return n }), 3000)
  }

  function goPage(p: number, s = activeSearch) {
    startLoad(async () => {
      const res = await getEnrollmentsPage(seqId, p, PER_PAGE, s || undefined)
      if (res.enrollments) {
        setRows(res.enrollments)
        setTotal(res.total ?? 0)
        setPage(p)
        setActiveSearch(s)
        setCancelledIds(new Set())
        setStatusOverrides({})
      }
    })
  }

  function handleCancel(enrollmentId: string) {
    if (!confirm('Retirer ce contact de la séquence ? Les emails déjà envoyés ne seront pas affectés.')) return
    startAction(async () => {
      const res = await cancelEnrollment(enrollmentId)
      if (res.error) { flash(enrollmentId, false, res.error); return }
      setCancelledIds(s => new Set([...s, enrollmentId]))
    })
  }

  function handleStatus(enrollmentId: string, contactId: string, status: string) {
    if (!status) return
    const risky = status === 'refused' || status === 'converted'
    if (risky && !confirm(`Passer en "${status}" ? Les séquences actives de ce contact seront arrêtées automatiquement.`)) return
    startAction(async () => {
      const res = await setContactStatusFromSeq(contactId, status)
      if (res.error) { flash(enrollmentId, false, res.error); return }
      setStatusOverrides(o => ({ ...o, [enrollmentId]: status }))
      if (risky) setCancelledIds(s => new Set([...s, enrollmentId]))
      flash(enrollmentId, true, 'Statut mis à jour.')
    })
  }

  function handleAddTag(enrollmentId: string, contactId: string) {
    const tag = tagInput.trim()
    if (!tag) return
    startAction(async () => {
      const res = await addContactTagFromSeq(contactId, tag)
      if (res.error) { flash(enrollmentId, false, res.error); return }
      setTagInput('')
      setTagOpen(null)
      flash(enrollmentId, true, `Tag "${tag}" ajouté.`)
    })
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  if (total === 0) return (
    <p className="text-sm text-[#475569] py-2 text-center">Aucun contact inscrit dans cette séquence.</p>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
          Contacts inscrits
        </p>
        <span className="text-xs text-[#3b3b6f]">{total.toLocaleString('fr-FR')} au total</span>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3b3b6f] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#07070f] border border-[#1e1e3f] text-sm text-white placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3b3b6f] hover:text-[#94a3b8] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-xl border border-[#1e1e3f] overflow-x-auto transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-[#1e1e3f] bg-[#07070f]">
              {['Contact', 'Étape', 'Statut', 'Dernier événement', 'Actions'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[10px] font-semibold text-[#3b3b6f] uppercase tracking-wider ${i === 0 ? 'text-left' : i === 1 ? 'text-center' : i === 4 ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0d0d1c]">
            {rows.map(row => {
              const cancelled = cancelledIds.has(row.id)
              const ev        = eventLabel(row)
              const bdg       = enrollmentBadge(row.status)
              const curStatus = statusOverrides[row.id] ?? row.contact?.prospect_status ?? ''
              const msg       = msgs[row.id]
              const name      = row.contact
                ? (`${row.contact.first_name ?? ''} ${row.contact.last_name ?? ''}`).trim() || row.contact.email
                : row.contact_id.slice(0, 8)

              return (
                <tr
                  key={row.id}
                  className={`transition-opacity ${cancelled ? 'opacity-25 pointer-events-none' : 'hover:bg-[#07070f]/60'}`}
                >
                  {/* Contact */}
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="text-xs font-medium text-white truncate">{name}</p>
                    {row.contact && name !== row.contact.email && (
                      <p className="text-[10px] text-[#475569] truncate">{row.contact.email}</p>
                    )}
                  </td>

                  {/* Step */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="text-xs font-medium text-[#94a3b8]">{row.current_step}</span>
                    {totalSteps > 0 && (
                      <span className="text-[10px] text-[#3b3b6f]"> / {totalSteps}</span>
                    )}
                  </td>

                  {/* Enrollment status */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${bdg.cls}`}>
                      {bdg.label}
                    </span>
                  </td>

                  {/* Last event */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className={`text-[11px] truncate block ${ev.cls}`}>{ev.text}</span>
                    {msg && (
                      <span className={`text-[10px] mt-0.5 block ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {msg.text}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {/* Prospect status */}
                      <select
                        value={curStatus}
                        onChange={e => handleStatus(row.id, row.contact_id, e.target.value)}
                        disabled={acting}
                        className="text-[10px] px-1.5 py-1 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-[#94a3b8] focus:outline-none focus:border-violet-500/50 disabled:opacity-50 cursor-pointer"
                      >
                        {PROSPECT_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>

                      {/* Add tag */}
                      {tagOpen === row.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddTag(row.id, row.contact_id)
                              if (e.key === 'Escape') { setTagOpen(null); setTagInput('') }
                            }}
                            placeholder="tag…"
                            className="w-20 text-[10px] px-1.5 py-1 rounded-lg bg-[#0a0a18] border border-violet-500/40 text-white focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddTag(row.id, row.contact_id)}
                            disabled={acting}
                            className="text-[10px] text-violet-400 hover:text-violet-300 disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => { setTagOpen(null); setTagInput('') }}
                            className="text-[10px] text-[#475569] hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setTagOpen(row.id); setTagInput('') }}
                          className="text-[10px] text-[#3b3b6f] hover:text-violet-400 transition-colors px-1.5 py-1 rounded-lg border border-[#1e1e3f] hover:border-violet-500/30"
                        >
                          + tag
                        </button>
                      )}

                      {/* Cancel enrollment */}
                      {row.status === 'active' && (
                        <button
                          onClick={() => handleCancel(row.id)}
                          disabled={acting}
                          className="text-[10px] text-[#475569] hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#3b3b6f]">Page {page} / {totalPages}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => goPage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#475569] hover:border-violet-500/30 hover:text-violet-300 disabled:opacity-40 transition-all"
            >
              ← Préc.
            </button>
            <button
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#475569] hover:border-violet-500/30 hover:text-violet-300 disabled:opacity-40 transition-all"
            >
              Suiv. →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
