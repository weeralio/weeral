'use client'

export type ContactList = {
  id: string
  name: string
  color: string | null
  count: number
}

interface Props {
  lists: ContactList[]
  totalCount: number
  value: string[]         // selected list IDs — empty means "tous"
  onChange: (ids: string[]) => void
}

const LIST_COLORS: Record<string, string> = {
  violet:  'bg-violet-500',
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  pink:    'bg-pink-500',
  cyan:    'bg-cyan-500',
}

export default function ListPicker({ lists, totalCount, value, onChange }: Props) {
  const allSelected = value.length === 0

  function toggleAll() {
    onChange([])
  }

  function toggleList(id: string) {
    if (value.includes(id)) {
      const next = value.filter(v => v !== id)
      onChange(next)
    } else {
      onChange([...value, id])
    }
  }

  const selectedCount = allSelected
    ? totalCount
    : lists.filter(l => value.includes(l.id)).reduce((s, l) => s + l.count, 0)

  return (
    <div className="space-y-2">
      {/* Tous les contacts */}
      <button
        type="button"
        onClick={toggleAll}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
          allSelected
            ? 'border-violet-500/50 bg-violet-950/20 text-white'
            : 'border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
            allSelected ? 'bg-violet-600 border-violet-600' : 'border-[#3b3b6f]'
          }`}>
            {allSelected && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="font-medium">Tous les contacts actifs</span>
        </div>
        <span className="text-xs text-[#475569]">{totalCount.toLocaleString()}</span>
      </button>

      {/* Listes individuelles */}
      {lists.length > 0 && (
        <div className="space-y-1.5 pl-0">
          {lists.map(list => {
            const checked = !allSelected && value.includes(list.id)
            const dotColor = LIST_COLORS[list.color ?? ''] ?? 'bg-violet-500'
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => {
                  // If "tous" was active, switch to per-list mode first
                  if (allSelected) {
                    onChange([list.id])
                  } else {
                    toggleList(list.id)
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  checked
                    ? 'border-violet-500/40 bg-violet-950/15 text-white'
                    : 'border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    checked ? 'bg-violet-600 border-violet-600' : 'border-[#3b3b6f]'
                  }`}>
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                  <span>{list.name}</span>
                </div>
                <span className="text-xs text-[#475569]">{list.count.toLocaleString()}</span>
              </button>
            )
          })}
        </div>
      )}

      {lists.length === 0 && (
        <p className="text-xs text-[#475569] px-1">
          Aucune liste créée. Tu peux en créer depuis{' '}
          <a href="/dashboard/contacts" className="text-violet-400 hover:text-violet-300 transition-colors">Contacts →</a>
        </p>
      )}

      {/* Résumé */}
      {!allSelected && value.length > 0 && (
        <p className="text-xs text-violet-400 px-1">
          {value.length} liste{value.length > 1 ? 's' : ''} sélectionnée{value.length > 1 ? 's' : ''} · {selectedCount.toLocaleString()} contacts
        </p>
      )}
    </div>
  )
}
