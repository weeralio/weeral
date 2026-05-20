'use client'

import { useState, useEffect } from 'react'
import AwsCredentialsForm from '../parametres/aws-credentials-form'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step {
  id: string
  title: string
  duration: string
  content: React.ReactNode
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2 bg-[#07070f] border border-[#1e1e3f] rounded-lg px-4 py-2.5 mt-2 group">
      <code className="text-[#a78bfa] text-sm font-mono flex-1 break-all">{children}</code>
      <button onClick={copy} className="shrink-0 text-[#475569] hover:text-white transition-colors text-xs">
        {copied ? '✓' : 'Copier'}
      </button>
    </div>
  )
}

function InlineCode({ children }: { children: string }) {
  return <code className="bg-[#1e1e3f] text-[#a78bfa] text-xs px-1.5 py-0.5 rounded font-mono">{children}</code>
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-[#8b5cf6]/8 border border-[#8b5cf6]/20 rounded-xl px-4 py-3 mt-3">
      <span className="text-[#8b5cf6] text-sm shrink-0">💡</span>
      <p className="text-sm text-[#a78bfa] leading-relaxed">{children}</p>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 mt-3">
      <span className="text-amber-400 text-sm shrink-0">⚠</span>
      <p className="text-sm text-amber-300 leading-relaxed">{children}</p>
    </div>
  )
}

function NavBtn({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e1e3f] hover:bg-[#2a2a5a] border border-[#3b3b6f] text-white text-sm rounded-lg transition-colors mt-3"
    >
      {children}
      <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}

function Ol({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2 mt-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-[#94a3b8] leading-relaxed">
          <span className="w-5 h-5 rounded-full bg-[#1e1e3f] text-[#8b5cf6] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

// ─── Steps content ────────────────────────────────────────────────────────────

function Step1Content() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#94a3b8]">
        Tu as besoin d&apos;un compte AWS pour utiliser Amazon SES. C&apos;est gratuit à créer.
        La carte bancaire est demandée mais ne sera débitée qu&apos;en cas de dépassement du tier gratuit.
      </p>

      <NavBtn href="https://aws.amazon.com/fr/free">Créer un compte AWS gratuit →</NavBtn>

      <Ol items={[
        <>Clique sur <strong className="text-white">Créer un compte AWS</strong></>,
        <>Entre ton email, un mot de passe, et un nom de compte (ex : <InlineCode>weeral-prod</InlineCode>)</>,
        <>Entre tes infos de carte bancaire — AWS débite <strong className="text-white">1 USD</strong> temporaire pour vérifier, remboursé sous 3-5 jours</>,
        <>Vérifie ton numéro de téléphone par SMS</>,
        <>Choisis le plan <strong className="text-white">Support de base (gratuit)</strong></>,
        <>Connexion à la console : <NavBtn href="https://console.aws.amazon.com">Ouvrir la console →</NavBtn></>,
      ]} />

      <Tip>Si tu as déjà un compte AWS, passe directement à l&apos;étape 2.</Tip>
    </div>
  )
}

function Step2Content() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#94a3b8]">
        Amazon SES (Simple Email Service) est le service d&apos;envoi d&apos;emails d&apos;AWS.
        Il faut le configurer dans la bonne région géographique.
      </p>

      <NavBtn href="https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1">Ouvrir SES (Europe Irlande) →</NavBtn>

      <Ol items={[
        <>Dans la console AWS, clique sur la barre de recherche en haut et tape <InlineCode>SES</InlineCode></>,
        <>Clique sur <strong className="text-white">Simple Email Service</strong></>,
        <><strong className="text-white">Important :</strong> vérifie la région en haut à droite — sélectionne <InlineCode>Europe (Irlande) eu-west-1</InlineCode> pour les clients européens</>,
        <>Tu arrives sur le dashboard SES — c&apos;est ici que tout se passe</>,
      ]} />

      <Tip>
        Choisis la région la plus proche de tes destinataires. Pour l&apos;Europe : <InlineCode>eu-west-1</InlineCode>.
        Une fois choisie, ne change plus — les domaines vérifiés sont liés à une région.
      </Tip>
    </div>
  )
}

