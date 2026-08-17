'use client'

import { useState, useTransition } from 'react'
import { updateMailboxThrottle } from '../actions'

const TIMEZONES = [
  'Europe/Paris', 'Europe/London', 'Europe/Berlin', 'Europe/Madrid',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Sao_Paulo',
  'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC',
]

interface Props {
  identityId:          string
  domainId:            string
  throttle_daily_limit: number
  min_interval_seconds: number
  jitter_seconds:       number
  send_window_enabled:  boolean
  send_window_start:    string
  send_window_end:      string
  send_timezone:        string
  skip_weekend:         boolean
  throttle_sent_today:  number
  next_available_at:    string | null
}

function minsToSec(m: number) { return Math.round(m * 60) }
function secToMins(s: number) { return Math.round(s / 60) }
function nextAvailLabel(iso: string | null): string {
  if (!iso) return 'Disponible maintenant'
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  if (diff <= 0) return 'Disponible maintenant'
  if (diff < 60) return `dans ${diff} s`
  return `dans ${Math.round(diff / 60)} min`
}

export default function MailboxThrottleForm({
  identityId, domainId,
  throttle_daily_limit: initLimit,
  min_interval_seconds: initInterval,
  jitter_seconds: initJitter,
  send_window_enabled: initWindowOn,
  send_window_start: initStart,
  send_window_end: initEnd,
  send_timezone: initTz,
  skip_weekend: initSkip,
  throttle_sent_today: sentToday,
  next_available_at: nextAt,
}: Props) {
  const [open, setOpen] = useState(false)
  const [limit,    setLimit]    = useState(initLimit)
  const [interval, setInterval] = useState(secToMins(initInterval))
  const [jitter,   setJitter]   = useState(secToMins(initJitter))
  const [windowOn, setWindowOn] = useState(initWindowOn)
  const [winStart, setWinStart] = useState(initStart.slice(0, 5))
  const [winEnd,   setWinEnd]   = useState(initEnd.slice(0, 5))
  const [tz,       setTz]       = useState(initTz)
  const [skipWe,   setSkipWe]   = useState(initSkip)
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, start]      = useTransition()

  function save() {
    start(async () => {
      const res = await updateMailboxThrottle(identityId, {
        throttle_daily_limit: limit,
        min_interval_seconds: minsToSec(interval),
        jitter_seconds:       minsToSec(jitter),
        send_window_enabled:  windowOn,
        send_window_start:    winStart,
        send_window_end:      winEnd,
        send_timezone:        tz,
        skip_weekend:         skipWe,
      })
      if (res.error) setMsg({ ok: false, text: res.error })
      else           setMsg({ ok: true,  text: 'Réglages sauvegardés.' })
      setTimeout(() => setMsg(null), 3000)
    })
  }

  const effectiveInterval = minsToSec(interval)
  const jitterOk = minsToSec(jitter) <= effectiveInterval

  return (
    <div className="mt-3 ml-5">
      {/* Stats read-only */}
      <div className="flex items-center gap-4 text-xs text-[#475569] mb-2 flex-wrap">
        <span>Envois auj. : <span className="text-[#94a3b8] font-medium">{sentToday} / {initLimit}</span></span>
        <span>Prochaine dispo : <span className="text-[#94a3b8] font-medium">{nextAvailLabel(nextAt)}</span></span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="ml-auto text-xs text-[#3b3b6f] hover:text-violet-400 transition-colors flex items-center gap-1"
        >
          Cadence d&apos;envoi
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Collapsible form */}
      {open && (
        <div className="space-y-4 pt-3 pb-1 border-t border-[#111128]">
          <p className="text-[10px] text-[#3b3b6f] uppercase tracking-wider">
            Réglages cadence — s&apos;appliquent à toutes les séquences utilisant cette boîte
          </p>

          {/* Limit + interval + jitter */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[#475569]">Limite / jour</label>
              <input type="number" min={1} max={500} value={limit}
                onChange={e => setLimit(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#475569]">Intervalle (min)</label>
              <input type="number" min={1} max={1440} value={interval}
                onChange={e => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#475569]">± variation (min)</label>
              <input type="number" min={0} max={interval} value={jitter}
                onChange={e => setJitter(Math.max(0, parseInt(e.target.value) || 0))}
                className={`w-full px-2.5 py-2 rounded-lg bg-[#0a0a18] border text-white text-sm focus:outline-none ${jitterOk ? 'border-[#1e1e3f] focus:border-violet-500/50' : 'border-red-700/60'}`} />
            </div>
          </div>
          <p className="text-[10px] text-[#3b3b6f]">
            Chaque mail part {interval} min après le précédent ± {jitter} min — évite un rythme robotique.
          </p>

          {/* Send window */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#475569]">Fenêtre d&apos;envoi</label>
              <button
                type="button"
                onClick={() => setWindowOn(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${windowOn ? 'bg-violet-600' : 'bg-[#1e1e3f]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${windowOn ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            {windowOn && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="time" value={winStart} onChange={e => setWinStart(e.target.value)}
                    className="px-2.5 py-2 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 w-28" />
                  <span className="text-xs text-[#475569]">→</span>
                  <input type="time" value={winEnd} onChange={e => setWinEnd(e.target.value)}
                    className="px-2.5 py-2 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 w-28" />
                  <select value={tz} onChange={e => setTz(e.target.value)}
                    className="flex-1 px-2.5 py-2 rounded-lg bg-[#0a0a18] border border-[#1e1e3f] text-xs text-[#94a3b8] focus:outline-none focus:border-violet-500/50">
                    {TIMEZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={skipWe} onChange={e => setSkipWe(e.target.checked)}
                    className="rounded border-[#3b3b6f] bg-[#0a0a18] accent-violet-600" />
                  <span className="text-xs text-[#475569]">Ignorer les week-ends</span>
                </label>
              </div>
            )}
          </div>

          {msg && (
            <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={isPending || !jitterOk}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium transition-all"
          >
            {isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      )}
    </div>
  )
}
