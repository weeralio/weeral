'use client'

import { useState, useTransition, useRef, useActionState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  deleteContacts, addContactsToList, removeContactsFromList,
  createContactList, deleteContactList, importContacts, addContact,
  exportContactsCSV,
} from './actions'

interface Contact {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company: string | null
  unsubscribed: boolean
  created_at: string
}

interface ContactList {
  id: string
  name: string
  color: string
  count: number
}

interface Props {
  contacts: Contact[]
  totalCount: number
  page: number
  perPage: number
  search: string
  status: string
  sort: string
  dir: string
  tab: string
  listId: string
  lists: ContactList[]
  contactLists: Record<string, string[]>
  stats: { active: number; unsubscribed: number; total: number }
}

const SORT_COLS = [
  { key: 'email', label: 'Email' },
  { key: 'first_name', label: 'Prénom' },
  { key: 'company', label: 'Entreprise' },
  { key: 'created_at', label: 'Date' },
]

const LIST_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4']

export default function ContactsClient({
  contacts, totalCount, page, perPage,
  search: initSearch, status, sort, dir, tab, listId,
  lists, contactLists, stats,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const allSelected = contacts.length > 0 && selected.size === contacts.length
  const someSelected = selected.size > 0

  // UI state
  const [searchVal, setSearchVal] = useState(initSearch)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState('#8b5cf6')
  const [bulkListId, setBulkListId] = useState('')
  const [showBulkListMenu, setShowBulkListMenu] = useState(false)
  const [isPending, start] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Add contact form state
  const [addState, addAction, addPending] = useActionState(addContact, null)
  const [importState, importAction, importPending] = useActionState(importContacts, null)

  function push(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams(window.location.search)
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === '') sp.delete(k)
      else sp.set(k, v)
    })
    router.push(`${pathname}?${sp.toString()}`)
  }

  function onSearch(val: string) {
    setSearchVal(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => push({ search: val, page: '1' }), 400)
  }

  function toggleSort(col: string) {
    if (sort === col) push({ sort: col, dir: dir === 'asc' ? 'desc' : 'asc', page: '1' })
    else push({ sort: col, dir: 'desc', page: '1' })
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(contacts.map(c => c.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function flash(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  function bulkDelete() {
    if (!confirm(`Supprimer ${selected.size} contact(s) ?`)) return
    start(async () => {
      const res = await deleteContacts([...selected])
      if (res.error) flash('error', res.error)
      else { flash('success', `${selected.size} contact(s) supprimé(s)`); setSelected(new Set()) }
    })
  }

  function bulkAddToList(lId: string) {
    start(async () => {
      const res = await addContactsToList(lId, [...selected])
      if (res.error) flash('error', res.error)
      else { flash('success', `Ajoutés à la liste`); setShowBulkListMenu(false) }
    })
  }

  async function doExport() {
    start(async () => {
      const res = await exportContactsCSV(listId || undefined)
      if (res.error) { flash('error', res.error); return }
      const blob = new Blob([res.csv!], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = res.filename!; a.click()
      URL.revokeObjectURL(url)
    })
  }

  function createList() {
    if (!newListName.trim()) return
    start(async () => {
      const res = await createContactList(newListName, newListColor)
      if (res.error) flash('error', res.error)
      else { setNewListName(''); setShowNewList(false); flash('success', 'Liste créée') }
    })
  }

  function removeList(id: string) {
    if (!confirm('Supprimer cette liste ? Les contacts ne seront pas supprimés.')) return
    start(async () => {
      const res = await deleteContactList(id)
      if (res.error) flash('error', res.error)
      else { if (listId === id) push({ list: undefined }); flash('success', 'Liste supprimée') }
    })
  }

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <div className="space-y-4 max-w-5xl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-[#475569] mt-1">
            {stats.active.toLocaleString()} actifs · {stats.unsubscribed.toLocaleString()} désabonnés · {lists.length} liste{lists.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import */}
          <form action={importAction} className="inline-flex">
            <input ref={csvRef} name="csv" type="file" accept=".csv" className="hidden"
              onChange={e => e.target.form?.requestSubmit()} />
            <button type="button" onClick={() => csvRef.current?.click()} disabled={importPending}
              className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-sm text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white transition-all disabled:opacity-50">
              {importPending ? 'Import...' : '↑ Importer CSV'}
            </button>
          </form>
          {/* Export */}
          <button onClick={doExport} disabled={isPending}
            className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-sm text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white transition-all disabled:opacity-50">
            ↓ Exporter
          </button>
          {/* Add contact */}
          <button onClick={() => setShowAddContact(v => !v)}
            className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
            + Ajouter
          </button>
        </div>
      </div>

      {/* Flash message */}
      {(message || importState || addState) && (
        <div className={`px-4 py-2.5 rounded-xl text-sm ${
          message?.type === 'error' || (importState && 'error' in importState) || (addState && 'error' in addState)
            ? 'bg-red-950/30 border border-red-700/40 text-red-300'
            : 'bg-emerald-950/30 border border-emerald-700/40 text-emerald-300'
        }`}>
          {message?.text
            ?? (importState && 'error' in importState ? importState.error : importState && 'success' in importState ? importState.success : '')
            ?? (addState && 'error' in addState ? addState.error : addState && 'success' in addState ? addState.success : '')}
        </div>
      )}

      {/* Add contact form */}
      {showAddContact && (
        <div className="px-5 py-4 rounded-2xl border border-[#1e1e3f] bg-[#07070f] space-y-3">
          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Ajouter un contact</p>
          <form action={addAction} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input name="email" type="email" placeholder="email@exemple.com" required
              className="col-span-2 px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50" />
            <input name="first_name" placeholder="Prénom"
              className="px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50" />
            <input name="company" placeholder="Entreprise"
              className="px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50" />
            <button type="submit" disabled={addPending}
              className="col-span-2 sm:col-span-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-all">
              {addPending ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[#1e1e3f]">
        {[
          { key: 'contacts', label: `Contacts (${stats.total.toLocaleString()})` },
          { key: 'lists',    label: `Listes (${lists.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => push({ tab: t.key, list: undefined })}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              tab === t.key ? 'border-violet-500 text-violet-300' : 'border-transparent text-[#475569] hover:text-[#94a3b8]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LISTS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'lists' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#475569]">Organise tes contacts en listes pour cibler des groupes spécifiques.</p>
            <button onClick={() => setShowNewList(v => !v)}
              className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all shrink-0">
              + Nouvelle liste
            </button>
          </div>

          {/* New list form */}
          {showNewList && (
            <div className="px-5 py-4 rounded-2xl border border-[#1e1e3f] bg-[#07070f] space-y-3">
              <div className="flex items-center gap-3">
                <input value={newListName} onChange={e => setNewListName(e.target.value)}
                  placeholder="Nom de la liste" onKeyDown={e => e.key === 'Enter' && createList()}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50" />
                <button onClick={createList} disabled={!newListName.trim() || isPending}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-all">
                  Créer
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#475569]">Couleur :</span>
                {LIST_COLORS.map(c => (
                  <button key={c} onClick={() => setNewListColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${newListColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#07070f]' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          )}

          {/* Lists */}
          {lists.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#475569]">Aucune liste. Crées-en une pour organiser tes contacts.</p>
          ) : (
            <div className="space-y-2">
              {lists.map(list => (
                <div key={list.id} className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-[#1e1e3f] hover:border-[#3b3b6f] transition-all group">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                  <button onClick={() => push({ tab: 'contacts', list: list.id })}
                    className="flex-1 text-left">
                    <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">{list.name}</p>
                    <p className="text-xs text-[#475569] mt-0.5">{list.count.toLocaleString()} contact{list.count !== 1 ? 's' : ''}</p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => doExport()}
                      className="text-xs text-[#475569] hover:text-[#94a3b8] px-2 py-1 rounded-lg hover:bg-[#1e1e3f] transition-all">
                      ↓ Export
                    </button>
                    <button onClick={() => removeList(list.id)}
                      className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-950/20 transition-all">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONTACTS TAB ───────────────────────────────────────────────────── */}
      {tab === 'contacts' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3b3b6f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={searchVal} onChange={e => onSearch(e.target.value)}
                placeholder="Rechercher email, nom, entreprise..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors" />
            </div>

            {/* Status */}
            <select value={status} onChange={e => push({ status: e.target.value, page: '1' })}
              className="px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-sm text-[#94a3b8] focus:outline-none focus:border-violet-500/50">
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="unsubscribed">Désabonnés</option>
            </select>

            {/* Active list filter badge */}
            {listId && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/40 bg-violet-950/20 text-xs text-violet-300">
                <span>{lists.find(l => l.id === listId)?.name ?? 'Liste'}</span>
                <button onClick={() => push({ list: undefined })} className="hover:text-white">✕</button>
              </div>
            )}

            {/* Bulk actions */}
            {someSelected && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-[#475569]">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>

                {/* Add to list */}
                <div className="relative">
                  <button onClick={() => setShowBulkListMenu(v => !v)}
                    className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-xs text-[#94a3b8] hover:border-[#3b3b6f] transition-all">
                    + Liste
                  </button>
                  {showBulkListMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowBulkListMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 py-1 rounded-xl border border-[#1e1e3f] bg-[#0a0a18] shadow-xl">
                        {lists.length === 0
                          ? <p className="px-3 py-2 text-xs text-[#475569]">Aucune liste</p>
                          : lists.map(l => (
                            <button key={l.id} onClick={() => bulkAddToList(l.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#94a3b8] hover:bg-[#1e1e3f] transition-all">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                              {l.name}
                            </button>
                          ))
                        }
                      </div>
                    </>
                  )}
                </div>

                <button onClick={bulkDelete} disabled={isPending}
                  className="px-3 py-2 rounded-xl border border-red-700/40 text-red-400 text-xs hover:bg-red-950/20 disabled:opacity-50 transition-all">
                  Supprimer
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-[#1e1e3f] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e3f] bg-[#07070f]">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll}
                        className="rounded border-[#3b3b6f] bg-[#0a0a18] accent-violet-600" />
                    </th>
                    {SORT_COLS.map(col => (
                      <th key={col.key} className="px-4 py-3 text-left">
                        <button onClick={() => toggleSort(col.key)}
                          className="flex items-center gap-1 text-xs font-medium text-[#475569] uppercase tracking-wider hover:text-[#94a3b8] transition-colors">
                          {col.label}
                          {sort === col.key && (
                            <span className="text-violet-400">{dir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-[#475569] uppercase tracking-wider">Statut</span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium text-[#475569] uppercase tracking-wider">Listes</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0e0e25]">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-sm text-[#475569]">
                        {initSearch ? 'Aucun résultat pour cette recherche.' : 'Aucun contact.'}
                      </td>
                    </tr>
                  ) : contacts.map(c => {
                    const isSelected = selected.has(c.id)
                    const cLists = (contactLists[c.id] ?? []).map(lId => lists.find(l => l.id === lId)).filter(Boolean)
                    return (
                      <tr key={c.id} className={`group transition-colors ${isSelected ? 'bg-violet-950/10' : 'hover:bg-[#07070f]'}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(c.id)}
                            className="rounded border-[#3b3b6f] bg-[#0a0a18] accent-violet-600" />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white font-medium">{c.email}</span>
                        </td>
                        <td className="px-4 py-3 text-[#94a3b8]">
                          {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#94a3b8]">{c.company || '—'}</td>
                        <td className="px-4 py-3 text-[#475569] text-xs">
                          {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          {c.unsubscribed
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e1e3f] text-[#475569]">Désabonné</span>
                            : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400">Actif</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {cLists.map(l => l && (
                              <span key={l.id} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} title={l.name} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#475569]">
                {((page - 1) * perPage + 1).toLocaleString()}–{Math.min(page * perPage, totalCount).toLocaleString()} sur {totalCount.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => push({ page: String(page - 1) })} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f] disabled:opacity-30 transition-all">←</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2
                  if (p < 1 || p > totalPages) return null
                  return (
                    <button key={p} onClick={() => push({ page: String(p) })}
                      className={`w-8 h-8 rounded-lg border text-xs font-medium transition-all ${p === page ? 'border-violet-500/50 bg-violet-950/30 text-violet-300' : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => push({ page: String(page + 1) })} disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f] disabled:opacity-30 transition-all">→</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
