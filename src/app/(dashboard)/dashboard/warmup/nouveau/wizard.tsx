'use client'

import { useState, useTransition } from 'react'
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

const STEPS = ['Infos', 'Domaine & Boîtes', 'Audience']

export default function WarmupWizard({ domains, mailboxes, lists, totalCount }: Props) {
  const [step, setStep]             = useState(1)
  const [name, setName]             = useState('')
  const [objective, setObjective]   = useState('')
  const [ctaUrl, setCtaUrl]         = useState('')
  const [domainId, setDomainId]     = useState(domains[0]?.id ?? '')
  const [mailboxIds, setMailboxIds] = useState<string[]>([])
  const [listIds, setListIds]       = useState<string[]>([])
  const [error, setError]           = useState('')
  const [isPending, startTransition] = useTransition()

  const domainMailboxes = mailboxes.filter(m => m.domain_id === domainId)

  function toggleMailbox(id: string) {
    setMailboxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAllMailboxes() {
    const all = domainMailboxes.map(m => m.id)
    setMailboxIds(prev => prev.length === all.length ? [] : all)
  }

  const selectedCount = listIds.length === 0
    ? totalCount
    : lists.filter(l => listIds.includes(l.id)).reduce((s, l) => s + l.count, 0)

  function submit() {
    setError('')
    const fd = new FormData()
    fd.append('name', name)
    fd.append('domain_id', domainId)
    fd.append('cta_objective', objective)
    fd.append('cta_url', ctaUrl)
    fd.append('list_ids', JSON.stringify(listIds))
    fd.append('mailbox_ids', JSON.stringify(mailboxIds))
    startTransition(async () => {
      const result = await createWarmupCampaign(fd)
      if (result?.error) setError(result.error)
    })
  }

  const canNext1 = name.trim().length >= 2
  const canNext2 = domainId && mailboxIds.length > 0
  const selectedDomain = domains.find(d => d.id === domainId)

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

          {/* ── Step 1: Name + objective ─────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Nom de la campagne *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Warmup domaine reach.co"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                  Objectif CTA{' '}
                  <span className="normal-case text-[#475569]">— pour la génération IA</span>
                </label>
                <textarea
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  rows={3}
                  placeholder="Ex: Prospecter des DRH de PME pour notre logiciel RH SaaS. Cible : 30-50 salariés, secteur industrie."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm placeholder-[#3b3b6f] focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
                <p className="text-xs text-[#475569]">L&apos;IA adapte les messages warmup à ta cible et ton positionnement.</p>
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

              <button
                onClick={() => setStep(2)}
                disabled={!canNext1}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
              >
                Continuer →
              </button>
            </>
          )}

          {/* ── Step 2: Domain + mailboxes ───────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Domaine *</label>
                {domains.length === 0 ? (
                  <div className="px-4 py-8 text-center rounded-xl border border-[#1e1e3f] text-sm text-[#475569]">
                    Aucun domaine configuré.{' '}
                    <a href="/dashboard/domaines" className="text-violet-400 hover:text-violet-300">Ajouter →</a>
                  </div>
                ) : (
                  domains.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => { setDomainId(d.id); setMailboxIds([]) }}
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
                  ))
                )}
              </div>

              {domainId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Boîtes mail *</label>
                    {domainMailboxes.length > 1 && (
                      <button onClick={toggleAllMailboxes} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                        {mailboxIds.length === domainMailboxes.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                      </button>
                    )}
                  </div>
                  {domainMailboxes.length === 0 ? (
                    <p className="text-xs text-[#475569] px-1">Aucune boîte sur ce domaine.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {domainMailboxes.map(mb => (
                        <button
                          key={mb.id}
                          type="button"
                          onClick={() => toggleMailbox(mb.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                            mailboxIds.includes(mb.id)
                              ? 'border-violet-500/50 bg-violet-950/20 text-white'
                              : 'border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            mailboxIds.includes(mb.id)
                              ? 'bg-violet-600 border-violet-600'
                              : 'border-[#3b3b6f]'
                          }`}>
                            {mailboxIds.includes(mb.id) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="truncate">{mb.email}</span>
                          {mb.warmup_status && mb.warmup_status !== 'waiting' && (
                            <span className="text-xs text-[#475569] ml-auto shrink-0">J{mb.warmup_status}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-[#475569]">
                    {mailboxIds.length} sélectionnée{mailboxIds.length > 1 ? 's' : ''} · Chaque boîte enverra des variantes légèrement différentes
                  </p>
                </div>
              )}

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
                <div className="flex justify-between">
                  <span className="text-[#475569]">Domaine</span>
                  <span className="text-white">{selectedDomain?.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Boîtes mail</span>
                  <span className="text-white">{mailboxIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Contacts</span>
                  <span className="text-white">{selectedCount.toLocaleString()}</span>
                </div>
                {objective && (
                  <div className="flex justify-between items-start gap-4 pt-1 border-t border-[#1e1e3f] mt-1">
                    <span className="text-[#475569] shrink-0">Génération IA</span>
                    <span className="text-emerald-400 text-xs text-right">3 phases × {Math.min(mailboxIds.length, 3)} variantes</span>
                  </div>
                )}
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
                  {isPending ? 'Génération IA...' : objective ? 'Créer & générer →' : 'Créer →'}
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
            Le cron envoie les emails chaque jour à 5h UTC. Tu peux modifier les messages à tout moment.
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
