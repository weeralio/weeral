'use client'

import { useState, useTransition } from 'react'
import { saveProviderApiKey, deleteProviderConfig, type ProviderType } from '../aws-setup/provider-actions'

const PROVIDER_LABELS: Record<ProviderType, string> = {
  brevo:    'Brevo',
  mailgun:  'Mailgun',
  sendgrid: 'SendGrid',
}

interface ProviderRowProps {
  provider: ProviderType
}

function ProviderRow({ provider }: ProviderRowProps) {
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'idle' | 'edit' | 'delete'>('idle')
  const [apiKey, setApiKey] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function handleSave() {
    if (!apiKey.trim()) return
    startTransition(async () => {
      setMsg(null)
      const res = await saveProviderApiKey(provider, apiKey.trim())
      if (res && 'error' in res) {
        setMsg({ type: 'err', text: res.error })
      } else {
        setMsg({ type: 'ok', text: 'Clé mise à jour.' })
        setMode('idle')
        setApiKey('')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      setMsg(null)
      const res = await deleteProviderConfig(provider)
      if (res.error) setMsg({ type: 'err', text: res.error })
      // on success page revalidates — row disappears automatically
    })
  }

  return (
    <div className="bg-[#07070f] border border-[#1e1e3f] rounded-xl px-4 py-3 space-y-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-sm text-white font-medium">{PROVIDER_LABELS[provider]}</span>
        </div>

        {mode === 'idle' && (
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-800/30">
              Configuré
            </span>
            <button
              onClick={() => { setMode('edit'); setMsg(null) }}
              className="text-xs px-2.5 py-1 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white transition-all"
            >
              Modifier
            </button>
            <button
              onClick={() => { setMode('delete'); setMsg(null) }}
              className="text-xs px-2.5 py-1 rounded-lg border border-red-800/40 text-red-400 hover:bg-red-950/30 transition-all"
            >
              Supprimer
            </button>
          </div>
        )}

        {mode !== 'idle' && (
          <button
            onClick={() => { setMode('idle'); setApiKey(''); setMsg(null) }}
            className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Annuler
          </button>
        )}
      </div>

      {/* Edit mode */}
      {mode === 'edit' && (
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder="Nouvelle clé API"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            className="flex-1 px-3 py-1.5 bg-[#0d0d1c] border border-[#1e1e3f] rounded-lg text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#8b5cf6]/50"
          />
          <button
            onClick={handleSave}
            disabled={isPending || !apiKey.trim()}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] disabled:opacity-50 transition-colors shrink-0"
          >
            {isPending ? '...' : 'Vérifier & sauver'}
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {mode === 'delete' && (
        <div className="flex items-center gap-3">
          <p className="text-xs text-[#94a3b8] flex-1">
            Supprimer la connexion {PROVIDER_LABELS[provider]} ? Irréversible.
          </p>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 border border-red-800/50 text-red-400 hover:bg-red-900/70 disabled:opacity-50 transition-all shrink-0"
          >
            {isPending ? '...' : 'Confirmer'}
          </button>
        </div>
      )}

      {/* Feedback */}
      {msg && (
        <p className={`text-xs ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

interface Props {
  providers: ProviderType[]
}

export default function ProviderManage({ providers }: Props) {
  if (providers.length === 0) return null
  return (
    <div className="space-y-2">
      {providers.map(p => (
        <ProviderRow key={p} provider={p} />
      ))}
    </div>
  )
}
