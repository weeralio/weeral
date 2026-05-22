'use client'

import Link from 'next/link'
import { FREE_CONTACTS_LIMIT, FREE_EMAILS_LIMIT } from '@/lib/stripe'

interface Props {
  contactsUsed: number
  emailsSent:   number
  isSubscribed: boolean
}

export default function CreditsBanner({ contactsUsed, emailsSent, isSubscribed }: Props) {
  if (isSubscribed) return null

  const contactsPct = Math.min(100, Math.round((contactsUsed / FREE_CONTACTS_LIMIT) * 100))
  const emailsPct   = Math.min(100, Math.round((emailsSent   / FREE_EMAILS_LIMIT)   * 100))
  const isBlocked   = contactsUsed >= FREE_CONTACTS_LIMIT || emailsSent >= FREE_EMAILS_LIMIT
  const isWarning   = contactsPct >= 80 || emailsPct >= 80

  if (!isWarning && contactsUsed === 0 && emailsSent === 0) return null

  return (
    <div className={`rounded-2xl border p-5 mb-6 ${
      isBlocked
        ? 'bg-red-950/20 border-red-800/40'
        : isWarning
        ? 'bg-amber-950/20 border-amber-800/40'
        : 'bg-[#0d0d1c] border-[#1e1e3f]'
    }`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className={`text-sm font-semibold ${isBlocked ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-white'}`}>
            {isBlocked ? 'Limite atteinte — abonnement requis' : 'Crédits gratuits'}
          </p>
          <p className="text-xs text-[#475569] mt-0.5">
            {isBlocked
              ? 'Passez à un plan payant pour continuer à utiliser Weeral.'
              : `${FREE_CONTACTS_LIMIT} contacts et ${FREE_EMAILS_LIMIT} emails offerts pour tester.`}
          </p>
        </div>
        <Link
          href="/pricing"
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            isBlocked
              ? 'bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white shadow-[0_0_16px_rgba(139,92,246,0.3)]'
              : 'border border-[#1e1e3f] text-[#94a3b8] hover:border-[#3b3b6f] hover:text-white'
          }`}
        >
          {isBlocked ? 'Choisir un plan →' : 'Voir les plans'}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#475569]">Contacts</span>
            <span className={contactsUsed >= FREE_CONTACTS_LIMIT ? 'text-red-400' : 'text-[#94a3b8]'}>
              {contactsUsed} / {FREE_CONTACTS_LIMIT}
            </span>
          </div>
          <div className="h-1.5 bg-[#1e1e3f] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                contactsPct >= 100 ? 'bg-red-500' : contactsPct >= 80 ? 'bg-amber-500' : 'bg-violet-500'
              }`}
              style={{ width: `${contactsPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#475569]">Emails envoyés</span>
            <span className={emailsSent >= FREE_EMAILS_LIMIT ? 'text-red-400' : 'text-[#94a3b8]'}>
              {emailsSent} / {FREE_EMAILS_LIMIT}
            </span>
          </div>
          <div className="h-1.5 bg-[#1e1e3f] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                emailsPct >= 100 ? 'bg-red-500' : emailsPct >= 80 ? 'bg-amber-500' : 'bg-violet-500'
              }`}
              style={{ width: `${emailsPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
