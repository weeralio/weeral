'use client'

import { useActionState, useTransition, useState } from 'react'
import { addSenderIdentity, verifySenderEmail } from '../actions'
import type { EmailProvider } from '../actions'

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
        className="text-xs text-[#8b5cf6] hover:underline disabled:opacity-50"
      >
        {isPending ? '...' : 'Envoyer email de vérif.'}
      </button>
      {result && <span className="text-xs text-[#475569]">{result}</span>}
    </div>
  )
}

export default function AddSenderIdentityForm({
  domainId,
  domain,
  identities,
  provider,
}: {
  domainId: string
  domain: string
  identities: Identity[]
  provider: EmailProvider
}) {
  const [state, formAction, pending] = useActionState(addSenderIdentity, null)

  return (
    <div className="space-y-4">
      {identities.length > 0 && (
        <div className="divide-y divide-[#1e1e3f] mb-4">
          {identities.map((identity) => (
            <div key={identity.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-white">{identity.email}</p>
                {identity.display_name && <p className="text-xs text-[#475569]">{identity.display_name}</p>}
              </div>
              {provider === 'aws' ? (
                <VerifyButton identityId={identity.id} domainId={domainId} />
              ) : (
                <span className="text-xs text-emerald-400">Prêt ✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="domain_id" value={domainId} />
        <div className="flex gap-2">
          <input
            name="display_name"
            type="text"
            placeholder="Prénom Nom"
            className="flex-1 px-3 py-2 bg-[#07070f] border border-[#1e1e3f] rounded-lg text-sm text-white placeholder-[#3b3b6f] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
          />
          <div className="flex-1 flex items-center bg-[#07070f] border border-[#1e1e3f] rounded-lg overflow-hidden focus-within:border-[#8b5cf6]/50 transition-colors">
            <input
              name="email"
              type="text"
              placeholder="prenom"
              required
              className="flex-1 px-3 py-2 text-sm text-white bg-transparent focus:outline-none min-w-0 placeholder-[#3b3b6f]"
            />
            <span className="px-3 text-sm text-[#3b3b6f] bg-[#111128] border-l border-[#1e1e3f] py-2 shrink-0">
              @{domain}
            </span>
          </div>
        </div>
        {state && 'error' in state && <p className="text-xs text-red-400">{state.error}</p>}
        {state && 'success' in state && <p className="text-xs text-emerald-400">{state.success}</p>}
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-[#8b5cf6] text-white text-sm rounded-lg hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
        >
          {pending ? 'Ajout...' : 'Ajouter l\'adresse'}
        </button>
      </form>
    </div>
  )
}