function Step3Content() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#94a3b8]">
        Tu dois prouver à AWS que tu possèdes le domaine depuis lequel tu vas envoyer des emails.
        Ça se fait en ajoutant des enregistrements DNS.
      </p>

      <NavBtn href="https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/verified-identities">
        SES → Verified identities →
      </NavBtn>

      <Ol items={[
        <>Dans SES, clique sur <strong className="text-white">Verified identities</strong> dans le menu gauche</>,
        <>Clique sur <strong className="text-white">Create identity</strong></>,
        <>Sélectionne <strong className="text-white">Domain</strong> (pas Email)</>,
        <>Entre ton domaine, ex : <InlineCode>weeral.io</InlineCode> ou ton domaine d&apos;envoi</>,
        <>Laisse <strong className="text-white">DKIM signing</strong> activé par défaut</>,
        <>Clique <strong className="text-white">Create identity</strong> — AWS affiche 3 enregistrements CNAME</>,
        <>Copie ces 3 enregistrements CNAME et ajoute-les chez ton registrar de domaine (Namecheap, OVH, etc.)</>,
        <>Attends 15 min à 24h — le statut passe de <span className="text-amber-400">Pending</span> à <span className="text-emerald-400">Verified</span></>,
      ]} />

      <Warning>
        AWS affiche aussi des enregistrements pour SPF et DMARC — ajoute-les aussi.
        Sans eux, tes emails risquent d&apos;aller en spam.
      </Warning>
    </div>
  )
}

function Step4Content() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#94a3b8]">
        Par défaut, SES est en mode <strong className="text-white">Sandbox</strong> : tu ne peux envoyer qu&apos;à des adresses
        que tu as vérifiées. Il faut demander l&apos;accès Production pour envoyer à n&apos;importe qui.
      </p>

      <NavBtn href="https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/account">
        SES → Account dashboard →
      </NavBtn>

      <Ol items={[
        <>Dans SES, clique sur <strong className="text-white">Account dashboard</strong></>,
        <>Tu vois un encart <strong className="text-white">Sending limits</strong> avec un bouton <strong className="text-white">Request production access</strong></>,
        <>Remplis le formulaire :</>,
      ]} />

      <div className="bg-[#07070f] border border-[#1e1e3f] rounded-xl p-4 mt-2 space-y-3">
        <div>
          <p className="text-xs text-[#475569] uppercase tracking-wider mb-1">Mail type</p>
          <p className="text-sm text-white">Transactional</p>
        </div>
        <div>
          <p className="text-xs text-[#475569] uppercase tracking-wider mb-1">Website URL</p>
          <Code>https://weeral.io</Code>
        </div>
        <div>
          <p className="text-xs text-[#475569] uppercase tracking-wider mb-1">Use case description (en anglais)</p>
          <Code>We run a B2B cold email outreach SaaS. Our users send prospecting emails to potential business clients who have been identified as relevant prospects. All contacts are manually sourced or imported by our users. We provide unsubscribe links in all emails and immediately honor opt-out requests. We comply with GDPR and CAN-SPAM regulations.</Code>
        </div>
      </div>

      <Tip>
        AWS répond généralement sous 1 à 3 jours ouvrés. Pendant ce temps, tu peux tester avec des adresses vérifiées.
      </Tip>
    </div>
  )
}

function Step5Content() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#94a3b8]">
        Plutôt que d&apos;utiliser les clés de ton compte root, on crée un utilisateur IAM dédié avec uniquement
        les droits SES. C&apos;est une bonne pratique de sécurité.
      </p>

      <NavBtn href="https://console.aws.amazon.com/iam/home#/users/create">IAM → Créer un utilisateur →</NavBtn>

      <Ol items={[
        <>Cherche <InlineCode>IAM</InlineCode> dans la barre de recherche AWS et clique dessus</>,
        <>Dans le menu gauche, clique <strong className="text-white">Users</strong> puis <strong className="text-white">Create user</strong></>,
        <>Nom d&apos;utilisateur : <Code>weeral-ses-user</Code></>,
        <>Clique <strong className="text-white">Next</strong> (pas besoin d&apos;accès console)</>,
        <>Sélectionne <strong className="text-white">Attach policies directly</strong></>,
        <>Dans la barre de recherche, tape <InlineCode>AmazonSESFullAccess</InlineCode> et coche-la</>,
        <>Clique <strong className="text-white">Next</strong> → <strong className="text-white">Create user</strong></>,
      ]} />

      <Tip>
        <InlineCode>AmazonSESFullAccess</InlineCode> donne accès uniquement à SES —
        pas au reste de ton compte AWS.
      </Tip>
    </div>
  )
}

function Step6Content() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#94a3b8]">
        Maintenant on génère les clés API pour cet utilisateur. Le Secret Access Key n&apos;est affiché
        qu&apos;<strong className="text-white">une seule fois</strong> — sauvegarde-le immédiatement.
      </p>

      <NavBtn href="https://console.aws.amazon.com/iam/home#/users">IAM → Users →</NavBtn>

      <Ol items={[
        <>Clique sur l&apos;utilisateur <InlineCode>weeral-ses-user</InlineCode> que tu viens de créer</>,
        <>Onglet <strong className="text-white">Security credentials</strong></>,
        <>Clique <strong className="text-white">Create access key</strong></>,
        <>Sélectionne <strong className="text-white">Application running outside AWS</strong></>,
        <>Description (optionnel) : <InlineCode>Weeral SES integration</InlineCode></>,
        <>Clique <strong className="text-white">Create access key</strong></>,
        <>Tu vois maintenant <strong className="text-white">Access key ID</strong> et <strong className="text-white">Secret access key</strong></>,
      ]} />

      <Warning>
        Le Secret Access Key n&apos;est visible qu&apos;une seule fois. Si tu le perds, tu devras en créer un nouveau.
        Copie-le maintenant dans un endroit sûr, puis colle-le dans l&apos;étape suivante.
      </Warning>
    </div>
  )
}

