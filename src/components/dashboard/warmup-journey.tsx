'use client'

import { useState } from 'react'

// ─── Static phase definitions ──────────────────────────────────────────────────

const PHASES = [
  {
    id: 1,
    name: 'Silence',
    emoji: '🌙',
    days: 'J1–J3',
    dayRange: [1, 3] as [number, number],
    volume: '0 email',
    text: 'text-slate-400',
    bg: 'bg-slate-800/50',
    border: 'border-slate-600/50',
    bar: 'bg-slate-600',
    what: 'Le domaine vient d\'être acquis. Les serveurs de messagerie ont besoin de 3 jours pour l\'enregistrer sans le considérer comme suspect.',
    rule: 'Envoyer dès J1 = blacklist immédiate. C\'est l\'erreur n°1 de tous les concurrents.',
    tip: 'Cette pause est obligatoire et non négociable. Le warmup démarre automatiquement à J4.',
  },
  {
    id: 2,
    name: 'Échauffement',
    emoji: '💬',
    days: 'J4–J8',
    dayRange: [4, 8] as [number, number],
    volume: '5 → 19 / boîte',
    text: 'text-blue-400',
    bg: 'bg-blue-950/50',
    border: 'border-blue-600/50',
    bar: 'bg-blue-500',
    what: 'Emails courts et conversationnels, sans lien, sans mot trigger spam. 50% des destinataires sont tes boîtes de contrôle — elles répondent automatiquement.',
    rule: 'L\'IA varie les contenus à chaque envoi. Une répétition exacte = signal négatif pour les FAI.',
    tip: 'Ne lance pas de campagnes réelles pendant cette phase. Laisse le moteur travailler.',
  },
  {
    id: 3,
    name: 'Activation',
    emoji: '🔗',
    days: 'J9',
    dayRange: [9, 9] as [number, number],
    volume: '22 / boîte',
    text: 'text-violet-400',
    bg: 'bg-violet-950/50',
    border: 'border-violet-600/50',
    bar: 'bg-violet-500',
    what: 'Premier lien introduit — non commercial (article de blog, ressource neutre). Les FAI vérifient pour la première fois si tes liens sont fiables.',
    rule: 'Jamais de lien commercial pour le premier essai. Un lien éditorial neutre seulement.',
    tip: 'Un seul jour, mais critique. Le taux de clic sur ce lien influence fortement la réputation.',
  },
  {
    id: 4,
    name: 'Test A/B',
    emoji: '🎯',
    days: 'J10–J11',
    dayRange: [10, 11] as [number, number],
    volume: '30 → 50 / boîte',
    text: 'text-amber-400',
    bg: 'bg-amber-950/50',
    border: 'border-amber-600/50',
    bar: 'bg-amber-500',
    what: 'Ton vrai contenu de campagne entre en jeu. Deux variantes (A et B) sont testées en parallèle pour identifier laquelle génère le meilleur engagement.',
    rule: 'La variante gagnante est sélectionnée automatiquement pour tous les envois suivants.',
    tip: 'C\'est ici que tu peux commencer à surveiller les taux d\'ouverture et de clic de près.',
  },
  {
    id: 5,
    name: 'Décollage',
    emoji: '🚀',
    days: 'J12+',
    dayRange: [12, 9999] as [number, number],
    volume: '+10 % / j · max 5 000',
    text: 'text-emerald-400',
    bg: 'bg-emerald-950/50',
    border: 'border-emerald-600/50',
    bar: 'bg-emerald-500',
    what: 'Croissance automatique de +10 % par jour. Le moteur surveille les métriques en continu et ralentit si un signal anormal est détecté.',
    rule: 'Plafond absolu de 5 000 emails/boîte/jour. La régularité prime toujours sur la vitesse.',
    tip: 'Maintiens bounce < 2 % et plainte < 0.05 % pour conserver une progression optimale.',
  },
]

const CHART_DAYS = [
  { day: 1,  vol: 0,  phaseId: 1 },
  { day: 2,  vol: 0,  phaseId: 1 },
  { day: 3,  vol: 0,  phaseId: 1 },
  { day: 4,  vol: 5,  phaseId: 2 },
  { day: 5,  vol: 10, phaseId: 2 },
  { day: 6,  vol: 13, phaseId: 2 },
  { day: 7,  vol: 16, phaseId: 2 },
  { day: 8,  vol: 19, phaseId: 2 },
  { day: 9,  vol: 22, phaseId: 3 },
  { day: 10, vol: 30, phaseId: 4 },
  { day: 11, vol: 50, phaseId: 4 },
  { day: 12, vol: 55, phaseId: 5 },
  { day: 13, vol: 60, phaseId: 5 },
  { day: 14, vol: 66, phaseId: 5 },
]

