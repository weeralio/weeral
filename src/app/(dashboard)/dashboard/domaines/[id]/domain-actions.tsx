'use client'

import { useState, useTransition } from 'react'
import { initDomainVerification, refreshDomainStatus } from '../actions'

type Records = { tokens: string[]; txtRecord: string }

export default function DomainActions({ domainId, domain }: { domainId: string; domain: string }) {
  const [records, setRecords] = useState<Records | null>(null)
  const [sesStatus, setSesStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleInit() {
    startTransition(async () => {
      setError(null)
      const result = await initDomainVerification(domainId)
      if (result.error) setError(result.error)
      else setRecords({ tokens: result.tokens ?? [], txtRecord: result.txtRecord ?? '' })
    })
  }

  function handleCheck() {
    startTransition(async () => {
      setError(null)
      const result = await refreshDomainStatus(domainId)
      if (result.error) setError(result.error)
      else setSesStatus(result.status ?? null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button onClick={handleInit} disabled={isPending}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {isPending ? 'Chargement...' : 'Générer les records DNS'}
        </button>
        <button onClick={handleCheck} disabled={isPending}
          className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          Vérifier le statut
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {sesStatus && (
        <p className={`text-sm px-3 py-2 rounded-lg ${sesStatus === 'Success' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          Statut SES : <strong>{sesStatus}</strong>
        </p>
      )}

      {records && (
        <div className="space-y-4">
          {records.txtRecord && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">1 enregistrement TXT (vérification domaine)</p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 shrink-0">Nom</span>
                  <span className="text-gray-900 break-all">_amazonses.{domain}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 shrink-0">Type</span>
                  <span className="text-gray-900">TXT</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 shrink-0">Valeur</span>
                  <span className="text-gray-900 break-all">&quot;{records.txtRecord}&quot;</span>
                </div>
              </div>
            </div>
          )}

          {records.tokens.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">3 enregistrements CNAME (DKIM)</p>
              <div className="space-y-2">
                {records.tokens.map((token) => (
                  <div key={token} className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 shrink-0">Nom</span>
                      <span className="text-gray-900 break-all">{token}._domainkey.{domain}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 shrink-0">Type</span>
                      <span className="text-gray-900">CNAME</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 shrink-0">Valeur</span>
                      <span className="text-gray-900 break-all">{token}.dkim.amazonses.com</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">Propagation DNS : 15 min à 72h selon ton hébergeur.</p>
        </div>
      )}
    </div>
  )
}
