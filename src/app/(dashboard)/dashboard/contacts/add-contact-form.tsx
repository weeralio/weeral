'use client'

import { useActionState } from 'react'
import { addContact } from './actions'

export default function AddContactForm() {
  const [state, formAction, pending] = useActionState(addContact, null)

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input name="email" type="email" placeholder="email@exemple.com" required
          className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
        <input name="first_name" type="text" placeholder="Prénom"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
        <input name="company" type="text" placeholder="Entreprise"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>
      {state && 'error' in state && <p className="text-xs text-red-600">{state.error}</p>}
      {state && 'success' in state && <p className="text-xs text-green-700">{state.success}</p>}
      <button type="submit" disabled={pending}
        className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {pending ? 'Ajout...' : 'Ajouter'}
      </button>
    </form>
  )
}
