'use client'

import { useState, useTransition } from 'react'
import { initDomainVerification, refreshDomainStatus, markDomainReady } from '../actions'
import type { EmailProvider } from '../actions'

// ─── AWS SES flow ─────────────────────────────────────────────────────────────

type Records = { tokens: string[]; txtRecord: string }

function AwsDomainActions({ domainId, domain }: { domainId: string; domain: string }) {
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
          className="px-4 py-2 bg-[#8b5cf6] text-white text-sm rounded-lg hover:bg-[#7c3aed] disabled:opacity-50 transition-colors">
          {isPending ? 'Chargement...' : 'Générer les records DNS'}
        </button>
        <button onClick={handleCheck} disabled={isPending}
          className="px-4 py-2 border border-[#1e1e3f] text-sm text-[#94a3b8] rounded-lg hover:border-[#8b5cf6]/40 hover:text-white disabled:opacity-50 transition-colors">
          Vérifier le statut SES
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 px-3 py-2 rounded-lg">{error}</p>}

      {sesStatus && (
        <p className={`text-sm px-3 py-2 rounded-lg border ${sesStatus === 'Success' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400' : 'bg-amber-950/30 border-amber-800/40 text-amber-400'}`}>
          Statut SES : <strong>{sesStatus}</strong>
        </p>
      )}

      {records && (
        <div className="space-y-4">
          {records.txtRecord && (
            <div>
              <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">1 enregistrement TXT (vérification domaine)</p>
              <DnsRecord rows={[
                { label: 'Nom', value: `_amazonses.${domain}` },
                { label: 'Type', value: 'TXT' },
                { label: 'Valeur', value: `"${records.txtRecord}"` },
              ]} />
            </div>
          )}
          {records.tokens.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">3 enregistrements CNAME (DKIM)</p>
              <div className="space-y-2">
                {records.tokens.map((token) => (
                  <DnsRecord key={token} rows={[
                    { label: 'Nom', value: `${token}._domainkey.${domain}` },
                    { label: 'Type', value: 'CNAME' },
                    { label: 'Valeur', value: `${token}.dkim.amazonses.com` },
                  ]} />
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-[#475569]">Propagation DNS : 15 min à 72h selon ton hébergeur.</p>
        </div>
      )}
    </div>
  )
}

// ─── Non-AWS provider flow ────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  brevo: 'Brevo',
  mailgun: 'Mailgun',
  sendgrid: 'SendGrid',
}

const PROVIDER_SPF: Record<string, string> = {
  brevo: 'include:spf.sendinblue.com',
  mailgun: 'include:mailgun.org',
  sendgrid: 'include:sendgrid.net',
}

const PROVIDER_DKIM_HELP: Record<string, string> = {
  brevo: 'Senders → Domains → ton domaine → "Authenticate this domain"',
  mailgun: 'Sending → Domains → ton domaine → DNS Records',
  sendgrid: 'Settings → Sender Authentication → Authenticate Your Domain',
}

function NonAwsDomainActions({
  domainId,
  domain,
  provider,
}: {
  domainId: string
  domain: string
  provider: string
}) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const label = PROVIDER_LABELS[provider] ?? provider
  const spfInclude = PROVIDER_SPF[provider] ?? `include:${provider}.com`
  const dkimHelp = PROVIDER_DKIM_HELP[provider] ?? `Dashboard ${label} → Domains`

  function handleMarkReady() {
    startTransition(async () => {
      const r = await markDomainReady(domainId)
      setMsg(r.error
        ? { type: 'error', text: r.error }
        : { type: 'success', text: 'Domaine marqué comme actif !' }
      )
    })
  }

  return (
    <div className="space-y-5">
      {/* Step 1 — SPF */}
      <div>
        <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
          1 · SPF — à ajouter chez ton registrar DNS
        </p>
        <DnsRecord rows={[
          { label: 'Nom', value: '@' },
          { label: 'Type', value: 'TXT' },
          { label: 'Valeur', value: `v=spf1 ${spfInclude} ~all` },
        ]} />
      </div>

      {/* Step 2 — DKIM */}
      <div>
        <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
          2 · DKIM — configurer dans {label}
        </p>
        <p className="text-sm text-[#475569] mb-2">
          Va dans ton dashboard {label} → <span className="text-[#94a3b8] font-mono text-xs">{dkimHelp}</span>, puis ajoute les enregistrements CNAME qu'il te donne chez ton registrar DNS.
        </p>
      </div>

      {/* Step 3 — DMARC */}
      <div>
        <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
          3 · DMARC — recommandé
        </p>
        <DnsRecord rows={[
          { label: 'Nom', value: `_dmarc.${domain}` },
          { label: 'Type', value: 'TXT' },
          { label: 'Valeur', value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}` },
        ]} />
      </div>

      <p className="text-xs text-[#475569]">Propagation DNS : 15 min à 72h selon ton hébergeur.</p>

      {/* Mark as ready */}
      <div className="pt-2 border-t border-[#1e1e3f]">
        <p className="text-sm text-[#475569] mb-3">
          Une fois les DNS propagés et le domaine authentifié dans {label}, clique pour activer le warmup.
        </p>
        <button onClick={handleMarkReady} disabled={isPending}
          className="px-4 py-2 bg-[#8b5cf6] text-white text-sm rounded-lg hover:bg-[#7c3aed] disabled:opacity-50 transition-colors">
          {isPending ? 'Activation...' : 'Mon domaine est configuré →'}
        </button>
        {msg && (
          <p className={`mt-2 text-sm px-3 py-2 rounded-lg border ${msg.type === 'success' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400' : 'bg-red-950/30 border-red-800/40 text-red-400'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── DNS record display ───────────────────────────────────────────────────────

function DnsRecord({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="bg-[#07070f] border border-[#1e1e3f] rounded-xl p-3 font-mono text-xs space-y-1.5">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex gap-4">
          <span className="text-[#3b3b6f] w-12 shrink-0">{label}</span>
          <span className="text-[#e2e8f0] break-all">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DomainActions({
  domainId,
  domain,
  provider,
}: {
  domainId: string
  domain: string
  provider: EmailProvider
}) {
  if (provider === 'aws') {
    return <AwsDomainActions domainId={domainId} domain={domain} />
  }

  if (provider) {
    return <NonAwsDomainActions domainId={domainId} domain={domain} provider={provider} />
  }

  // No provider configured
  return (
    <div className="text-sm text-[#475569] bg-[#07070f] border border-[#1e1e3f] rounded-xl px-4 py-3">
      Aucun expéditeur configuré.{' '}
      <a href="/dashboard/aws-setup" className="text-[#8b5cf6] hover:underline">
        Configurer un expéditeur →
      </a>
    </div>
  )
}
