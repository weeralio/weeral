'use client'

import { useState, useTransition } from 'react'
import { enrollContacts } from '../actions'

interface Identity { id: string; email: string; display_name: string | null }

export default function EnrollForm({ sequenceId, identities }: { sequenceId: string; identities: Identity[] }) {
  const [identityId, setIdentityId] = useState(identities[0]?.id ?? '')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  function enroll() {
    if (!identityId) return
    setError('')
    setResult(null)
    start(async () => {
      // Fetch all contact IDs server-side would be cleaner, but for now we pass empty
      // and let the server action handle fetching all contacts
      const res = await enrollContacts(sequenceId, [], identityId)
      if (res.error) setError(res.error)
      else setResult(`${res.enrolled ?? 0} contacts inscrits`)
    })
  }

  if (identities.length === 0) {
    return <p className="text-sm text-[#475569]">Aucune adresse d&apos;envoi configurée. <a href="/dashboard/domaines" className="text-violet-400">Ajouter un domaine →</a></p>
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs text-[#475569]">Adresse d&apos;envoi</label>
        <select
          value={identityId}
          onChange={e => setIdentityId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50"
        >
          {identities.map(i => (
            <option key={i.id} value={i.id}>{i.display_name ? `${i.display_name} <${i.email}>` : i.email}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && <p className="text-sm text-emerald-400">✓ {result}</p>}

      <button
        onClick={enroll}
        disabled={isPending || !identityId}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
      >
        {isPending ? 'Inscription en cours...' : 'Inscrire tous mes contacts actifs →'}
      </button>
      <p className="text-xs text-[#475569]">Les contacts déjà inscrits dans cette séquence seront ignorés.</p>
    </div>
  )
}
