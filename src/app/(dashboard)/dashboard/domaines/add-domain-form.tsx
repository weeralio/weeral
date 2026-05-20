'use client'

import { useActionState } from 'react'
import { addDomain } from './actions'

export default function AddDomainForm() {
  const [state, formAction, pending] = useActionState(addDomain, null)

  return (
    <form action={formAction} className="flex gap-2 items-start">
      <div className="flex-1">
        <input
          name="domain"
          type="text"
          placeholder="mondomaine.com"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
        {state && 'error' in state && (
          <p className="mt-1 text-xs text-red-600">{state.error}</p>
        )}
        {state && 'success' in state && (
          <p className="mt-1 text-xs text-green-700">{state.success}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors shrink-0"
      >
        {pending ? 'Ajout...' : 'Ajouter'}
      </button>
    </form>
  )
}