const MAX_VOL = 66

// ─── Info tooltip (ⓘ) ─────────────────────────────────────────────────────────

function Info({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-4 h-4 rounded-full bg-[#1e1e3f] text-[#475569] hover:text-[#94a3b8] hover:bg-[#2d2d4f] flex items-center justify-center text-[9px] font-bold transition-colors"
        aria-label="Plus d'info"
      >
        i
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 w-56 bg-[#1e1e3f] border border-[#3b3b6f] rounded-xl p-3 shadow-xl">
            <p className="text-xs text-[#94a3b8] leading-relaxed">{text}</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1e1e3f] border-r border-b border-[#3b3b6f] rotate-45 -mt-1" />
          </div>
        </>
      )}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WarmupJourneyProps {
  currentDay: number
  replyBoxCount: number
}

export default function WarmupJourney({ currentDay, replyBoxCount }: WarmupJourneyProps) {
  const activePhase = PHASES.find(p => currentDay >= p.dayRange[0] && currentDay <= p.dayRange[1]) ?? PHASES[0]
  const [selectedId, setSelectedId] = useState(activePhase.id)
  const selected = PHASES.find(p => p.id === selectedId) ?? activePhase

  return (
    <div className="space-y-5">

      {/* ── Phase tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {PHASES.map(phase => {
          const isCurrent = phase.id === activePhase.id
          const isDone    = currentDay > phase.dayRange[1]
          const isSelected = phase.id === selectedId

          return (
            <button
              key={phase.id}
              onClick={() => setSelectedId(phase.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 border transition-all ${
                isSelected
                  ? `${phase.bg} ${phase.border} border ${phase.text}`
                  : isDone
                  ? 'bg-[#0d0d1c] border-[#1e1e3f] text-[#2d3748] hover:border-[#2d2d4f]'
                  : 'bg-[#07070f] border-[#111128] text-[#1e2a3a] hover:border-[#1e1e3f]'
              }`}
            >
              <span>{phase.emoji}</span>
              <span>{phase.name}</span>
              {/* Status indicator */}
              {isDone && !isSelected && (
                <svg className="w-3 h-3 text-[#2d3748]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isCurrent && (
                <span className={`w-1.5 h-1.5 rounded-full ${phase.bar} animate-pulse`} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Selected phase detail ────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 transition-all ${selected.bg} ${selected.border}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selected.emoji}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-white">{selected.name}</span>
                {selected.id === activePhase.id && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${selected.bg} ${selected.border} ${selected.text}`}>
                    EN COURS
                  </span>
                )}
                {currentDay > selected.dayRange[1] && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0d0d1c] border border-[#1e1e3f] text-[#475569]">
                    TERMINÉE
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${selected.text}`}>{selected.days} · {selected.volume}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-[#94a3b8] leading-relaxed">{selected.what}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-start gap-2 bg-[#07070f]/60 rounded-xl px-3 py-2.5">
              <span className="text-xs shrink-0 mt-0.5">📌</span>
              <p className="text-xs text-[#94a3b8] leading-relaxed">{selected.rule}</p>
            </div>
            <div className="flex items-start gap-2 bg-[#07070f]/60 rounded-xl px-3 py-2.5">
              <span className="text-xs shrink-0 mt-0.5">💡</span>
              <p className="text-xs text-[#94a3b8] leading-relaxed">{selected.tip}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bar chart ────────────────────────────────────────────────────────── */}
      <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-[#94a3b8]">Volume / boîte / jour</p>
          <div className="flex items-center gap-1.5 text-[10px] text-[#475569]">
            <span>J12+ → +10 %/j → max 5 000</span>
            <Info text="À partir du jour 12, le volume augmente de 10% par jour automatiquement jusqu'au plafond de 5 000 emails par boîte par jour." />
          </div>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-0.5 h-16 mb-1">
          {CHART_DAYS.map(({ day, vol, phaseId }) => {
            const phase = PHASES.find(p => p.id === phaseId)!
            const pct   = vol > 0 ? Math.max((vol / MAX_VOL) * 100, 10) : 0
            const isCurrent = day === currentDay
            const isDone    = day < currentDay

            return (
              <div
                key={day}
                className="flex-1 flex flex-col justify-end items-center group relative"
                style={{ height: '100%' }}
              >
                {/* Hover tooltip */}
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block pointer-events-none">
                  <div className="bg-[#1e1e3f] border border-[#3b3b6f] rounded-lg px-2 py-1.5 text-center whitespace-nowrap shadow-xl">
                    <p className="text-[10px] font-bold text-white">Jour {day}</p>
                    <p className={`text-[10px] ${phase.text}`}>{vol > 0 ? `${vol} emails` : 'Repos'}</p>
                  </div>
                </div>

                {/* Bar */}
                {vol > 0 ? (
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      isCurrent ? `${phase.bar} ring-1 ring-white/30` : isDone ? 'bg-[#1e1e3f]' : `${phase.bar} opacity-20`
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                ) : (
                  <div className="w-full h-1 rounded-sm bg-[#111128]" />
                )}
              </div>
            )
          })}
        </div>

        {/* Day numbers */}
        <div className="flex gap-0.5 mb-2">
          {CHART_DAYS.map(({ day }) => (
            <div key={day} className="flex-1 text-center">
              <span className={`text-[9px] tabular-nums ${day === currentDay ? 'text-white font-bold' : 'text-[#2d3748]'}`}>
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Phase color strip */}
        <div className="flex gap-0.5 h-1 rounded-full overflow-hidden mb-2">
          {CHART_DAYS.map(({ day, phaseId }) => {
            const phase = PHASES.find(p => p.id === phaseId)!
            const isDone    = day < currentDay
            const isCurrent = day === currentDay
            return (
              <div
                key={day}
                className={`flex-1 ${isDone || isCurrent ? phase.bar : 'bg-[#111128]'}`}
              />
            )
          })}
        </div>

        {/* Phase name labels under strip */}
        <div className="flex gap-0.5">
          {/* Group consecutive same-phase days */}
          {[
            { phase: PHASES[0]!, count: 3 },
            { phase: PHASES[1]!, count: 5 },
            { phase: PHASES[2]!, count: 1 },
            { phase: PHASES[3]!, count: 2 },
            { phase: PHASES[4]!, count: 3 },
          ].map(({ phase, count }) => (
            <div key={phase.id} className="text-center overflow-hidden" style={{ flex: count }}>
              <button
                onClick={() => setSelectedId(phase.id)}
                className={`text-[9px] truncate block w-full transition-colors hover:opacity-100 ${
                  phase.id === selectedId ? phase.text : 'text-[#2d3748]'
                }`}
              >
                {phase.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Controlled boxes status (only relevant during J4–J11) ───────────── */}
      {currentDay >= 4 && currentDay <= 11 && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          replyBoxCount > 0
            ? 'bg-emerald-950/20 border-emerald-900/30'
            : 'bg-amber-950/20 border-amber-800/30'
        }`}>
          <span className="text-base shrink-0">{replyBoxCount > 0 ? '✅' : '⚠️'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={`text-sm font-medium ${replyBoxCount > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {replyBoxCount > 0
                  ? `${replyBoxCount} boîte${replyBoxCount > 1 ? 's' : ''} de contrôle active${replyBoxCount > 1 ? 's' : ''}`
                  : 'Boîtes de contrôle manquantes'}
              </p>
              <Info text="Pendant J4–J11, 50% des destinataires doivent être tes propres boîtes email (Gmail, Outlook…). Elles ouvrent, répondent et déplacent hors spam automatiquement pour simuler un vrai engagement." />
            </div>
            <p className="text-xs text-[#475569] mt-0.5 truncate">
              {replyBoxCount > 0
                ? '50% des envois vont vers tes boîtes — elles répondent et ouvrent automatiquement.'
                : 'Ajoute au moins 1 boîte dans Paramètres pour maximiser la délivrabilité.'}
            </p>
          </div>
          {replyBoxCount === 0 && (
            <a href="/dashboard/parametres" className="text-xs text-[#8b5cf6] hover:text-[#a78bfa] shrink-0 underline underline-offset-2 whitespace-nowrap">
              Configurer →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
