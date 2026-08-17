'use client'

export interface MailboxActivity {
  mailbox_id:           string
  email:                string
  display_name:         string | null
  throttle_daily_limit: number
  throttle_sent_today:  number
  next_available_at:    string | null
  min_interval_seconds: number
  pendingCount:         number
}

function nextLabel(iso: string | null): string {
  if (!iso) return 'Disponible'
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  if (diff <= 0) return 'Disponible'
  if (diff < 60) return `dans ${diff} s`
  return `dans ${Math.round(diff / 60)} min`
}

function badge(m: MailboxActivity): { label: string; cls: string } {
  if (m.throttle_sent_today >= m.throttle_daily_limit)
    return { label: 'Quota atteint',    cls: 'text-red-400 bg-red-400/10 border-red-400/20' }
  const waitSec = m.next_available_at
    ? Math.round((new Date(m.next_available_at).getTime() - Date.now()) / 1000)
    : -1
  if (waitSec > 10)
    return { label: nextLabel(m.next_available_at), cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' }
  if (m.pendingCount === 0)
    return { label: 'Rien en attente', cls: 'text-[#475569] bg-[#0a0a18] border-[#1e1e3f]' }
  return { label: 'Actif',           cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }
}

export default function MailboxesPanel({ mailboxes }: { mailboxes: MailboxActivity[] }) {
  if (!mailboxes.length) return null
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Boîtes au travail</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {mailboxes.map(m => {
          const { label, cls } = badge(m)
          const pct = Math.min(100, Math.round((m.throttle_sent_today / Math.max(1, m.throttle_daily_limit)) * 100))
          return (
            <div key={m.mailbox_id} className="rounded-xl border border-[#1e1e3f] bg-[#07070f] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {m.display_name && (
                    <p className="text-sm font-medium text-white truncate">{m.display_name}</p>
                  )}
                  <p className="text-xs text-[#475569] truncate">{m.email}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
                  {label}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#475569]">
                  <span>{m.throttle_sent_today} / {m.throttle_daily_limit} envois aujourd&apos;hui</span>
                  <span className="text-[#3b3b6f]">{m.pendingCount} en attente</span>
                </div>
                <div className="h-1 rounded-full bg-[#1e1e3f] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-violet-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <p className="text-[10px] text-[#3b3b6f]">
                Intervalle : {Math.round(m.min_interval_seconds / 60)} min
                {m.next_available_at && ` · Prochaine dispo : ${nextLabel(m.next_available_at)}`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
