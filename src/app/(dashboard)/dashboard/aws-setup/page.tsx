import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProviderSetup from './provider-setup'
import type { ProviderType } from './provider-actions'

export default async function AwsSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: creds }, { data: providerConfigs }] = await Promise.all([
    supabase.from('aws_credentials').select('aws_region').eq('user_id', user.id).single(),
    supabase.from('provider_configs').select('provider').eq('user_id', user.id),
  ])

  const configuredProviders = (providerConfigs ?? []).map(p => p.provider as ProviderType)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fournisseur d&apos;envoi</h1>
        <p className="text-sm text-[#475569] mt-1">
          Choisis ton fournisseur email. Utilise le calculateur pour estimer ton coût selon ton volume.
        </p>
      </div>
      <ProviderSetup
        hasAwsCredentials={!!creds}
        existingRegion={creds?.aws_region ?? 'eu-west-1'}
        configuredProviders={configuredProviders}
      />
    </div>
  )
}
