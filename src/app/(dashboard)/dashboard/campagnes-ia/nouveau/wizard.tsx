'use client'

import { useState, useTransition } from 'react'
import { createIACampaign } from '../actions'
import { Card, CardContent } from '@/components/ui/card'

interface Domain { id: string; domain: string; status: string }
interface Contact { id: string; email: string; first_name: string | null; last_name: string | null }

interface Props {
  domains: Domain[]
  contacts: Contact[]
}

export default function NewCampaignWizard({ domains, contacts }: Props) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [domainId, setDomainId] = useState(domains[0]?.id ?? '')
  const [useAll, setUseAll] = useState(true)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError('')
    const fd = new FormData()
    fd.append('name', name)
    fd.append('goal', goal)
    fd.append('domain_id', domainId)
    fd.append('contact_ids', JSON.stringify(useAll ? contacts.map(c => c.id) : []))
    startTransition(async () => {
      const result = await createIACampaign(fd)
      if (result?.error) setError(result.error)
    })
  }

  const canNext1 = name.trim().length >= 2 && domainId
  const selectedDomain = domains.find(d => d.id === domainId)

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
              s < step ? 'bg-violet-600 border-violet-600 text-white' :
              s === step ? 'border-violet-500 text-violet-300' :
              'border-[#1e1e3f] text-[#3b3b6f]'
            }`}>
              {s < step ? '✓' : s}
            </div>
            {s < 3 && <div className={`h-px w-8 transition-all ${s < step ? 'bg-violet-600' : 'bg-[#1e1e3f]'}`} />}
          </div>
        ))}
        <span className="text-xs text-[#475569] ml-2">
          {step === 1 ? 'Infos campagne' : step === 2 ? 'Domaine' : 'Contacts'}
        </span>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">

          {/* ── Step 1: Name + goal ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Nom de la campagne *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Prospection DRH PME Paris"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Objectif <span className="normal-case text-[#475569]">(optionnel)</span></label>
                <input
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="Ex: Prospecter des DRH de PME pour notre logiciel RH"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
                />
                <p className="text-xs text-[#475569]">Aide l&apos;IA à personnaliser les conseils de contenu.</p>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!canNext1}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
              >
                Continuer →
              </button>
            </>
          )}

          {/* ── Step 2: Domain ──────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Domaine d&apos;envoi *</label>
                {domains.length === 0 ? (
                  <div className="px-4 py-8 text-center rounded-xl border border-[#1e1e3f] text-sm text-[#475569]">
                    Aucun domaine configuré. <a href="/dashboard/domaines" className="text-violet-400 hover:text-violet-300">Ajouter un domaine →</a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {domains.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDomainId(d.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                          domainId === d.id
                            ? 'border-violet-500/50 bg-violet-950/20 text-white'
                            : 'border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${d.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <span className="font-medium">{d.domain}</span>
                        </div>
                        <span className={`text-xs ${d.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {d.status === 'active' ? 'Actif' : 'Warmup'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:border-[#3b3b6f] transition-all">
                  ← Retour
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!domainId}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                >
                  Continuer →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Contacts ────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <div className="space-y-3">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Contacts à inclure</label>
                <button
                  type="button"
                  onClick={() => setUseAll(true)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                    useAll ? 'border-violet-500/50 bg-violet-950/20 text-white' : 'border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f]'
                  }`}
                >
                  <div>
                    <p className="font-medium text-left">Tous mes contacts actifs</p>
                    <p className="text-xs text-[#475569] text-left mt-0.5">{contacts.length.toLocaleString()} contact{contacts.length !== 1 ? 's' : ''} non désabonnés</p>
                  </div>
                  {useAll && <span className="text-violet-400 text-xs">✓ Sélectionné</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setUseAll(false)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                    !useAll ? 'border-violet-500/50 bg-violet-950/20 text-white' : 'border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f]'
                  }`}
                >
                  <div>
                    <p className="font-medium text-left">Aucun contact pour l&apos;instant</p>
                    <p className="text-xs text-[#475569] text-left mt-0.5">Tu pourras en ajouter depuis la campagne</p>
                  </div>
                  {!useAll && <span className="text-violet-400 text-xs">✓ Sélectionné</span>}
                </button>
              </div>

              {/* Summary */}
              <div className="px-4 py-3 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] space-y-1 text-sm">
                <p className="text-[#475569] text-xs font-medium uppercase tracking-wider mb-2">Récapitulatif</p>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Campagne</span>
                  <span className="text-white font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Domaine</span>
                  <span className="text-white">{selectedDomain?.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Contacts</span>
                  <span className="text-white">{useAll ? `${contacts.length.toLocaleString()} contacts` : 'Aucun pour l\'instant'}</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:border-[#3b3b6f] transition-all">
                  ← Retour
                </button>
                <button
                  onClick={submit}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium transition-all"
                >
                  {isPending ? 'Création...' : 'Lancer la campagne →'}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info strip */}
      <div className="px-4 py-3 rounded-xl border border-[#1e1e3f] bg-[#07070f]">
        <p className="text-xs text-[#475569]">
          <span className="text-[#94a3b8] font-medium">Comment ça marche :</span>{' '}
          J1–J3 repos · J4 premiers envois · L&apos;IA te demandera le contenu avant chaque phase · Envois automatiques dès validation
        </p>
      </div>
    </div>
  )
}
