'use server'

import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export type ProviderType = 'brevo' | 'mailgun' | 'sendgrid'
type State = { error: string } | { success: string } | null

// ─── API key verification ─────────────────────────────────────────────────────

async function verifyApiKey(provider: ProviderType, apiKey: string): Promise<string | null> {
  try {
    let res: Response

    if (provider === 'brevo') {
      res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': apiKey },
      })
      if (res.status === 401 || res.status === 403) return 'Clé Brevo invalide ou sans permissions.'
      if (!res.ok) return `Brevo a répondu avec une erreur (${res.status}).`
    }

    else if (provider === 'mailgun') {
      const encoded = Buffer.from(`api:${apiKey}`).toString('base64')
      // Try US then EU region
      res = await fetch('https://api.mailgun.net/v3/domains?limit=1', {
        headers: { Authorization: `Basic ${encoded}` },
      })
      if (res.status === 401 || res.status === 403) {
        res = await fetch('https://api.eu.mailgun.net/v3/domains?limit=1', {
          headers: { Authorization: `Basic ${encoded}` },
        })
      }
      if (res.status === 401 || res.status === 403) return 'Clé Mailgun invalide ou sans permissions.'
      if (!res.ok) return `Mailgun a répondu avec une erreur (${res.status}).`
    }

    else if (provider === 'sendgrid') {
      res = await fetch('https://api.sendgrid.com/v3/user/account', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (res.status === 401 || res.status === 403) return 'Clé SendGrid invalide ou sans permissions.'
      if (!res.ok) return `SendGrid a répondu avec une erreur (${res.status}).`
    }

    return null // valid
  } catch {
    return 'Impossible de contacter le provider — vérifie ta connexion.'
  }
}

// ─── Save action ──────────────────────────────────────────────────────────────

export async function saveProviderApiKey(
  provider: ProviderType,
  apiKey: string,
): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!apiKey.trim()) return { error: 'Clé API requise' }

  // Verify the key actually works before saving
  const verifyError = await verifyApiKey(provider, apiKey.trim())
  if (verifyError) return { error: verifyError }

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
  return { success: `Connexion ${provider} vérifiée et sauvegardée.` }
}

export async function deleteProviderConfig(provider: ProviderType): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  await supabase
    .from('provider_configs')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)
  revalidatePath('/dashboard/parametres')
  revalidatePath('/dashboard/aws-setup')
  return {}
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

// ─── Mailgun: auto-configure webhooks via API ─────────────────────────────────

export async function setupMailgunWebhooks(): Promise<{ error?: string; success?: string; details?: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: config } = await supabase
    .from('provider_configs')
    .select('api_key_encrypted')
    .eq('user_id', user.id)
    .eq('provider', 'mailgun')
    .single()

  if (!config) return { error: 'Mailgun non configuré' }

  const apiKey = decrypt(config.api_key_encrypted)
  const credentials = Buffer.from(`api:${apiKey}`).toString('base64')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return { error: 'NEXT_PUBLIC_APP_URL manquant' }

  const webhookUrl = `${appUrl}/api/webhooks/mailgun`
  const events = ['bounced', 'complained', 'unsubscribed', 'opened', 'clicked']

  // Detect region (US then EU)
  let baseUrl = 'https://api.mailgun.net'
  let domainsRes = await fetch(`${baseUrl}/v3/domains?limit=25`, {
    headers: { Authorization: `Basic ${credentials}` },
  })
  if (!domainsRes.ok) {
    baseUrl = 'https://api.eu.mailgun.net'
    domainsRes = await fetch(`${baseUrl}/v3/domains?limit=25`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
  }
  if (!domainsRes.ok) return { error: `Impossible de contacter Mailgun (${domainsRes.status})` }

  const { items } = await domainsRes.json() as { items?: { name: string }[] }
  if (!items?.length) return { error: 'Aucun domaine trouvé dans ton compte Mailgun' }

  const details: string[] = []

  for (const domain of items) {
    for (const event of events) {
      const headers = {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }

      // Check if webhook already exists
      const checkRes = await fetch(`${baseUrl}/v3/domains/${domain.name}/webhooks/${event}`, {
        headers: { Authorization: `Basic ${credentials}` },
      })

      let ok: boolean
      if (checkRes.ok) {
        // Update existing webhook
        const r = await fetch(`${baseUrl}/v3/domains/${domain.name}/webhooks/${event}`, {
          method: 'PUT',
          headers,
          body: new URLSearchParams({ url: webhookUrl }).toString(),
        })
        ok = r.ok
      } else {
        // Create new webhook
        const r = await fetch(`${baseUrl}/v3/domains/${domain.name}/webhooks`, {
          method: 'POST',
          headers,
          body: new URLSearchParams({ id: event, url: webhookUrl }).toString(),
        })
        ok = r.ok
      }

      details.push(`${domain.name} · ${event}: ${ok ? '✓' : '✗'}`)
    }
  }

  return { success: `Webhooks configurés pour ${items.length} domaine(s)`, details }
}
