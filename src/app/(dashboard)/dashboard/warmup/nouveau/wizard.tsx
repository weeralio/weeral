'use client'

import { useState, useTransition, useMemo } from 'react'
import { createWarmupCampaign } from '../actions'
import { Card, CardContent } from '@/components/ui/card'
import ListPicker, { type ContactList } from '@/components/dashboard/list-picker'

interface Domain   { id: string; domain: string; status: string }
interface Mailbox  { id: string; email: string; display_name: string | null; domain_id: string; warmup_status: string | null }

interface Props {
  domains:    Domain[]
  mailboxes:  Mailbox[]
  lists:      ContactList[]
  totalCount: number
}

const STEPS = ['Infos', 'Boîtes mail', 'Audience']

export default function WarmupWizard({ domains, mailboxes, lists, totalCount }: Props) {
  const [step, setStep]              = useState(1)
  const [mode, setMode]              = useState<'ai' | 'manual'>('ai')
  const [name, setName]              = useState('')
  const [objective, setObjective]    = useState('')
  const [ctaUrl, setCtaUrl]          = useState('')
  const [mailboxIds, setMailboxIds]  = useState<string[]>([])
  const [listIds, setListIds]        = useState<string[]>([])
  const [error, setError]            = useState('')
  const [isPending, startTransition] = useTransition()

  // Group mailboxes by domain for display
  const mailboxesByDomain = useMemo(() => {
    const map = new Map<string, { domain: Domain; mailboxes: Mailbox[] }>()
    for (const d of domains) {
      const dMailboxes = mailboxes.filter(m => m.domain_id === d.id)
      if (dMailboxes.length > 0) map.set(d.id, { domain: d, mailboxes: dMailboxes })
    }
    return map
  }, [domains, mailboxes])

  function toggleMailbox(id: string) {
    setMailboxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleDomain(domainId: string) {
    const dMailboxes = mailboxesByDomain.get(domainId)?.mailboxes ?? []
    const allSelected = dMailboxes.every(m => mailboxIds.includes(m.id))
    if (allSelected) {
      setMailboxIds(prev => prev.filter(id => !dMailboxes.map(m => m.id).includes(id)))
    } else {
      const toAdd = dMailboxes.map(m => m.id).filter(id => !mailboxIds.includes(id))
      setMailboxIds(prev => [...prev, ...toAdd])
    }
  }

  function toggleAll() {
    const all = mailboxes.map(m => m.id)
    setMailboxIds(prev => prev.length === all.length ? [] : all)
  }

  // Summary info for recap
  const selectedMailboxes = mailboxes.filter(m => mailboxIds.includes(m.id))
  const selectedDomainIds = [...new Set(selectedMailboxes.map(m => m.domain_id))]
  const selectedDomainNames = selectedDomainIds
    .map(id => domains.find(d => d.id === id)?.domain)
    .filter(Boolean) as string[]

  const selectedCount = listIds.length === 0
    ? totalCount
    : lists.filter(l => listIds.includes(l.id)).reduce((s, l) => s + l.count, 0)

  function submit() {
    setError('')
    const fd = new FormData()
    fd.append('name', name)
    fd.append('domain_id', '')
    fd.append('cta_objective', mode === 'ai' ? objective : '')
    fd.append('cta_url', mode === 'ai' ? ctaUrl : '')
    fd.append('list_ids', JSON.stringify(listIds))
    fd.append('mailbox_ids', JSON.stringify(mailboxIds))
    startTransition(async () => {
      const result = await createWarmupCampaign(fd)
      if (result?.error) setError(result.error)
    })
  }

  const canNext1 = name.trim().length >= 2
  const canNext2 = mailboxIds.length > 0

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const s = i + 1
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                s < step ? 'bg-violet-600 border-violet-600 text-white' :
                s === step ? 'border-violet-500 text-violet-300' :
                'border-[#1e1e3f] text-[#3b3b6f]'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-8 transition-all ${s < step ? 'bg-violet-600' : 'bg-[#1e1e3f]'}`} />}
            </div>
          )
        })}
        <span className="text-xs text-[#475569] ml-2">{STEPS[step - 1]}</span>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">

          {/* ── Step 1: Name + mode ──────────────────────────────────────── */}
          {step === 1 && (
            <>
              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#07070f] border border-[#1e1e3f]">
                {([['ai', '✦ Générer avec l\'IA', 'L\'IA écrit les messages pour les 3 phases'], ['manual', '✏ Écrire manuellement', 'Tu écriras les messages après création']] as const).map(([m, label, desc]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      mode === m
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-[#475569] hover:text-[#94a3b8]'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] font-normal ${mode === m ? 'text-violet-200' : 'text-[#3b3b6f]'}`}>{desc}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Nom de la campagne *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Warmup multi-domaines Q3"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {mode === 'ai' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                      Objectif CTA{' '}
                      <span className="normal-case text-[#475569]">— décris ta cible et ton offre</span>
                    </label>
                    <textarea
                      value={objective}
                      onChange={e => setObjective(e.target.value)}
                      rows={3}
                      placeholder="Ex: Prospecter des DRH de PME pour notre logiciel RH SaaS. Cible : 30-50 salariés, secteur industrie."
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                    />
                    <p className="text-xs text-[#475569]">L&apos;IA génère les messages pour J4–J8, J9 et J10–J14 automatiquement.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                      Lien CTA{' '}
                      <span className="normal-case text-[#475569]">— utilisé à partir du J9</span>
                    </label>
                    <input
                      value={ctaUrl}
                      onChange={e => setCtaUrl(e.target.value)}
                      placeholder="https://example.com/demo"
                      type="url"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                </>
              )}

              {mode === 'manual' && (
                <div className="px-4 py-3 rounded-xl border border-[#1e1e3f] bg-[#07070f] flex items-start gap-3">
                  <svg className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <p className="text-xs text-[#475569]">
                    La campagne sera créée sans messages. Tu pourras écrire les contenus pour chaque phase (J4–J8, J9, J10–J14) directement depuis la page de la campagne.
                  </p>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!canNext1}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
              >
                Continuer →
              </button>
            </>
          )}

          {/* ── Step 2: Mailboxes grouped by domain ──────────────────────── */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                  Boîtes mail *{' '}
                  <span className="normal-case text-[#475569]">— plusieurs domaines possibles</span>
                </label>
                {mailboxes.length > 1 && (
                  <button onClick={toggleAll} className="text-xs text-violet-400 hover:text-violet-300 transition-colors shrink-0">
                    {mailboxIds.length === mailboxes.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                )}
              </div>

              {mailboxesByDomain.size === 0 ? (
                <div className="px-4 py-8 text-center rounded-xl border border-[#1e1e3f] text-sm text-[#475569]">
                  Aucune boîte mail configurée.{' '}
                  <a href="/dashboard/domaines" className="text-violet-400 hover:text-violet-300">Ajouter →</a>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {[...mailboxesByDomain.values()].map(({ domain, mailboxes: dMailboxes }) => {
                    const domainSelected = dMailboxes.every(m => mailboxIds.includes(m.id))
                    const domainPartial  = dMailboxes.some(m => mailboxIds.includes(m.id)) && !domainSelected
                    const selectedInDomain = dMailboxes.filter(m => mailboxIds.includes(m.id)).length

                    return (
                      <div key={domain.id} className="rounded-xl border border-[#1e1e3f] overflow-hidden">
                        {/* Domain header */}
                        <button
                          type="button"
                          onClick={() => toggleDomain(domain.id)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0a0a18] hover:bg-[#0d0d1c] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                              domainSelected ? 'bg-violet-600 border-violet-600' :
                              domainPartial  ? 'bg-violet-600/40 border-violet-500/50' :
                              'border-[#3b3b6f]'
                            }`}>
                              {(domainSelected || domainPartial) && (
                                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d={domainPartial ? 'M5 12h14' : 'M5 13l4 4L19 7'} />
                                </svg>
                              )}
                            </div>
                            <div className={`w-1.5 h-1.5 rounded-full ${domain.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span className="text-sm font-medium text-white">{domain.domain}</span>
                          </div>
                          <span className="text-xs text-[#475569]">
                            {selectedInDomain}/{dMailboxes.length} boîte{dMailboxes.length > 1 ? 's' : ''}
                          </span>
                        </button>

                        {/* Mailbox list */}
                        <div className="divide-y divide-[#1e1e3f]">
                          {dMailboxes.map(mb => (
                            <button
                              key={mb.id}
                              type="button"
                              onClick={() => toggleMailbox(mb.id)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                                mailboxIds.includes(mb.id)
                                  ? 'bg-violet-950/15 text-white'
                                  : 'text-[#94a3b8] hover:bg-[#0d0d1c]'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                                mailboxIds.includes(mb.id)
                                  ? 'bg-violet-600 border-violet-600'
                                  : 'border-[#3b3b6f]'
                              }`}>
                                {mailboxIds.includes(mb.id) && (
                                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="truncate">{mb.email}</span>
                              {mb.warmup_status && mb.warmup_status !== 'waiting' && (
                                <span className="text-xs text-[#475569] ml-auto shrink-0">{mb.warmup_status}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="text-xs text-[#475569]">
                {mailboxIds.length} boîte{mailboxIds.length > 1 ? 's' : ''} sélectionnée{mailboxIds.length > 1 ? 's' : ''}
                {selectedDomainNames.length > 1 && (
                  <span className="text-violet-400"> · {selectedDomainNames.length} domaines · contacts cloisonnés automatiquement</span>
                )}
              </p>

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:border-[#3b3b6f] transition-all">
                  ← Retour
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canNext2}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                >
                  Continuer →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Audience + submit ─────────────────────────────────── */}
          {step === 3 && (
            <>
              <div className="space-y-3">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Audience</label>
                <ListPicker lists={lists} totalCount={totalCount} value={listIds} onChange={setListIds} />
              </div>

              {/* Recap */}
              <div className="px-4 py-3 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] space-y-1.5 text-sm">
                <p className="text-[#475569] text-xs font-medium uppercase tracking-wider mb-2">Récapitulatif</p>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Campagne</span>
                  <span className="text-white font-medium">{name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#475569] shrink-0">Domaines</span>
                  <span className="text-white text-right text-xs">{selectedDomainNames.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Boîtes mail</span>
                  <span className="text-white">{mailboxIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Contacts</span>
                  <span className="text-white">{selectedCount.toLocaleString()}</span>
                </div>
                {selectedDomainNames.length > 1 && (
                  <div className="flex items-start gap-3 pt-1 border-t border-[#1e1e3f] mt-1">
                    <svg className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-emerald-400 text-xs">Cloisonnement automatique — aucun contact ne recevra 2 emails du même domaine</span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-4 pt-1 border-t border-[#1e1e3f] mt-1">
                  <span className="text-[#475569] shrink-0">Messages</span>
                  {mode === 'ai'
                    ? <span className="text-emerald-400 text-xs text-right">✦ IA · 3 phases × {Math.min(mailboxIds.length, 3)} variantes</span>
                    : <span className="text-violet-400 text-xs text-right">✏ Manuel · à remplir après création</span>
                  }
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl border border-[#1e1e3f] text-[#94a3b8] text-sm hover:border-[#3b3b6f] transition-all">
                  ← Retour
                </button>
                <button
                  onClick={submit}
                  disabled={isPending || selectedCount === 0}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium transition-all"
                >
                  {isPending
                    ? (mode === 'ai' ? 'Génération IA...' : 'Création...')
                    : (mode === 'ai' ? 'Créer & générer →' : 'Créer →')
                  }
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isPending && (
        <div className="px-4 py-3 rounded-xl border border-[#1e1e3f] bg-[#07070f]">
          <p className="text-xs text-[#475569]">
            <span className="text-[#94a3b8] font-medium">Après création :</span>{' '}
            Le cron envoie les emails chaque jour à 17h (Paris). Tu peux modifier les messages à tout moment.
          </p>
        </div>
      )}

      {isPending && (
        <div className="px-4 py-3 rounded-xl border border-violet-500/30 bg-violet-950/20">
          <p className="text-xs text-violet-300 text-center">
            L&apos;IA génère les messages pour les 3 phases warmup...
          </p>
        </div>
      )}
    </div>
  )
}
