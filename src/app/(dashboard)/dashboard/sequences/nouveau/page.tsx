import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SequenceGenerator from './generator'

export default async function NewSequencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: identities } = await supabase
    .from('sender_identities')
    .select('id, email, display_name')
    .eq('user_id', user.id)
    .order('email')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/sequences" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Séquences
        </Link>
        <h1 className="text-2xl font-bold text-white">Nouvelle séquence</h1>
        <p className="text-sm text-[#475569] mt-1">Rédige toi-même tes emails ou laisse l&apos;IA générer la séquence.</p>
      </div>
      <SequenceGenerator identities={identities ?? []} />
    </div>
  )
}
