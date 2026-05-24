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
      <div className="px-4 py-3 rounded-xl border border-[#1e1e3f] bg-[#07070f]">
        <p className="text-xs font-medium text-[#94a3b8] mb-1">ℹ Déclencheurs disponibles</p>
        <p className="text-xs text-[#475569]">
          Les déclencheurs <strong className="text-[#94a3b8]">ouverture</strong> et <strong className="text-[#94a3b8]">clic</strong> fonctionnent automatiquement via le tracking intégré.
          La détection de <strong className="text-[#94a3b8]">réponse</strong> nécessite une configuration webhook côté expéditeur (ex : SES Receipt Rule, Mailgun inbound routes).
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
