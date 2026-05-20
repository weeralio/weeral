'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { signupWithProfile } from '@/lib/auth/actions'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Fields {
  firstName: string; lastName: string
  email: string; password: string; confirmPassword: string
  phone: string
  addressLine: string; city: string; postalCode: string; country: string
  company: string; industry: string; teamSize: string
  goals: string[]; referralSource: string
}

const INIT: Fields = {
  firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  phone: '',
  addressLine: '', city: '', postalCode: '', country: 'France',
  company: '', industry: '', teamSize: '',
  goals: [], referralSource: '',
}

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, title: 'Votre identité',     sub: 'Comment vous appelle-t-on ?' },
  { n: 2, title: 'Vos identifiants',   sub: 'Email et mot de passe de connexion' },
  { n: 3, title: 'Téléphone',          sub: 'Pour vous contacter si besoin' },
  { n: 4, title: 'Adresse',            sub: 'Votre adresse de facturation' },
  { n: 5, title: 'Votre activité',     sub: 'Parlez-nous de votre business' },
  { n: 6, title: 'Objectifs & source', sub: 'Dernière étape — promis !' },
]

const INDUSTRIES = [
  'SaaS / Tech', 'Agence marketing', 'Agence de recrutement', 'Consulting / Freelance',
  'E-commerce', 'Finance / Fintech', 'Immobilier', 'Santé', 'Formation / Éducation',
  'Médias / Communication', 'Autre',
]
const TEAM_SIZES = ['Solo', '2–5', '6–15', '16–50', '50+']
const GOALS_OPTIONS = [
  { id: 'cold-email', label: 'Envoyer des campagnes cold email' },
  { id: 'warmup',     label: 'Faire du warmup de domaines' },
  { id: 'sequences',  label: 'Gérer des séquences automatiques' },
  { id: 'ia',         label: 'Utiliser l\'IA pour mes emails' },
  { id: 'agency',     label: 'Gérer des clients (agence)' },
]
const REFERRAL_OPTIONS = [
  'Google / Recherche', 'LinkedIn', 'Bouche-à-oreille', 'Réseaux sociaux',
  'Newsletter / Blog', 'YouTube', 'Podcast', 'Autre',
]

// ─── Validation ──────────────────────────────────────────────────────────────

