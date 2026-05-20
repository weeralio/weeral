'use client'

type Log = { date: string; emails_sent: number; bounces: number; complaints: number }

export default function WarmupChart({ logs, dailyLimit }: { logs: Log[]; dailyLimit: number }) {
  if (!logs.length) {
    return (
      <div className="flex items-center justify-center h-16 text-sm text-[#475569]">
        Aucune donnée disponible.
      </div>
    )
  }

  const max = Math.max(dailyLimit, ...logs.map(l => l.emails_sent), 1)
  const recent = logs.slice(-14)

  return (
    <div className="space-y-2.5">
      {recent.map((log) => {
        const pct = Math.min(100, Math.round((log.emails_sent / max) * 100))
        const limitPct = Math.min(100, Math.round((dailyLimit / max) * 100))
        const bounceRate = log.emails_sent > 0 ? (log.bounces / log.emails_sent) * 100 : 0
        const hasDanger = bounceRate > 5

        return (
          <div key={log.date} className="flex items-center gap-3">
            <span className="text-[#475569] text-xs w-14 shrink-0 tabular-nums">
              {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
            <div className="relative flex-1 h-5 bg-[#111128] rounded-md overflow-hidden">
              <div
                className="absolute top-0 bottom-0 w-px bg-[#3b3b6f]/70"
                style={{ left: `${limitPct}%` }}
              />
              <div
                className={`h-full rounded-md transition-all ${hasDanger ? 'bg-red-600/60' : 'bg-gradient-to-r from-violet-600 to-purple-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[#94a3b8] text-xs w-28 shrink-0 text-right tabular-nums">
              {log.emails_sent.toLocaleString()} / {dailyLimit.toLocaleString()}
            </span>
            {hasDanger && (
              <span className="text-red-400 text-xs shrink-0">⚠ {bounceRate.toFixed(1)}%</span>
            )}
          </div>
        )
      })}
      <div className="flex items-center gap-4 mt-1 pt-2 border-t border-[#1e1e3f] text-xs text-[#475569]">
        <div className="w-14 shrink-0" />
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm bg-gradient-to-r from-violet-600 to-purple-500" />
          Envoyés
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-px h-3 bg-[#3b3b6f]" />
          Limite
        </span>
      </div>
    </div>
  )
}