function Step7Content({ hasCredentials, region }: { hasCredentials: boolean; region: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#94a3b8]">
        Dernière étape — entre tes clés AWS dans Weeral. Elles sont chiffrées (AES-256) avant d&apos;être stockées.
      </p>
      <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl p-5">
        <AwsCredentialsForm existingRegion={region} hasCredentials={hasCredentials} />
      </div>
    </div>
  )
}

// ─── Main Guide ───────────────────────────────────────────────────────────────

const STEP_STORAGE_KEY = 'aws-setup-checked'

export default function AwsSetupGuide({
  hasCredentials,
  existingRegion,
}: {
  hasCredentials: boolean
  existingRegion: string
}) {
  const [open, setOpen] = useState<string | null>('step-1')
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STEP_STORAGE_KEY)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}
  }, [])

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(STEP_STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const STEPS: Step[] = [
    { id: 'step-1', title: 'Créer un compte AWS', duration: '5 min', content: <Step1Content /> },
    { id: 'step-2', title: 'Accéder à Amazon SES', duration: '2 min', content: <Step2Content /> },
    { id: 'step-3', title: 'Vérifier ton domaine', duration: '10 min + attente DNS', content: <Step3Content /> },
    { id: 'step-4', title: 'Demander l\'accès production', duration: '5 min (réponse 1-3 jours)', content: <Step4Content /> },
    { id: 'step-5', title: 'Créer un utilisateur IAM', duration: '3 min', content: <Step5Content /> },
    { id: 'step-6', title: 'Générer les clés API', duration: '2 min', content: <Step6Content /> },
    { id: 'step-7', title: 'Configurer dans Weeral', duration: '1 min', content: <Step7Content hasCredentials={hasCredentials} region={existingRegion} /> },
  ]

  const doneCount = STEPS.filter(s => checked.has(s.id)).length
  const progress = Math.round((doneCount / STEPS.length) * 100)

  return (
    <div className="max-w-2xl space-y-6">

      {/* Progress header */}
      <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white">Progression</p>
            <p className="text-xs text-[#475569]">{doneCount} / {STEPS.length} étapes complétées</p>
          </div>
          <span className="text-2xl font-bold text-[#8b5cf6]">{progress}%</span>
        </div>
        <div className="h-2 bg-[#1e1e3f] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        {hasCredentials && (
          <div className="flex items-center gap-2 mt-4 text-sm text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            AWS SES configuré — région : <span className="font-semibold">{existingRegion}</span>
          </div>
        )}
      </div>

      {/* Steps accordion */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isOpen = open === step.id
          const isDone = checked.has(step.id)

          return (
            <div
              key={step.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                isDone
                  ? 'border-[#8b5cf6]/30 bg-[#8b5cf6]/5'
                  : isOpen
                  ? 'border-[#8b5cf6]/40 bg-[#0d0d1c]'
                  : 'border-[#1e1e3f] bg-[#0d0d1c]'
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setOpen(isOpen ? null : step.id)}
                className="w-full flex items-center gap-4 p-5 text-left"
              >
                {/* Number / check */}
                <div
                  onClick={e => { e.stopPropagation(); toggleCheck(step.id) }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-all cursor-pointer ${
                    isDone
                      ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                      : 'border-[#3b3b6f] text-[#475569] hover:border-[#8b5cf6]/50'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i + 1}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isDone ? 'text-[#a78bfa]' : 'text-white'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-[#475569]">{step.duration}</p>
                </div>

                {/* Chevron */}
                <svg
                  className={`w-4 h-4 text-[#475569] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Content */}
              {isOpen && (
                <div className="px-5 pb-6 border-t border-[#1e1e3f]">
                  <div className="pt-4">{step.content}</div>
                  <button
                    onClick={() => {
                      toggleCheck(step.id)
                      const next = STEPS[i + 1]
                      if (next) setOpen(next.id)
                    }}
                    className="mt-5 flex items-center gap-2 text-sm font-medium text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {isDone ? 'Marquer comme non fait' : 'Marquer comme fait'} {STEPS[i + 1] ? '→ Étape suivante' : ''}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
