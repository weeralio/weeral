import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import AutoResponderForm from './form'
import AutoResponderList from './list'

export default async function RepondeursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: responders }, { data: identities }] = await Promise.all([
    supabase
      .from('auto_responders')
      .select('*, sender_identities(email)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('sender_identities')
      .select('id, email, display_name')
      .eq('user_id', user!.id),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Répondeurs automatiques</h1>
        <p className="text-sm text-[#475569] mt-1">Envoie une réponse automatique quand un contact répond, ouvre ou clique.</p>
      </div>

      {/* Setup notice for reply detection */}
      <div className="px-4 py-3 rounded-xl border border-amber-700/30 bg-amber-950/15">
        <p className="text-xs font-medium text-amber-400 mb-1">⚙ Configuration SES requise pour la détection de réponses</p>
        <p className="text-xs text-amber-200/70">
          Pour détecter les réponses email, configure une <strong>SES Receipt Rule</strong> dans AWS qui redirige les emails entrants vers{' '}
          <code className="bg-amber-950/40 px-1 rounded">/api/webhooks/ses</code>. Les déclencheurs &quot;ouverture&quot; et &quot;clic&quot; fonctionnent automatiquement via les webhooks existants.
        </p>
      </div>

      {/* Existing responders */}
      {(responders?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Répondeurs configurés</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AutoResponderList responders={responders ?? []} />
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Créer un répondeur</CardTitle>
          <CardDescription>Définit la règle, le délai et le message à envoyer automatiquement.</CardDescription>
        </CardHeader>
        <CardContent>
          <AutoResponderForm identities={identities ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
