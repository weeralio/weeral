'use client'

import { useTransition } from 'react'
import { toggleAutoResponder, deleteAutoResponder } from './actions'

interface Responder {
  id: string
  name: string
  trigger_event: string
  delay_minutes: number
  subject: string
  is_active: boolean
  sent_count: number
  sender_identities: { email: string } | { email: string }[] | null
}

const TRIGGER_LABELS: Record<string, string> = {
  reply: '💬 Réponse',
  open:  '👁 Ouverture',
  click: '🔗 Clic',
}

export default function AutoResponderList({ responders }: { responders: Responder[] }) {
  const [isPending, start] = useTransition()

  function toggle(id: string, current: boolean) {
    start(async () => { await toggleAutoResponder(id, !current) })
  }

  function remove(id: string) {
    if (!confirm('Supprimer ce répondeur ?')) return
    start(async () => { await deleteAutoResponder(id) })
  }

  return (
    <div className="divide-y divide-[#1e1e3f]">
      {responders.map(r => {
        const identity = Array.isArray(r.sender_identities) ? r.sender_identities[0] : r.sender_identities
        return (
          <div key={r.id} className="px-5 py-4 flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${r.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-[#3b3b6f]'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-sm font-medium text-white">{r.name}</span>
                <span className="text-xs text-[#475569]">{TRIGGER_LABELS[r.trigger_event] ?? r.trigger_event}</span>
                {r.delay_minutes > 0 && <span className="text-xs text-[#475569]">· après {r.delay_minutes} min</span>}
              </div>
              <p className="text-xs text-[#475569] truncate">Objet : {r.subject}</p>
              {identity?.email && <p className="text-xs text-[#475569]">De : {identity.email}</p>}
              {r.sent_count > 0 && <p className="text-xs text-[#3b3b6f] mt-0.5">{r.sent_count} envoi{r.sent_count > 1 ? 's' : ''}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggle(r.id, r.is_active)}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  r.is_active
                    ? 'border-emerald-700/40 text-emerald-400 hover:bg-emerald-950/20'
                    : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'
                }`}
              >
                {r.is_active ? 'Actif' : 'Inactif'}
              </button>
              <button
                onClick={() => remove(r.id)}
                disabled={isPending}
                className="px-2 py-1.5 rounded-lg text-xs text-red-400 border border-red-700/30 hover:bg-red-950/20 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