function validate(step: number, f: Fields): string | null {
  if (step === 1) {
    if (!f.firstName.trim()) return 'Le prénom est requis.'
    if (!f.lastName.trim())  return 'Le nom est requis.'
  }
  if (step === 2) {
    if (!f.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Email invalide.'
    if (f.password.length < 8)          return 'Mot de passe : 8 caractères minimum.'
    if (f.password !== f.confirmPassword) return 'Les mots de passe ne correspondent pas.'
  }
  if (step === 3 && !f.phone.trim())       return 'Le numéro est requis.'
  if (step === 4) {
    if (!f.addressLine.trim()) return 'L\'adresse est requise.'
    if (!f.city.trim())        return 'La ville est requise.'
    if (!f.postalCode.trim())  return 'Le code postal est requis.'
  }
  if (step === 5) {
    if (!f.company.trim()) return 'Le nom de l\'entreprise est requis.'
    if (!f.industry)       return 'Choisissez un secteur.'
    if (!f.teamSize)       return 'Choisissez la taille de l\'équipe.'
  }
  if (step === 6) {
    if (!f.goals.length)   return 'Sélectionnez au moins un objectif.'
    if (!f.referralSource) return 'Dites-nous comment vous nous avez trouvé.'
  }
  return null
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const inp = 'w-full bg-[#07070f] border border-[#1e1e3f] text-white rounded-xl px-4 py-3 text-sm placeholder-[#475569] focus:outline-none focus:border-[#8b5cf6]/60 focus:ring-1 focus:ring-[#8b5cf6]/30 transition-all'
const sel = `${inp} appearance-none`

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [step,    setStep]    = useState(1)
  const [fields,  setFields]  = useState<Fields>(INIT)
  const [err,     setErr]     = useState<string | null>(null)
  const [dir,     setDir]     = useState<1 | -1>(1)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = useCallback(<K extends keyof Fields>(k: K, v: Fields[K]) =>
    setFields(f => ({ ...f, [k]: v })), [])

  const toggleGoal = (id: string) =>
    setFields(f => ({
      ...f,
      goals: f.goals.includes(id) ? f.goals.filter(g => g !== id) : [...f.goals, id],
    }))

  const next = () => {
    const e = validate(step, fields)
    if (e) { setErr(e); return }
    setErr(null); setDir(1); setStep(s => s + 1)
  }

  const back = () => { setErr(null); setDir(-1); setStep(s => s - 1) }

  const submit = async () => {
    const e = validate(6, fields)
    if (e) { setErr(e); return }
    setErr(null)
    setPending(true)

    try {
      const fd = new FormData()
      const entries: Array<[string, string]> = [
        ['firstName',      fields.firstName],
        ['lastName',       fields.lastName],
        ['email',          fields.email],
        ['password',       fields.password],
        ['phone',          fields.phone],
        ['addressLine',    fields.addressLine],
        ['city',           fields.city],
        ['postalCode',     fields.postalCode],
        ['country',        fields.country],
        ['company',        fields.company],
        ['industry',       fields.industry],
        ['teamSize',       fields.teamSize],
        ['referralSource', fields.referralSource],
      ]
      for (const [k, v] of entries) fd.append(k, v)
      for (const g of fields.goals)  fd.append('goals', g)

      const result = await signupWithProfile(null, fd)

      if (result && 'error' in result) {
        setErr(result.error)
      } else {
        setSuccess(true)
      }
    } catch (e) {
      setErr('Erreur réseau. Réessaie.')
    } finally {
      setPending(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-10 text-center shadow-[0_0_60px_rgba(139,92,246,0.1)]">
          <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Compte créé !</h2>
          <p className="text-sm text-[#94a3b8] mb-2">
            Bonjour {fields.firstName} ! Vérifie ton email pour confirmer ton compte.
          </p>
          <p className="text-xs text-[#475569] mb-6">Email envoyé à <span className="text-white">{fields.email}</span></p>
          <Link href="/login" className="text-sm text-[#8b5cf6] hover:text-[#a78bfa] transition-colors font-medium">
            Aller à la connexion →
          </Link>
        </div>
      </div>
    )
  }

  const current = STEPS[step - 1]

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl shadow-[0_0_60px_rgba(139,92,246,0.08)] overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-[#1e1e3f]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7]"
            animate={{ width: `${(step / 6) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-1">
                Étape {step} sur 6
              </p>
              <h1 className="text-xl font-bold text-white">{current.title}</h1>
              <p className="text-sm text-[#475569] mt-0.5">{current.sub}</p>
            </div>
            {/* Dots */}
            <div className="flex gap-1.5 pt-1 shrink-0">
              {STEPS.map(s => (
                <div key={s.n} className={`rounded-full transition-all duration-300 ${
                  s.n < step  ? 'w-2 h-2 bg-[#8b5cf6]' :
                  s.n === step ? 'w-4 h-2 bg-[#8b5cf6]' :
                                 'w-2 h-2 bg-[#1e1e3f]'
                }`} />
              ))}
            </div>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 28 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >

              {/* 1 – Identité */}
              {step === 1 && (
                <div className="space-y-4">
                  <Field label="Prénom">
                    <input className={inp} type="text" placeholder="Jean" autoFocus
                      value={fields.firstName} onChange={e => set('firstName', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && next()} />
                  </Field>
                  <Field label="Nom">
                    <input className={inp} type="text" placeholder="Dupont"
                      value={fields.lastName} onChange={e => set('lastName', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && next()} />
                  </Field>
                </div>
              )}

              {/* 2 – Compte */}
              {step === 2 && (
                <div className="space-y-4">
                  <Field label="Email">
                    <input className={inp} type="email" placeholder="jean@entreprise.com" autoFocus
                      value={fields.email} onChange={e => set('email', e.target.value)} />
                  </Field>
                  <Field label="Mot de passe">
                    <input className={inp} type="password" placeholder="8 caractères minimum"
                      value={fields.password} onChange={e => set('password', e.target.value)} />
                  </Field>
                  <Field label="Confirmer le mot de passe">
                    <input className={inp} type="password" placeholder="Même mot de passe"
                      value={fields.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && next()} />
                  </Field>
                </div>
              )}

              {/* 3 – Téléphone */}
              {step === 3 && (
                <div className="space-y-4">
                  <Field label="Numéro de téléphone">
                    <div className="flex gap-2">
                      <span className="flex items-center gap-2 bg-[#07070f] border border-[#1e1e3f] rounded-xl px-3 shrink-0 text-sm text-[#94a3b8] select-none">
                        🇫🇷 +33
                      </span>
                      <input className={`${inp} flex-1`} type="tel" placeholder="6 12 34 56 78" autoFocus
                        value={fields.phone} onChange={e => set('phone', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && next()} />
                    </div>
                    <p className="text-xs text-[#475569] mt-2">Utilisé uniquement pour le support client.</p>
                  </Field>
                </div>
              )}

              {/* 4 – Adresse */}
              {step === 4 && (
                <div className="space-y-4">
                  <Field label="Adresse">
                    <input className={inp} type="text" placeholder="12 rue de la Paix" autoFocus
                      value={fields.addressLine} onChange={e => set('addressLine', e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ville">
                      <input className={inp} type="text" placeholder="Paris"
                        value={fields.city} onChange={e => set('city', e.target.value)} />
                    </Field>
                    <Field label="Code postal">
                      <input className={inp} type="text" placeholder="75001"
                        value={fields.postalCode} onChange={e => set('postalCode', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Pays">
                    <select className={sel} value={fields.country} onChange={e => set('country', e.target.value)}>
                      {['France','Belgique','Suisse','Canada','Luxembourg','Maroc','Tunisie','Autre'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {/* 5 – Activité */}
              {step === 5 && (
                <div className="space-y-4">
                  <Field label="Nom de l'entreprise">
                    <input className={inp} type="text" placeholder="Acme Corp" autoFocus
                      value={fields.company} onChange={e => set('company', e.target.value)} />
                  </Field>
                  <Field label="Secteur d'activité">
                    <select className={sel} value={fields.industry} onChange={e => set('industry', e.target.value)}>
                      <option value="" disabled>Choisir un secteur…</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </Field>
                  <Field label="Taille de l'équipe">
                    <div className="flex gap-2 flex-wrap">
                      {TEAM_SIZES.map(s => (
                        <button key={s} type="button" onClick={() => set('teamSize', s)}
                          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                            fields.teamSize === s
                              ? 'bg-[#8b5cf6]/15 border-[#8b5cf6]/50 text-[#a78bfa]'
                              : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f] hover:text-[#94a3b8]'
                          }`}>{s}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {/* 6 – Objectifs */}
              {step === 6 && (
                <div className="space-y-5">
                  <Field label="Qu'est-ce que vous souhaitez faire ?" hint="Plusieurs choix possibles">
                    <div className="space-y-2">
                      {GOALS_OPTIONS.map(g => (
                        <button key={g.id} type="button" onClick={() => toggleGoal(g.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                            fields.goals.includes(g.id)
                              ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/40 text-white'
                              : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f] hover:text-[#94a3b8]'
                          }`}>
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            fields.goals.includes(g.id) ? 'bg-[#8b5cf6] border-[#8b5cf6]' : 'border-[#3b3b6f]'
                          }`}>
                            {fields.goals.includes(g.id) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Comment nous avez-vous connu ?">
                    <div className="grid grid-cols-2 gap-2">
                      {REFERRAL_OPTIONS.map(r => (
                        <button key={r} type="button" onClick={() => set('referralSource', r)}
                          className={`px-3 py-2.5 rounded-xl border text-sm text-center transition-all ${
                            fields.referralSource === r
                              ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/40 text-[#a78bfa]'
                              : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f] hover:text-[#94a3b8]'
                          }`}>{r}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {err && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 mt-5"
              >
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-400">{err}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-7">
            {step > 1 && (
              <button type="button" onClick={back}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#1e1e3f] text-[#475569] hover:text-[#94a3b8] hover:border-[#3b3b6f] text-sm transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Retour
              </button>
            )}

            {step < 6 ? (
              <button type="button" onClick={next}
                className="flex-1 btn-primary py-3 text-sm flex items-center justify-center gap-2">
                Continuer
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={pending}
                className="flex-1 btn-primary py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {pending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Création du compte…
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Footer */}
          {step === 1 && (
            <div className="mt-6 pt-5 border-t border-[#1e1e3f] text-center">
              <p className="text-sm text-[#475569]">
                Déjà un compte ?{' '}
                <Link href="/login" className="text-[#8b5cf6] hover:text-[#a78bfa] font-medium transition-colors">
                  Se connecter
                </Link>
              </p>
            </div>
          )}
          {step === 6 && (
            <p className="mt-4 text-xs text-[#475569] text-center leading-relaxed">
              En créant un compte, vous acceptez les{' '}
              <Link href="/cgv" className="text-[#8b5cf6] hover:text-[#a78bfa]">CGV</Link>
              {' '}et la{' '}
              <Link href="/confidentialite" className="text-[#8b5cf6] hover:text-[#a78bfa]">politique de confidentialité</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2">
        {label}
        {hint && <span className="normal-case tracking-normal text-[#475569] ml-1.5">· {hint}</span>}
      </label>
      {children}
    </div>
  )
}
