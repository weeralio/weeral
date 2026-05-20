'use server'

import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'
import { SESClient, GetSendQuotaCommand } from '@aws-sdk/client-ses'

type State = { error: string } | { success: string } | null

export async function saveAwsCredentials(prevState: State, formData: FormData): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const accessKeyId = formData.get('access_key_id') as string
  const secretAccessKey = formData.get('secret_access_key') as string
  const region = formData.get('aws_region') as string

  if (!accessKeyId || !secretAccessKey || !region) {
    return { error: 'Tous les champs sont requis' }
  }

  const { error } = await supabase
    .from('aws_credentials')
    .upsert({
      user_id: user.id,
      access_key_id: encrypt(accessKeyId),
      secret_access_key: encrypt(secretAccessKey),
      aws_region: region,
    }, { onConflict: 'user_id' })

  if (error) return { error: error.message }

  return { success: 'Credentials sauvegardés.' }
}

export async function testAwsConnection(): Promise<{ error: string } | { success: string; quota: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: creds } = await supabase
    .from('aws_credentials')
    .select('access_key_id, secret_access_key, aws_region')
    .eq('user_id', user.id)
    .single()

  if (!creds) return { error: 'Aucun credential trouvé' }

  try {
    const ses = new SESClient({
      region: creds.aws_region,
      credentials: {
        accessKeyId: decrypt(creds.access_key_id),
        secretAccessKey: decrypt(creds.secret_access_key),
      },
    })

    const result = await ses.send(new GetSendQuotaCommand({}))
    return { success: 'Connexion SES réussie', quota: result.Max24HourSend ?? 0 }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return { error: `Connexion échouée : ${message}` }
  }
}
