'use client'

import { useActionState } from 'react'
import { createCampaign } from '../actions'

type Identity = { id: string; email: string; display_name: string | null; domains: { domain: string } | { domain: string }[] | null }

export default function NewCampaignForm({ identities, contactCount }: { identities: Identity[]; contactCount: number }) {
  const [state, formAction, pending] = useActionState(createCampaign, null)

  return (
    <form action={formAction} className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la campagne</label>
          <input name="name" type="text" required placeholder="Ex: Prospection Mars 2026"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expéditeur</label>
          <select name="sender_identity_id" required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white">
            <option value="">Choisir une adresse d&apos;envoi...</option>
            {identities.map((i) => (
              <option key={i.id} value={i.id}>
                {i.display_name ? `${i.display_name} <${i.email}>` : i.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objet de l&apos;email</label>
          <input name="subject" type="text" required placeholder="Ex: Une question rapide sur {{company}}"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Corps de l&apos;email</label>
          <textarea name="body_html" required rows={8}
            placeholder="Bonjour {{first_name}},&#10;&#10;Je me permets de vous contacter..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-y" />
          <p className="mt-1 text-xs text-gray-400">
            Texte brut ou HTML. Variables : {'{{first_name}}'}, {'{{last_name}}'}, {'{{company}}'}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        Cette campagne sera envoyée à <strong>{contactCount} contacts actifs</strong>. L&apos;envoi sera progressif selon le warmup de ton domaine.
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{state.error}</p>
      )}

      <button type="submit" disabled={pending}
        className="w-full py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium">
        {pending ? 'Création...' : 'Créer la campagne'}
      </button>
    </form>
  )
}
