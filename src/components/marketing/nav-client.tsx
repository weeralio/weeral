'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { WeeralIcon } from '@/components/ui/weeral-logo'

export default function NavClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#07070f]/90 backdrop-blur-xl border-b border-[#1e1e3f] shadow-[0_1px_40px_rgba(139,92,246,0.06)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <WeeralIcon size={28} className="group-hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all rounded-lg" />
          <span className="font-bold text-white tracking-tight">Weeral</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { href: '/#fonctionnalites', label: 'Fonctionnalités' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/a-propos', label: 'À propos' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-[#94a3b8] hover:text-white transition-colors duration-200 relative group"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-[#8b5cf6] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="btn-primary px-4 py-2 text-sm"
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#94a3b8] hover:text-white transition-colors">
                Connexion
              </Link>
              <Link href="/signup" className="btn-primary px-4 py-2 text-sm">
                Commencer →
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-[#94a3b8] hover:text-white transition-colors p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-[#0d0d1c]/95 backdrop-blur-xl border-b border-[#1e1e3f] px-6 py-4 space-y-4"
        >
          <Link href="/#fonctionnalites" className="block text-sm text-[#94a3b8] hover:text-white" onClick={() => setOpen(false)}>Fonctionnalités</Link>
          <Link href="/pricing" className="block text-sm text-[#94a3b8] hover:text-white" onClick={() => setOpen(false)}>Pricing</Link>
          <Link href="/a-propos" className="block text-sm text-[#94a3b8] hover:text-white" onClick={() => setOpen(false)}>À propos</Link>
          <div className="pt-2 border-t border-[#1e1e3f] flex gap-3">
            <Link href="/login" className="text-sm text-[#94a3b8] hover:text-white" onClick={() => setOpen(false)}>Connexion</Link>
            <Link href="/signup" className="btn-primary px-4 py-2 text-sm inline-block" onClick={() => setOpen(false)}>Commencer</Link>
          </div>
        </motion.div>
      )}
    </header>
  )
}
