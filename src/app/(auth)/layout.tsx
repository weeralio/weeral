export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07070f] px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="orb orb-purple w-[500px] h-[500px] -top-40 -left-40 opacity-30" />
      <div className="orb orb-blue w-[400px] h-[400px] -bottom-32 -right-32 opacity-25" />
      <div className="grid-pattern absolute inset-0" />

      {/* Logo top */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.5)]">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="font-semibold text-white">Weeral</span>
      </div>

      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  )
}
