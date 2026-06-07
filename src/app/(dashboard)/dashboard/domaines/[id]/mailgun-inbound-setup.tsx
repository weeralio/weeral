'use client'

import { useState, useEffect } from 'react'
import { setupMailgunInbound, checkMailgunInbound } from '../actions'
import { Button } from '@/components/ui/button'

interface Props {
  domainId: string
  domain: string
}

export default function MailgunInboundSetup({ domainId, domain }: Props) {
  const [configured, setConfigured]     = useState(false)
  const [mxRecords, setMxRecords]       = useState<string[]>([])
  const [replyDomain, setReplyDomain]   = useState(`reply.${domain}`)
  const [statusLoading, setStatusLoading] = useState(true)
  const [setupLoading, setSetupLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)

  // Check status on mount — runs client-side so it doesn't block page load
  useEffect(() => {
    checkMailgunInbound(domainId)
      .then(result => {
        if (result.configured !== undefined) setConfigured(result.configured)
        if (result.mxRecords?.length) setMxRecords(result.mxRecords)
        if (result.replyDomain) setReplyDomain(result.replyDomain)
        if (result.error) setError(result.error)
      })
      .catch(() => { /* Mailgun unreachable — show unconfigured state */ })
      .finally(() => setStatusLoading(false))
  }, [domainId])

  async function handleSetup() {
    setSetupLoading(true)
    setError(null)
    const result = await setupMailgunInbound(domainId)
    setSetupLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setConfigured(true)
      if (result.mxRecords?.length) setMxRecords(result.mxRecords)
      if (result.replyDomain) setReplyDomain(result.replyDomain)
    }
  }

  return (
    <div className="space-y-4">

      {/* Status dot */}
      <div className="flex items-center gap-2">
        {statusLoading ? (
          <div className="w-2 h-2 rounded-full bg-[#475569] animate-pulse" />
        ) : (
          <div className={`w-2 h-2 rounded-full ${configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        )}
        <span className="text-sm text-[#94a3b8]">
          {statusLoading
            ? 'Vérification...'
            : configured
              ? 'Route configurée — les réponses arrivent automatiquement.'
              : 'Non configuré'}
        </span>
      </div>

      {/* Explanation */}
      <p className="text-xs text-[#475569] leading-relaxed">
        Chaque email de séquence inclura un <strong className="text-[#94a3b8]">Reply-To</strong> unique{' '}
        (<code className="text-violet-400">r+ID@{replyDomain}</code>). Quand un contact répond,
        Mailgun capture la réponse et marque automatiquement l&apos;inscription comme répondue — sans action manuelle.
      </p>

      {/* MX records — show once we know the region (after status check or after setup) */}
      {mxRecords.length > 0 && (
        <div className="rounded-xl border border-[#1e1e3f] bg-[#07070f] p-4 space-y-3">
          <p className="text-xs font-medium text-[#94a3b8]">
            1. Ajoute ces enregistrements MX pour{' '}
            <code className="text-violet-400">{replyDomain}</code> chez ton hébergeur DNS :
          </p>
          <div className="space-y-2">
            {mxRecords.map(mx => (
              <div key={mx} className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[#475569] w-8">MX</span>
                <span className="text-[#475569] w-6">10</span>
                <span className="text-white">{mx}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#475569]">
            Hôte : <code className="text-[#94a3b8]">{replyDomain}</code> · Priorité : 10
          </p>
        </div>
      )}

      {/* Setup button */}
      <div className="rounded-xl border border-[#1e1e3f] bg-[#07070f] p-4">
        <p className="text-xs font-medium text-[#94a3b8] mb-2">
          {mxRecords.length > 0 ? '2.' : '1.'} Clique sur le bouton pour configurer la route Mailgun :
        </p>
        <p className="text-xs text-[#475569] mb-3">
          Crée le domaine <code className="text-violet-400">{replyDomain}</code> dans Mailgun et
          configure une route qui transfère les réponses vers notre webhook + ton adresse email.
          Cette action est sûre à relancer si besoin.
        </p>
        <Button
          onClick={handleSetup}
          disabled={setupLoading || statusLoading}
          variant={configured ? 'outline' : 'default'}
          size="sm"
        >
          {setupLoading
            ? 'Configuration...'
            : configured
              ? 'Reconfigurer la route'
              : 'Configurer la route Mailgun'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/20 border border-red-800/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {configured && !error && (
        <p className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-800/30 rounded-lg px-3 py-2">
          Les réponses de tes prospects sont détectées automatiquement. La séquence s&apos;arrête dès qu&apos;un contact répond.
        </p>
      )}
    </div>
  )
}
