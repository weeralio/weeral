import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import Link from 'next/link'

const PAYMENT_FAILED_STATUSES = ['past_due', 'unpaid', 'incomplete_expired']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  const paymentFailed = subscription && PAYMENT_FAILED_STATUSES.includes(subscription.status)

  return (
    <div className="flex h-screen bg-[#07070f]">
      <Sidebar email={user.email!} />
      <main className="flex-1 overflow-auto">
        {paymentFailed && (
          <div className="bg-red-950/80 border-b border-red-700/60 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-sm text-red-200">
                <span className="font-semibold">Échec de paiement —</span> Votre tentative de paiement a échoué. Mettez à jour votre moyen de paiement pour continuer à utiliser le service.
              </p>
            </div>
            <Link
              href="/dashboard/parametres"
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-700/60 hover:bg-red-700/80 text-red-100 transition-colors"
            >
              Mettre à jour →
            </Link>
          </div>
        )}
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
