'use client'

export type ForecastPoint = {
  date:     string   // YYYY-MM-DD
  actual:   number   // emails actually sent
  forecast: number   // planned volume
  label:    string   // display label e.g. "J4", "J9"
  isToday:  boolean
  isFuture: boolean
}

interface Props {
  points: ForecastPoint[]
  totalMailboxes: number
}

const W = 560
const H = 160
const PAD_L = 36
const PAD_R = 12
const PAD_T = 12
const PAD_B = 32
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

export default function WarmupForecastChart({ points, totalMailboxes }: Props) {
  if (!points.length) {
    return (
      <div className="flex items-center justify-center h-20 text-sm text-[#475569]">
        Aucune donnée disponible.
      </div>
    )
  }

  const maxVal = Math.max(...points.map(p => Math.max(p.actual, p.forecast)), 1)

  function xPos(i: number) {
    return PAD_L + (i / Math.max(points.length - 1, 1)) * PLOT_W
  }
  function yPos(v: number) {
    return PAD_T + PLOT_H - (v / maxVal) * PLOT_H
  }

  // Build SVG path strings
  const pastPoints  = points.map((p, i) => `${xPos(i)},${yPos(p.actual)}`)
  const futurePoints = points.map((p, i) => `${xPos(i)},${yPos(p.isFuture ? p.forecast : 0)}`)

  // Only draw past line for non-future points
  const pastLine = points
    .filter(p => !p.isFuture)
    .map((p, _, arr) => {
      const i = points.indexOf(p)
      return `${xPos(i)},${yPos(p.actual)}`
    })
    .join(' ')

  // Future line from today onwards
  const todayIdx  = points.findIndex(p => p.isToday)
  const futureIdx = todayIdx >= 0 ? todayIdx : points.findIndex(p => p.isFuture)
  const futureLine = points
    .slice(futureIdx >= 0 ? futureIdx : points.length)
    .map((p, _, arr) => {
      const i = points.indexOf(p)
      return `${xPos(i)},${yPos(p.forecast)}`
    })
    .join(' ')

  // Area fill for past
  const firstPastIdx = 0
  const lastPastIdx  = points.filter(p => !p.isFuture).length - 1
  const pastArea = lastPastIdx >= 0
    ? `${xPos(firstPastIdx)},${PAD_T + PLOT_H} ` + pastLine + ` ${xPos(lastPastIdx)},${PAD_T + PLOT_H}`
    : ''

  // Area fill for future
  const futurePts = points.slice(futureIdx >= 0 ? futureIdx : points.length)
  const lastFutureIdx = futureIdx + futurePts.length - 1
  const futureArea = futurePts.length > 1 && futureIdx >= 0
    ? `${xPos(futureIdx)},${PAD_T + PLOT_H} ` + futureLine + ` ${xPos(lastFutureIdx)},${PAD_T + PLOT_H}`
    : ''

  // Y axis ticks
  const yTicks = [0, Math.round(maxVal / 2), maxVal]
  // X axis: only show a subset of labels to avoid clutter
  const labelStep = Math.ceil(points.length / 7)
  const todayX = todayIdx >= 0 ? xPos(todayIdx) : null

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: '160px' }}
        aria-hidden="true"
      >
        {/* Grid lines */}
        {yTicks.map(v => (
          <line
            key={v}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={yPos(v)}
            y2={yPos(v)}
            stroke="#1e1e3f"
            strokeWidth={1}
          />
        ))}

        {/* Y axis labels */}
        {yTicks.map(v => (
          <text
            key={v}
            x={PAD_L - 6}
            y={yPos(v) + 4}
            fill="#475569"
            fontSize={9}
            textAnchor="end"
            fontFamily="monospace"
          >
            {v}
          </text>
        ))}

        {/* Today line */}
        {todayX !== null && (
          <>
            <line
              x1={todayX} x2={todayX}
              y1={PAD_T} y2={PAD_T + PLOT_H}
              stroke="#8b5cf6"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <text x={todayX + 3} y={PAD_T + 9} fill="#8b5cf6" fontSize={8} opacity={0.8}>
              Auj.
            </text>
          </>
        )}

        {/* Past area */}
        {pastArea && (
          <polygon
            points={pastArea}
            fill="url(#pastGrad)"
            opacity={0.3}
          />
        )}

        {/* Future area */}
        {futureArea && (
          <polygon
            points={futureArea}
            fill="url(#futureGrad)"
            opacity={0.15}
          />
        )}

        {/* Past line */}
        {pastLine && (
          <polyline
            points={pastLine}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Future line (dashed) */}
        {futureLine && futurePts.length > 1 && (
          <polyline
            points={futureLine}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.7}
          />
        )}

        {/* Past dots */}
        {points.filter(p => !p.isFuture && p.actual > 0).map((p, _) => {
          const i = points.indexOf(p)
          return (
            <circle
              key={p.date}
              cx={xPos(i)}
              cy={yPos(p.actual)}
              r={3}
              fill="#8b5cf6"
            />
          )
        })}

        {/* X axis labels */}
        {points.map((p, i) => {
          if (i % labelStep !== 0 && i !== points.length - 1 && !p.isToday) return null
          return (
            <text
              key={p.date}
              x={xPos(i)}
              y={H - 6}
              fill={p.isToday ? '#8b5cf6' : '#475569'}
              fontSize={8}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {p.label}
            </text>
          )
        })}

        {/* Gradients */}
        <defs>
          <linearGradient id="pastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="futureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Legend + summary */}
      <div className="flex items-center gap-5 text-xs text-[#475569] flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 bg-violet-500 rounded" />
          Envois réels
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="4" className="overflow-visible">
            <line x1="0" y1="2" x2="20" y2="2" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
          </svg>
          Prévisions
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-px h-3 bg-violet-500 opacity-60" />
          Aujourd&apos;hui
        </span>
        <span className="ml-auto text-[#475569]">
          {totalMailboxes} boîte{totalMailboxes > 1 ? 's' : ''} · J14 = fin du warmup
        </span>
      </div>
    </div>
  )
}
