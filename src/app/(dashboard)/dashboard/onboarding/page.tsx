import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SequenceWizard from './wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: domains }, { data: senderIdentities }] = await Promise.all([
    supabase
      .from('domains')
      .select('id, domain, status, sent_today, daily_limit')
      .eq('user_id', user.id)
      .neq('status', 'blocked')
      .order('created_at', { ascending: false }),
    supabase
      .from('sender_identities')
      .select('id, email, domain_id')
      .eq('user_id', user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nouvelle séquence IA</h1>
        <p className="text-sm text-[#475569] mt-1">
          L&apos;IA génère une séquence de cold emails optimisée pour ta cible en quelques secondes.
        </p>
      </div>
      <SequenceWizard
        domains={domains ?? []}
        senderIdentities={senderIdentities ?? []}
      />
    </div>
  )
}
