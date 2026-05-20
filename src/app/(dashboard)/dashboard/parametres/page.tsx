import { createClient } from '@/lib/supabase/server'
import { getSESClient, getSendQuota } from '@/lib/ses'
import AwsCredentialsForm from './aws-credentials-form'

export default async function ParametresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: creds } = await supabase
    .from('aws_credentials')
    .select('access_key_id, aws_region, ses_in_production')
    .eq('user_id', user!.id)
    .single()

  let quota = null
  if (creds) {
    try {
      const ses = await getSESClient(user!.id)
      quota = await getSendQuota(ses)
      // Mise à jour automatique du statut production
      const isProduction = (quota.max24h ?? 0) > 200
      if (isProduction !== creds.ses_in_production) {
        await supabase.from('aws_credentials').update({ ses_in_production: isProduction }).eq('user_id', user!.id)
      }
    } catch {
      // Credentials invalides ou pas de connexion
    }
  }

  const isProduction = quota ? quota.max24h > 200 : false

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Paramètres</h1>
      <p className="text-sm text-gray-500 mb-8">Configure ton compte AWS SES pour envoyer des emails.</p>

      {/* Statut SES */}
      {quota && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h2 className="text-base font-medium text-gray-900 mb-4">Statut SES</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Mode</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isProduction ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {isProduction ? 'Production' : 'Sandbox'}
              </span>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Quota 24h</p>
              <p className="font-semibold text-gray-900">{quota.max24h.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Envoyés (24h)</p>
              <p className="font-semibold text-gray-900">{quota.sent24h.toLocaleString()}</p>
            </div>
          </div>
          {!isProduction && (
            <p className="mt-4 text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
              Mode sandbox actif — tu ne peux envoyer qu&apos;à des adresses vérifiées.
              Demande l&apos;accès production dans AWS Console → SES → Account dashboard.
            </p>
          )}
        </div>
      )}

      {/* Credentials */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-medium text-gray-900 mb-1">Credentials AWS SES</h2>
        <p className="text-sm text-gray-500 mb-6">
          Tes clés sont chiffrées (AES-256) avant stockage. Crée un utilisateur IAM dédié avec uniquement les permissions SES.
        </p>
        <AwsCredentialsForm existingRegion={creds?.aws_region ?? 'eu-west-1'} hasCredentials={!!creds} />
      </div>
    </div>
  )
}
