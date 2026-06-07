'use client'

import React from 'react'
import Link from 'next/link'
import { WeeralIcon } from '@/components/ui/weeral-logo'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth/actions'
import { motion } from 'framer-motion'

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItem = { label: string; href: string; icon: React.ReactNode; exact?: boolean; highlight?: boolean }
type NavGroup = { section: string | null; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    section: null,
    items: [
      {
        label: 'Tableau de bord',
        href: '/dashboard',
        exact: true,
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      },
    ],
  },
  {
    section: 'Contacts',
    items: [
      {
        label: 'Mes contacts',
        href: '/dashboard/contacts',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
    ],
  },
  {
    section: 'Infrastructure',
    items: [
      {
        label: 'Domaines',
        href: '/dashboard/domaines',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
      },
      {
        label: 'Campagnes Warmup',
        href: '/dashboard/warmup',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
      },
      {
        label: 'Expéditeurs & SMTP',
        href: '/dashboard/aws-setup',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>,
      },
    ],
  },
  {
    section: 'Campagnes',
    items: [
      {
        label: 'Créer avec l\'IA',
        href: '/dashboard/campagnes-ia',
        highlight: true,
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
      },
      {
        label: 'Mes campagnes',
        href: '/dashboard/campagnes',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      },
      {
        label: 'Séquences',
        href: '/dashboard/sequences',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
      },
      {
        label: 'Répondeurs auto',
        href: '/dashboard/repondeurs',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
      },
    ],
  },
  {
    section: 'Résultats',
    items: [
      {
        label: 'Analytics',
        href: '/dashboard/analytics',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      },
    ],
  },
  {
    section: 'Compte',
    items: [
      {
        label: 'Paramètres',
        href: '/dashboard/parametres',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 bg-[#0a0a18] border-r border-[#1e1e3f] flex flex-col">

      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-[#1e1e3f]">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <WeeralIcon size={28} />
          <span className="font-bold text-white tracking-tight">Weeral</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.section && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-[#334155] uppercase tracking-widest">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)

                if (item.highlight && !isActive) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#a78bfa] hover:bg-[#8b5cf6]/15"
                    >
                      <span className="text-[#8b5cf6]">{item.icon}</span>
                      <span className="font-semibold">{item.label}</span>
                      <span className="ml-auto text-[9px] bg-[#8b5cf6] text-white px-1.5 py-0.5 rounded-full font-bold">IA</span>
                    </Link>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 group ${
                      isActive ? 'text-white' : 'text-[#475569] hover:text-[#94a3b8] hover:bg-[#111128]'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-[#8b5cf6]/12 border border-[#8b5cf6]/25 rounded-xl"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <span className={`relative z-10 transition-colors ${isActive ? 'text-[#8b5cf6]' : 'group-hover:text-[#8b5cf6]/60'}`}>
                      {item.icon}
                    </span>
                    <span className="relative z-10 font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-[#1e1e3f]">
        <div className="flex items-center gap-2.5 px-3 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {email[0].toUpperCase()}
          </div>
          <p className="text-xs text-[#475569] truncate flex-1">{email}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-xs text-[#475569] hover:text-[#94a3b8] hover:bg-[#111128] transition-all group"
          >
            <svg className="w-3.5 h-3.5 group-hover:text-[#8b5cf6]/60 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  )
}
