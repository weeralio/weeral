'use client'

import { useState, useTransition, useRef, useActionState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  deleteContacts, addContactsToList, removeContactsFromList,
  createContactList, deleteContactList, importContacts, addContact,
  exportContactsCSV, bulkSetProspectStatus, bulkCancelContactSequences,
  getFilteredContactIds,
} from './actions'

const PROSPECT_STATUSES = [
  { value: 'new',       label: 'Nouveau',    color: 'text-[#94a3b8]' },
  { value: 'contacted', label: 'Contacté',   color: 'text-blue-400'  },
  { value: 'qualified', label: 'Qualifié',   color: 'text-violet-400'},
  { value: 'refused',   label: 'Refusé',     color: 'text-red-400'   },
  { value: 'converted', label: 'Converti',   color: 'text-emerald-400'},
]

interface Contact {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company: string | null
  prospect_status: string | null
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

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectingAll, setSelectingAll] = useState(false)

  // Clear stale selections when the page changes (contacts prop changes)
  useEffect(() => {
    const pageIds = new Set(contacts.map(c => c.id))
    setSelected(prev => {
      const cleaned = new Set([...prev].filter(id => pageIds.has(id)))
      return cleaned.size === prev.size ? prev : cleaned
    })
  }, [contacts])

  const allPageSelected = contacts.length > 0 && contacts.every(c => selected.has(c.id))
  const someSelected    = selected.size > 0

  // ── UI state ───────────────────────────────────────────────────────────────
  const [searchVal, setSearchVal]           = useState(initSearch)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showImport, setShowImport]         = useState(false)
  const [importListMode, setImportListMode] = useState<'none' | 'existing' | 'new'>('none')
  const [importListId, setImportListId]     = useState('')
  const [importNewListName, setImportNewListName] = useState('')
  const [importNewListColor, setImportNewListColor] = useState('#8b5cf6')
  const [importFile, setImportFile]         = useState<File | null>(null)
  const [showNewList, setShowNewList]       = useState(false)
  const [newListName, setNewListName]       = useState('')
  const [newListColor, setNewListColor]     = useState('#8b5cf6')
  const [showBulkListMenu, setShowBulkListMenu]     = useState(false)
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false)
  const [isPending, start]   = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [addState, addAction, addPending] = useActionState(addContact, null)

  // ── Routing helpers ────────────────────────────────────────────────────────
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

  // ── Selection helpers ──────────────────────────────────────────────────────
  function toggleAll() {
    if (allPageSelected) setSelected(new Set())
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

  async function selectAllMatching() {
    setSelectingAll(true)
    start(async () => {
      const res = await getFilteredContactIds({
        search: initSearch,
        status,
        listId: listId || undefined,
      })
      if (res.ids) setSelected(new Set(res.ids))
      setSelectingAll(false)
    })
  }

  // ── Flash ──────────────────────────────────────────────────────────────────
  function flash(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // ── Import ─────────────────────────────────────────────────────────────────
  async function doImport() {
    if (!importFile) return
    const fd = new FormData()
    fd.append('csv', importFile)
    if (importListMode === 'existing' && importListId) {
      fd.append('target_list_id', importListId)
    }
    if (importListMode === 'new' && importNewListName.trim()) {
      fd.append('new_list_name', importNewListName.trim())
      fd.append('new_list_color', importNewListColor)
    }
    start(async () => {
      const res = await importContacts(null, fd)
      if (res && 'error' in res) flash('error', res.error)
      else if (res && 'success' in res) {
        flash('success', res.success)
        setShowImport(false)
        setImportFile(null)
        setImportListMode('none')
        setImportNewListName('')
      }
    })
  }

  // ── Bulk ops ───────────────────────────────────────────────────────────────
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

  function bulkStatus(newStatus: string) {
    setShowBulkStatusMenu(false)
    start(async () => {
      const res = await bulkSetProspectStatus([...selected], newStatus)
      if (res.error) flash('error', res.error)
      else flash('success', `Statut mis à jour (${res.updated ?? selected.size})`)
    })
  }

  function bulkCancelSeqs() {
    if (!confirm(`Retirer ${selected.size} contact(s) de toutes leurs séquences actives ?`)) return
    start(async () => {
      const res = await bulkCancelContactSequences([...selected])
      if (res.error) flash('error', res.error)
      else {
        const msg = (res.cancelling ?? 0) > 0
          ? `${res.stopped ?? 0} séquence(s) arrêtée(s), ${res.cancelling} envoi(s) annulation en cours`
          : `${res.stopped ?? 0} séquence(s) arrêtée(s)`
        flash('success', msg)
      }
    })
  }

  // ── Export ─────────────────────────────────────────────────────────────────
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

  // ── Lists ──────────────────────────────────────────────────────────────────
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
          {/* Import toggle */}
          <button type="button" onClick={() => setShowImport(v => !v)} disabled={isPending}
            className={`px-3 py-2 rounded-xl border text-sm transition-all disabled:opacity-50 ${
              showImport
                ? 'border-violet-500/50 text-violet-300 bg-violet-950/20'
                : 'border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white'
            }`}>
            ↑ Importer CSV
          </button>
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

      {/* ── Import panel ───────────────────────────────────────────────────── */}
      {showImport && (
        <div className="px-5 py-4 rounded-2xl border border-[#1e1e3f] bg-[#07070f] space-y-4">
          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Importer des contacts CSV</p>

          {/* File picker */}
          <div>
            <input ref={csvRef} type="file" accept=".csv" className="hidden"
              onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => csvRef.current?.click()}
              className="w-full px-3 py-2.5 rounded-xl border border-dashed border-[#3b3b6f] text-sm text-left transition-all hover:border-violet-500/50 hover:text-white text-[#94a3b8]">
              {importFile ? (
                <span className="text-white">{importFile.name}</span>
              ) : (
                <span>Cliquer pour choisir un fichier CSV…</span>
              )}
            </button>
          </div>

          {/* List assignment */}
          <div className="space-y-3">
            <p className="text-xs text-[#475569]">Ajouter les contacts importés à une liste</p>
            <div className="flex items-center gap-2">
              {(['none', 'existing', 'new'] as const).map(m => (
                <button key={m} type="button" onClick={() => setImportListMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    importListMode === m
                      ? 'border-violet-500/60 bg-violet-950/30 text-violet-300'
                      : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f] hover:text-[#94a3b8]'
                  }`}>
                  {m === 'none' ? 'Aucune liste' : m === 'existing' ? 'Liste existante' : 'Créer une liste'}
                </button>
              ))}
            </div>

            {importListMode === 'existing' && (
              <select value={importListId} onChange={e => setImportListId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-sm text-[#94a3b8] focus:outline-none focus:border-violet-500/50">
                <option value="">— Choisir une liste —</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.count})</option>
                ))}
              </select>
            )}

            {importListMode === 'new' && (
              <div className="space-y-2">
                <input value={importNewListName} onChange={e => setImportNewListName(e.target.value)}
                  placeholder="Nom de la nouvelle liste"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#475569]">Couleur :</span>
                  {LIST_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setImportNewListColor(c)}
                      className={`w-5 h-5 rounded-full transition-all ${importNewListColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#07070f]' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={doImport}
              disabled={!importFile || isPending || (importListMode === 'existing' && !importListId) || (importListMode === 'new' && !importNewListName.trim())}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-all">
              {isPending ? 'Import en cours…' : 'Importer'}
            </button>
            <button type="button" onClick={() => { setShowImport(false); setImportFile(null); setImportListMode('none') }}
              className="px-4 py-2.5 rounded-xl border border-[#1e1e3f] text-sm text-[#475569] hover:text-[#94a3b8] transition-all">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Flash message */}
      {(message || addState) && (
        <div className={`px-4 py-2.5 rounded-xl text-sm ${
          message?.type === 'error' || (addState && 'error' in addState)
            ? 'bg-red-950/30 border border-red-700/40 text-red-300'
            : 'bg-emerald-950/30 border border-emerald-700/40 text-emerald-300'
        }`}>
          {message?.text ?? (addState && 'error' in addState ? addState.error : addState && 'success' in addState ? addState.success : '')}
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

                {/* Statut prospect */}
                <div className="relative">
                  <button onClick={() => setShowBulkStatusMenu(v => !v)}
                    className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-xs text-[#94a3b8] hover:border-[#3b3b6f] transition-all">
                    Statut
                  </button>
                  {showBulkStatusMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowBulkStatusMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-40 py-1 rounded-xl border border-[#1e1e3f] bg-[#0a0a18] shadow-xl">
                        {PROSPECT_STATUSES.map(s => (
                          <button key={s.value} onClick={() => bulkStatus(s.value)}
                            className={`w-full px-3 py-2 text-xs text-left hover:bg-[#1e1e3f] transition-all ${s.color}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Retirer des séquences */}
                <button onClick={bulkCancelSeqs} disabled={isPending}
                  className="px-3 py-2 rounded-xl border border-[#1e1e3f] text-xs text-[#94a3b8] hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50 transition-all">
                  ✕ Séquences
                </button>

                <button onClick={bulkDelete} disabled={isPending}
                  className="px-3 py-2 rounded-xl border border-red-700/40 text-red-400 text-xs hover:bg-red-950/20 disabled:opacity-50 transition-all">
                  Supprimer
                </button>
              </div>
            )}
          </div>

          {/* Select-all-matching banner */}
          {allPageSelected && totalCount > contacts.length && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-violet-950/20 border border-violet-500/30 text-sm">
              <span className="text-violet-300 text-xs">
                Les {contacts.length} contacts de cette page sont sélectionnés.
              </span>
              <button onClick={selectAllMatching} disabled={selectingAll || isPending}
                className="text-xs text-violet-300 font-medium underline underline-offset-2 hover:text-white disabled:opacity-50 transition-colors">
                {selectingAll ? 'Chargement…' : `Sélectionner les ${totalCount.toLocaleString()} contacts correspondants`}
              </button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl border border-[#1e1e3f] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e3f] bg-[#07070f]">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={allPageSelected} onChange={toggleAll}
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
                      <span className="text-xs font-medium text-[#475569] uppercase tracking-wider">Prospect</span>
                    </th>
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
                      <td colSpan={8} className="px-4 py-16 text-center text-sm text-[#475569]">
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
                          {(() => {
                            const ps = PROSPECT_STATUSES.find(s => s.value === (c.prospect_status ?? 'new'))
                            return <span className={`text-xs ${ps?.color ?? 'text-[#94a3b8]'}`}>{ps?.label ?? '—'}</span>
                          })()}
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
