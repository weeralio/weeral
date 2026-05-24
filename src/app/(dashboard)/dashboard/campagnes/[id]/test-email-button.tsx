'use client'

import { useState, useTransition } from 'react'
import { sendTestEmail } from '../actions'

export default function TestEmailButton({ campaignId }: { campaignId: string }) {
  const [open, setOpen]     = useState(false)
  const [email, setEmail]   = useState('')
  const [msg, setMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, start]  = useTransition()

  function handleSend() {
    start(async () => {
      setMsg(null)
      const r = await sendTestEmail(campaignId, email)
      setMsg(r.error
        ? { type: 'error', text: r.error }
        : { type: 'success', text: r.success ?? 'Envoyé !' }
      )
      if (!r.error) setEmail('')
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 border border-[#1e1e3f] text-sm text-[#94a3b8] rounded-lg hover:border-[#8b5cf6]/40 hover:text-white transition-all"
      >
        Envoyer un test
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="ton@email.com"
        className="px-3 py-2 bg-[#07070f] border border-[#1e1e3f] rounded-lg text-sm text-white placeholder-[#3b3b6f] focus:outline-none focus:border-[#8b5cf6]/50 w-52"
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        autoFocus
      />
      <button
        onClick={handleSend}
        disabled={isPending || !email}
        className="px-4 py-2 bg-[#8b5cf6] text-white text-sm rounded-lg hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
      >
        {isPending ? '...' : 'Envoyer'}
      </button>
      <button
        onClick={() => { setOpen(false); setMsg(null) }}
        className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
      >
        Annuler
      </button>
      {msg && (
        <span className={`text-xs ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {msg.text}
        </span>
      )}
    </div>
  )
}
