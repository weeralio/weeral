'use client'

import { useState, useTransition } from 'react'
import { verifyContactEmailInSES } from './actions'

export default function VerifyEmailButton({ contactId }: { contactId: string }) {
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => startTransition(async () => {
          const r = await verifyContactEmailInSES(contactId)
          setResult(r.success ?? r.error ?? null)
        })}
        disabled={isPending}
        className="text-xs text-blue-600 hover:underline disabled:opacity-50 whitespace-nowrap"
      >
        {isPending ? '...' : 'Vérifier SES'}
      </button>
      {result && <span className="text-xs text-gray-400 truncate max-w-32">{result}</span>}
    </div>
  )
}
