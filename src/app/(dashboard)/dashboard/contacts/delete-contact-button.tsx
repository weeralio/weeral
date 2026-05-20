'use client'

import { useTransition } from 'react'
import { deleteContact } from './actions'

export default function DeleteContactButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => deleteContact(id))}
      disabled={isPending}
      className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
    >
      Supprimer
    </button>
  )
}
