'use client'

import { useActionState, useTransition, useState } from 'react'
import { addSenderIdentity, verifySenderEmail } from '../actions'

type Identity = { id: string; email: string; display_name: string | null }

function VerifyButton({ identityId, domainId }: { identityId: string; domainId: string }) {
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => startTransition(async () => {
          const r = await verifySenderEmail(identityId, domainId)
          setResult(r.success ?? r.error ?? null)
        })}
        disabled={isPending}
        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
      >
        {isPending ? '...' : 'Envoyer email de vérif.'}
      </button>
      {result && <span className="text-xs text-gray-500">{result}</span>}
    </div>
  )
}

export default function AddSenderIdentityForm({
  domainId,
  domain,
  identities,
}: {
  domainId: string
  domain: string
  identities: Identity[]
}) {
  const [state, formAction, pending] = useActionState(addSenderIdentity, null)

  return (
    <div className="space-y-4">
      {identities.length > 0 && (
        <div className="space-y-2 mb-4">
          {identities.map((identity) => (
            <div key={identity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{identity.email}</p>
                {identity.display_name && <p className="text-xs text-gray-500">{identity.display_name}</p>}
              </div>
              <VerifyButton identityId={identity.id} domainId={domainId} />
            </div>
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-gray-700">Ajouter une adresse</p>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="domain_id" value={domainId} />
        <div className="flex gap-2">
          <input name="display_name" type="text" placeholder="Prénom Nom"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
            <input name="email" type="text" placeholder="prenom" required
              className="flex-1 px-3 py-2 text-sm focus:outline-none min-w-0" />
            <span className="px-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-300 py-2 shrink-0">
              @{domain}
            </span>
          </div>
        </div>
        {state && 'error' in state && <p className="text-xs text-red-600">{state.error}</p>}
        {state && 'success' in state && <p className="text-xs text-green-700">{state.success}</p>}
        <button type="submit" disabled={pending}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {pending ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>
    </div>
  )
}
