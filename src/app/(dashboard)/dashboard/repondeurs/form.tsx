'use client'

import { useState, useTransition } from 'react'
import { createAutoResponder } from './actions'

interface Identity { id: string; email: string; display_name: string | null }

const TRIGGERS = [
  { value: 'reply', label: 'Réponse reçue', desc: 'Le contact répond à ton email', req: 'SES Receipt Rule' },
  { value: 'open',  label: 'Email ouvert',  desc: 'Le contact ouvre ton email', req: 'Automatique' },
  { value: 'click', label: 'Lien cliqué',   desc: 'Le contact clique sur un lien', req: 'Automatique' },
]

export default function AutoResponderForm({ identities }: { identities: Identity[] }) {
  const [trigger, setTrigger] = useState('reply')
  const [name, setName] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(0)
  const [identityId, setIdentityId] = useState(identities[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, start] = useTransition()

  function submit() {
    if (!name || !subject || !body || !identityId) return
    setError('')
    start(async () => {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('trigger_event', trigger)
      fd.append('delay_minutes', String(delayMinutes))
      fd.append('sender_identity_id', identityId)
      fd.append('subject', subject)
      fd.append('body_html', body)
      const res = await createAutoResponder(fd)
      if (res.error) setError(res.error)
      else {
        setSuccess(true)
        setName(''); setSubject(''); setBody('')
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Trigger selection */}
      <div className="space-y-2">
        <label className="text-xs text-[#475569]">Déclencheur</label>
        <div className="grid grid-cols-3 gap-2">
          {TRIGGERS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTrigger(t.value)}
              className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${
                trigger === t.value ? 'border-violet-500/50 bg-violet-950/20' : 'border-[#1e1e3f] hover:border-[#3b3b6f]'
              }`}
            >
              <span className={`text-xs font-medium ${trigger === t.value ? 'text-violet-300' : 'text-white'}`}>{t.label}</span>
              <span className="text-[10px] text-[#475569] leading-tight">{t.desc}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${t.req === 'Automatique' ? 'bg-emerald-950/40 text-emerald-500' : 'bg-amber-950/40 text-amber-500'}`}>
                {t.req}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <label className="text-xs text-[#475569]">Nom du répondeur *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Merci pour votre réponse"
            className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[#475569]">Délai avant envoi</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} value={delayMinutes} onChange={e => setDelayMinutes(parseInt(e.target.value) || 0)}
              className="w-20 px-2 py-2 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm text-center focus:outline-none focus:border-violet-500/50" />
            <span className="text-xs text-[#475569]">minutes</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[#475569]">Adresse d&apos;envoi</label>
          <select value={identityId} onChange={e => setIdentityId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50">
            {identities.map(i => (
              <option key={i.id} value={i.id}>{i.email}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 col-span-2">
          <label className="text-xs text-[#475569]">Objet *</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Re: {{subject}}"
            className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50" />
        </div>

        <div className="space-y-1.5 col-span-2">
          <label className="text-xs text-[#475569]">Message * <span className="text-[#3b3b6f]">(HTML — {'{{'+'first_name'+'}}'} disponible)</span></label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="<p>Bonjour {{first_name}},</p><p>Merci pour votre réponse...</p>"
            className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm font-mono placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 resize-none" />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">✓ Répondeur créé avec succès</p>}

      <button onClick={submit} disabled={isPending || !name || !subject || !body}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
        {isPending ? 'Création...' : 'Créer le répondeur →'}
      </button>
    </div>
  )
}
