'use client'

import { useState, useRef, useCallback } from 'react'

interface DataPoint {
  date: string
  [key: string]: number | string
}

interface SeriesConfig {
  key: string
  label: string
  color: string
  fill?: string
  formatType?: 'number' | 'percent2' | 'percent3'
}

interface LineChartProps {
  data: DataPoint[]
  series: SeriesConfig[]
  height?: number
  noDataText?: string
}

const W = 600
const PADDING = { top: 16, right: 16, bottom: 32, left: 44 }
const CHART_W = W - PADDING.left - PADDING.right

export default function LineChart({ data, series, height = 180, noDataText = 'Aucune donnée' }: LineChartProps) {
  const [hover, setHover] = useState<{ x: number; idx: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const CHART_H = height - PADDING.top - PADDING.bottom

  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-[#475569]" style={{ height }}>
        {noDataText}
      </div>
    )
  }

  // Compute min/max across all series
  const allValues = data.flatMap(d => series.map(s => (d[s.key] as number) ?? 0))
  const yMin = 0
  const yMax = Math.max(...allValues, 0.001)
  const yRange = yMax - yMin || 1

  function toX(i: number) {
    return PADDING.left + (i / Math.max(data.length - 1, 1)) * CHART_W
  }

  function toY(v: number) {
    return PADDING.top + CHART_H - ((v - yMin) / yRange) * CHART_H
  }

  function makePath(key: string) {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)},${toY((d[key] as number) ?? 0).toFixed(1)}`)
      .join(' ')
  }

  function makeFill(key: string) {
    const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY((d[key] as number) ?? 0).toFixed(1)}`).join(' ')
    const xFirst = toX(0).toFixed(1)
    const xLast  = toX(data.length - 1).toFixed(1)
    const yBottom = (PADDING.top + CHART_H).toFixed(1)
    return `M ${xFirst},${yBottom} L ${pts} L ${xLast},${yBottom} Z`
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = (e.clientX - rect.left) / rect.width
    const svgX = ratio * W
    const relX = svgX - PADDING.left
    const idx = Math.round((relX / CHART_W) * (data.length - 1))
    const clamped = Math.max(0, Math.min(data.length - 1, idx))
    setHover({ x: toX(clamped), idx: clamped })
  }

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => yMin + t * yRange)
  const defaultFmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1)
  function fmtForSeries(s: SeriesConfig, v: number) {
    if (s.formatType === 'percent2') return `${v.toFixed(2)}%`
    if (s.formatType === 'percent3') return `${v.toFixed(3)}%`
    if (s.formatType === 'number') return Math.round(v).toLocaleString()
    return defaultFmt(v)
  }

  // X-axis labels: show ~5 evenly spaced dates
  const xLabels: number[] = []
  const step = Math.max(1, Math.floor(data.length / 5))
  for (let i = 0; i < data.length; i += step) xLabels.push(i)
  if (!xLabels.includes(data.length - 1)) xLabels.push(data.length - 1)

  const hovered = hover !== null ? data[hover.idx] : null
  const tooltipX = hover ? Math.min(hover.x, W - 120) : 0

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${height}`}
      className="w-full"
      style={{ height }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={PADDING.left} y1={toY(v)}
            x2={PADDING.left + CHART_W} y2={toY(v)}
            stroke="#1e1e3f" strokeWidth="1"
          />
          <text
            x={PADDING.left - 6} y={toY(v)}
            textAnchor="end" dominantBaseline="middle"
            fill="#475569" fontSize="10"
          >
            {defaultFmt(v)}
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {xLabels.map(i => (
        <text
          key={i}
          x={toX(i)} y={PADDING.top + CHART_H + 18}
          textAnchor="middle" fill="#475569" fontSize="10"
        >
          {new Date(data[i].date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </text>
      ))}

      {/* Series: fill then line */}
      {series.map(s => (
        <g key={s.key}>
          {s.fill && (
            <path d={makeFill(s.key)} fill={s.fill} />
          )}
          <path
            d={makePath(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Hover */}
      {hover && hovered && (
        <>
          <line
            x1={hover.x} y1={PADDING.top}
            x2={hover.x} y2={PADDING.top + CHART_H}
            stroke="#3b3b6f" strokeWidth="1" strokeDasharray="3,3"
          />
          {series.map(s => {
            const val = (hovered[s.key] as number) ?? 0
            return (
              <circle
                key={s.key}
                cx={hover.x} cy={toY(val)}
                r="4" fill={s.color} stroke="#0a0a18" strokeWidth="2"
              />
            )
          })}

          {/* Tooltip */}
          <g transform={`translate(${tooltipX + 8}, ${PADDING.top + 4})`}>
            <rect
              x="0" y="0"
              width="110"
              height={16 + series.length * 16}
              rx="6" fill="#0a0a18" stroke="#1e1e3f" strokeWidth="1"
            />
            <text x="8" y="12" fill="#94a3b8" fontSize="10">
              {new Date(hovered.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
            </text>
            {series.map((s, i) => {
              const val = (hovered[s.key] as number) ?? 0
              return (
                <text key={s.key} x="8" y={26 + i * 16} fill={s.color} fontSize="10">
                  {s.label}: {fmtForSeries(s, val)}
                </text>
              )
            })}
          </g>
        </>
      )}
    </svg>
  )
}
