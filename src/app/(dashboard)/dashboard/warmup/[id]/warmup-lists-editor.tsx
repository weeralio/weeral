'use client'

import { useState, useTransition } from 'react'
import { updateWarmupLists } from '../actions'

interface ContactList {
  id: string
  name: string
  color: string
}

interface Props {
  campaignId: string
  currentListIds: string[]
  allLists: ContactList[]
}

export default function WarmupListsEditor({ campaignId, currentListIds, allLists }: Props) {
  const [listIds, setListIds] = useState<string[]>(currentListIds)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const selectedLists = allLists.filter(l => listIds.includes(l.id))
  const availableLists = allLists.filter(l => !listIds.includes(l.id))

  function save(newIds: string[]) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateWarmupLists(campaignId, newIds)
      if (res.error) setError(res.error)
      else setSaved(true)
    })
  }

  function remove(id: string) {
    const next = listIds.filter(l => l !== id)
    setListIds(next)
    save(next)
  }

  function add(id: string) {
    const next = [...listIds, id]
    setListIds(next)
    save(next)
  }

  function setAll() {
    setListIds([])
    save([])
  }

  return (
    <div className="space-y-3">
      {/* Current state */}
      <div className="flex flex-wrap gap-2 min-h-[32px] items-center">
        {listIds.length === 0 ? (
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#1e1e3f] text-[#94a3b8] border border-[#2d2d5f]">
            Tous les contacts
          </span>
        ) : (
          selectedLists.map(list => (
            <span
              key={list.id}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-[#2d2d5f] bg-[#1e1e3f] text-white"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: list.color }}
              />
              {list.name}
              <button
                onClick={() => remove(list.id)}
                disabled={isPending}
                className="ml-0.5 text-[#475569] hover:text-red-400 transition-colors disabled:opacity-40"
                title="Retirer cette liste"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))
        )}

        {isPending && (
          <span className="text-[10px] text-[#475569]">Enregistrement…</span>
        )}
        {saved && !isPending && (
          <span className="text-[10px] text-emerald-400">Sauvegardé</span>
        )}
      </div>

      {/* Add controls */}
      <div className="flex flex-wrap gap-2">
        {availableLists.map(list => (
          <button
            key={list.id}
            onClick={() => add(list.id)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-dashed border-[#2d2d5f] text-[#475569] hover:text-white hover:border-violet-500/50 hover:bg-violet-500/10 transition-all disabled:opacity-40"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: list.color }}
            />
            {list.name}
          </button>
        ))}

        {listIds.length > 0 && (
          <button
            onClick={setAll}
            disabled={isPending}
            className="text-xs px-2.5 py-1 rounded-full border border-dashed border-[#2d2d5f] text-[#475569] hover:text-white hover:border-[#3b3b6f] transition-all disabled:opacity-40"
          >
            Tous les contacts
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <p className="text-[10px] text-[#3b3b6f]">
        {listIds.length === 0
          ? 'Le warmup envoie à tous tes contacts non désinscris.'
          : 'Le warmup envoie uniquement aux contacts dans les listes sélectionnées.'}
      </p>
    </div>
  )
}
