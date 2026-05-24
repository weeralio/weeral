'use server'

import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export type ProviderType = 'brevo' | 'mailgun' | 'sendgrid'
type State = { error: string } | { success: string } | null

export async function saveProviderApiKey(
  provider: ProviderType,
  apiKey: string,
): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!apiKey.trim()) return { error: 'Clé API requise' }

  const { error } = await supabase
    .from('provider_configs')
    .upsert({
      user_id: user.id,
      provider,
      api_key_encrypted: encrypt(apiKey.trim()),
    }, { onConflict: 'user_id,provider' })

  if (error) {
    if (error.code === '42P01') {
      return { error: 'Table provider_configs manquante — exécute la migration SQL dans Supabase.' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard/aws-setup')
  return { success: `Clé ${provider} sauvegardée.` }
}

export async function getProviderConfig(provider: ProviderType): Promise<{ configured: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { configured: false }

  const { data } = await supabase
    .from('provider_configs')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .single()

  return { configured: !!data }
}
