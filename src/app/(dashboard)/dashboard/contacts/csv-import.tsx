'use client'

import { useActionState, useRef } from 'react'
import { importContacts } from './actions'

export default function CsvImport() {
  const [state, formAction, pending] = useActionState(importContacts, null)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <form action={formAction}>
      <input ref={inputRef} name="csv" type="file" accept=".csv" className="hidden"
        onChange={(e) => e.target.form?.requestSubmit()} />
      <div className="flex flex-col items-end gap-1">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={pending}
          className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {pending ? 'Import...' : 'Importer CSV'}
        </button>
        {state && 'error' in state && <p className="text-xs text-red-600">{state.error}</p>}
        {state && 'success' in state && <p className="text-xs text-green-700">{state.success}</p>}
      </div>
    </form>
  )
}
