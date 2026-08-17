'use server'

import { createClient } from '@/lib/supabase/server'
import { getSESClient, initDomainDkim, getDomainTxtRecord, getDomainVerificationStatus, verifyEmailIdentity } from '@/lib/ses'
import { revalidatePath } from 'next/cache'
import { getUserPlan, getPlanLimits } from '@/lib/credits'
import { decrypt } from '@/lib/crypto'

type State = { error: string } | { success: string } | null

// ─── Provider detection ───────────────────────────────────────────────────────

export type EmailProvider = 'aws' | 'brevo' | 'mailgun' | 'sendgrid' | null

export async function getUserProvider(userId: string): Promise<EmailProvider> {
  const supabase = await createClient()

  const { data: awsCreds } = await supabase
    .from('aws_credentials')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (awsCreds) return 'aws'

  const { data: config } = await supabase
    .from('provider_configs')
    .select('provider')
    .eq('user_id', userId)
    .single()

  return (config?.provider as EmailProvider) ?? null
}

// ─── Domain CRUD ──────────────────────────────────────────────────────────────

export async function addDomain(prevState: State, formData: FormData): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const domain = (formData.get('domain') as string)?.toLowerCase().trim()
  if (!domain) return { error: 'Domaine requis' }

  const plan = await getUserPlan(user.id)
  const limits = getPlanLimits(plan)
  if (limits.domains !== Infinity) {
    const { count } = await supabase.from('domains').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    if ((count ?? 0) >= limits.domains) {
      return { error: `Limite de ${limits.domains} domaine(s) atteinte pour votre plan. Passez au plan supérieur pour en ajouter davantage.` }
    }
  }

  const { error } = await supabase.from('domains').insert({ user_id: user.id, domain })
  if (error) {
    if (error.code === '23505') return { error: 'Ce domaine existe déjà' }
    return { error: error.message }
  }

  revalidatePath('/dashboard/domaines')
  return { success: `Domaine ${domain} ajouté.` }
}

export async function deleteDomain(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Verify ownership before deleting child records
  const { data: domain } = await supabase.from('domains').select('id').eq('id', id).eq('user_id', user.id).single()
  if (!domain) return { error: 'Domaine introuvable' }

  await supabase.from('sender_identities').delete().eq('domain_id', id).eq('user_id', user.id)
  await supabase.from('domains').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/domaines')
  return {}
}

export async function updateDomain(id: string, updates: { daily_limit?: number }): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  const { error } = await supabase
    .from('domains')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/domaines/${id}`)
  return {}
}

// ─── AWS SES: domain verification ────────────────────────────────────────────

export async function initDomainVerification(domainId: string): Promise<{ tokens?: string[]; txtRecord?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: domain } = await supabase
    .from('domains')
    .select('domain')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (!domain) return { error: 'Domaine introuvable' }

  try {
    const ses = await getSESClient(user.id)
    const [tokens, txtRecord] = await Promise.all([
      initDomainDkim(ses, domain.domain),
      getDomainTxtRecord(ses, domain.domain),
    ])
    return { tokens, txtRecord }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erreur SES' }
  }
}

export async function refreshDomainStatus(domainId: string): Promise<{ status?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: domain } = await supabase
    .from('domains')
    .select('domain')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (!domain) return { error: 'Domaine introuvable' }

  try {
    const ses = await getSESClient(user.id)
    const status = await getDomainVerificationStatus(ses, domain.domain)

    // If SES says verified, mark domain as active in our DB
    if (status === 'Success') {
      await supabase.from('domains').update({ status: 'active' }).eq('id', domainId)
      revalidatePath(`/dashboard/domaines/${domainId}`)
    }

    return { status }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erreur SES' }
  }
}

// ─── Non-AWS: mark domain as ready ───────────────────────────────────────────

export async function markDomainReady(domainId: string): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('domains')
    .update({ status: 'active' })
    .eq('id', domainId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/domaines/${domainId}`)
  return { success: 'Domaine marqué comme actif.' }
}

// ─── Sender identities ────────────────────────────────────────────────────────

export async function addSenderIdentity(prevState: State, formData: FormData): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const emailPrefix = (formData.get('email') as string)?.toLowerCase().trim()
  const displayName = formData.get('display_name') as string
  const domainId = formData.get('domain_id') as string

  if (!emailPrefix || !domainId) return { error: 'Tous les champs sont requis' }

  const plan = await getUserPlan(user.id)
  const limits = getPlanLimits(plan)
  if (limits.mailboxes !== Infinity) {
    const { count } = await supabase.from('sender_identities').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    if ((count ?? 0) >= limits.mailboxes) {
      return { error: `Limite de ${limits.mailboxes} boîte(s) mail atteinte pour votre plan. Passez au plan supérieur pour en ajouter davantage.` }
    }
  }

  const { data: domainData } = await supabase
    .from('domains')
    .select('domain')
    .eq('id', domainId)
    .single()

  if (!domainData) return { error: 'Domaine introuvable' }

  const email = `${emailPrefix}@${domainData.domain}`

  // Non-AWS providers don't need SES email verification — mark ready immediately
  const provider = await getUserProvider(user.id)
  const sesVerified = provider !== 'aws'

  const { error } = await supabase.from('sender_identities').insert({
    user_id: user.id,
    domain_id: domainId,
    email,
    display_name: displayName || null,
    ses_verified: sesVerified,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Cette adresse existe déjà' }
    return { error: error.message }
  }

  revalidatePath(`/dashboard/domaines/${domainId}`)
  return { success: `${email} ajouté.` }
}

// ─── Bulk create sender identities ───────────────────────────────────────────

export async function addSenderIdentitiesBulk(
  domainId: string,
  mailboxes: Array<{ prefix: string; displayName: string }>,
): Promise<{ created: number; errors: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { created: 0, errors: ['Non authentifié'] }

  const { data: domainData } = await supabase
    .from('domains')
    .select('domain')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (!domainData) return { created: 0, errors: ['Domaine introuvable'] }

  const provider = await getUserProvider(user.id)
  const sesVerified = provider !== 'aws'

  const rows = mailboxes
    .filter(m => m.prefix.trim())
    .map(m => ({
      user_id: user.id,
      domain_id: domainId,
      email: `${m.prefix.trim().toLowerCase()}@${domainData.domain}`,
      display_name: m.displayName.trim() || null,
      ses_verified: sesVerified,
    }))

  if (!rows.length) return { created: 0, errors: ['Aucune adresse valide'] }

  const plan = await getUserPlan(user.id)
  const limits = getPlanLimits(plan)
  if (limits.mailboxes !== Infinity) {
    const { count: existing } = await supabase.from('sender_identities').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const remaining = limits.mailboxes - (existing ?? 0)
    if (remaining <= 0) return { created: 0, errors: [`Limite de ${limits.mailboxes} boîtes mail atteinte pour votre plan.`] }
    if (rows.length > remaining) rows.splice(remaining)
  }

  const { data, error } = await supabase
    .from('sender_identities')
    .insert(rows)
    .select('id')

  if (error) {
    if (error.code === '23505') return { created: 0, errors: ['Une ou plusieurs adresses existent déjà'] }
    return { created: 0, errors: [error.message] }
  }

  revalidatePath(`/dashboard/domaines/${domainId}`)
  return { created: data?.length ?? 0, errors: [] }
}

// ─── AWS SES: verify sender email ────────────────────────────────────────────

export async function deleteSenderIdentity(identityId: string, domainId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // NULL-out FK references that have no ON DELETE clause (would block the delete)
  await Promise.all([
    supabase.from('sequence_enrollments').update({ sender_identity_id: null }).eq('sender_identity_id', identityId),
    supabase.from('auto_responders').update({ sender_identity_id: null }).eq('sender_identity_id', identityId),
    supabase.from('ia_campaigns').update({ mailbox_id: null }).eq('mailbox_id', identityId),
  ])

  const { error } = await supabase
    .from('sender_identities')
    .delete()
    .eq('id', identityId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/domaines/${domainId}`)
  return {}
}

export async function verifySenderEmail(identityId: string, domainId: string): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: identity } = await supabase
    .from('sender_identities')
    .select('email')
    .eq('id', identityId)
    .eq('user_id', user.id)
    .single()

  if (!identity) return { error: 'Identité introuvable' }

  try {
    const ses = await getSESClient(user.id)
    await verifyEmailIdentity(ses, identity.email)

    // Mark as verified in our DB
    await supabase.from('sender_identities').update({ ses_verified: true }).eq('id', identityId)
    revalidatePath(`/dashboard/domaines/${domainId}`)

    return { success: `Email de vérification envoyé à ${identity.email}` }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erreur SES' }
  }
}

export async function verifyContactEmailInSES(contactId: string): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: contact } = await supabase
    .from('contacts')
    .select('email')
    .eq('id', contactId)
    .eq('user_id', user.id)
    .single()

  if (!contact) return { error: 'Contact introuvable' }

  try {
    const ses = await getSESClient(user.id)
    await verifyEmailIdentity(ses, contact.email)
    return { success: `Email de vérification envoyé à ${contact.email}` }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erreur SES' }
  }
}

// ─── Mailgun inbound — helpers ────────────────────────────────────────────────

type MailgunInboundResult = {
  error?: string
  configured?: boolean
  mxRecords?: string[]
  region?: 'us' | 'eu'
  replyDomain?: string
}

async function getMailgunCredentials(userId: string): Promise<{ apiKey: string; credentials: string; baseUrl: string } | { error: string }> {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('provider_configs')
    .select('api_key_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'mailgun')
    .single()

  if (!config) return { error: 'Mailgun non configuré pour ce compte' }

  const apiKey = decrypt(config.api_key_encrypted)
  const credentials = Buffer.from(`api:${apiKey}`).toString('base64')

  // Detect region
  let baseUrl = 'https://api.mailgun.net'
  const probe = await fetch(`${baseUrl}/v3/domains?limit=1`, {
    headers: { Authorization: `Basic ${credentials}` },
  })
  if (!probe.ok) {
    baseUrl = 'https://api.eu.mailgun.net'
    const probeEu = await fetch(`${baseUrl}/v3/domains?limit=1`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    if (!probeEu.ok) return { error: 'Clé Mailgun invalide ou inaccessible' }
  }

  return { apiKey, credentials, baseUrl }
}

// ─── Mailgun inbound — check status ──────────────────────────────────────────

export async function checkMailgunInbound(domainId: string): Promise<MailgunInboundResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: domainRow } = await supabase
    .from('domains')
    .select('domain')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (!domainRow) return { error: 'Domaine introuvable' }

  const creds = await getMailgunCredentials(user.id)
  if ('error' in creds) return { error: creds.error }

  const { credentials, baseUrl } = creds
  const region: 'us' | 'eu' = baseUrl.includes('.eu.') ? 'eu' : 'us'
  const replyDomain = `reply.${domainRow.domain}`

  const mxRecords = region === 'eu'
    ? ['mxa.eu.mailgun.org', 'mxb.eu.mailgun.org']
    : ['mxa.mailgun.org', 'mxb.mailgun.org']

  // Check if the receiving domain exists in Mailgun
  const domainRes = await fetch(`${baseUrl}/v3/domains/${replyDomain}`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!domainRes.ok) {
    return { configured: false, mxRecords, region, replyDomain }
  }

  // Check if a route for this reply domain exists
  const routesRes = await fetch(`${baseUrl}/v3/routes?limit=100`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  let routeExists = false
  if (routesRes.ok) {
    const { items } = await routesRes.json() as { items?: { expression: string }[] }
    // Mailgun stores backslash-escaped dots in the expression, so check both forms
    const escapedSearch = replyDomain.replace(/\./g, '\\.')
    routeExists = (items ?? []).some(r =>
      r.expression.includes(replyDomain) || r.expression.includes(escapedSearch)
    )
  }

  return { configured: routeExists, mxRecords, region, replyDomain }
}

// ─── Mailgun inbound — setup ──────────────────────────────────────────────────

export async function setupMailgunInbound(domainId: string): Promise<MailgunInboundResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: domainRow } = await supabase
    .from('domains')
    .select('domain')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (!domainRow) return { error: 'Domaine introuvable' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return { error: 'NEXT_PUBLIC_APP_URL manquant' }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return { error: 'CRON_SECRET manquant' }

  const creds = await getMailgunCredentials(user.id)
  if ('error' in creds) return { error: creds.error }

  const { credentials, baseUrl } = creds
  const region: 'us' | 'eu' = baseUrl.includes('.eu.') ? 'eu' : 'us'
  const replyDomain = `reply.${domainRow.domain}`
  const mxRecords = region === 'eu'
    ? ['mxa.eu.mailgun.org', 'mxb.eu.mailgun.org']
    : ['mxa.mailgun.org', 'mxb.mailgun.org']

  const authHeaders = {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  // Create receiving domain (ignore 409 = already exists)
  const domainRes = await fetch(`${baseUrl}/v3/domains`, {
    method: 'POST',
    headers: authHeaders,
    body: new URLSearchParams({ name: replyDomain }).toString(),
  })

  if (!domainRes.ok && domainRes.status !== 409) {
    const err = await domainRes.text()
    return { error: `Erreur création domaine Mailgun : ${err}` }
  }

  const userEmail = user.email

  const webhookUrl = `${appUrl}/api/webhooks/inbound/mailgun?secret=${encodeURIComponent(cronSecret)}`
  const escapedDomain = replyDomain.replace(/\./g, '\\.')
  const expression = `match_recipient("r\\+(.*)@${escapedDomain}")`

  // Check if route already exists (Mailgun may store backslash-escaped dots)
  const routesRes = await fetch(`${baseUrl}/v3/routes?limit=100`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  let existingRouteId: string | null = null
  if (routesRes.ok) {
    const { items } = await routesRes.json() as { items?: { id: string; expression: string }[] }
    const existing = (items ?? []).find(r =>
      r.expression.includes(replyDomain) || r.expression.includes(escapedDomain)
    )
    existingRouteId = existing?.id ?? null
  }

  const routeBody = new URLSearchParams({
    priority: '10',
    description: `Inbound replies — ${replyDomain}`,
    expression,
  })
  routeBody.append('action', `forward("${webhookUrl}")`)
  if (userEmail) routeBody.append('action', `forward("${userEmail}")`)
  routeBody.append('action', 'stop()')

  const routeUrl = existingRouteId
    ? `${baseUrl}/v3/routes/${existingRouteId}`
    : `${baseUrl}/v3/routes`

  const routeRes = await fetch(routeUrl, {
    method: existingRouteId ? 'PUT' : 'POST',
    headers: authHeaders,
    body: routeBody.toString(),
  })

  if (!routeRes.ok) {
    const err = await routeRes.text()
    return { error: `Erreur création route Mailgun : ${err}` }
  }

  return { configured: true, mxRecords, region, replyDomain }
}

// ─── Throttle settings per mailbox ───────────────────────────────────────────

export async function updateMailboxThrottle(
  identityId: string,
  data: {
    throttle_daily_limit: number
    min_interval_seconds: number
    jitter_seconds: number
    send_window_enabled: boolean
    send_window_start: string
    send_window_end: string
    send_timezone: string
    skip_weekend: boolean
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  if (data.throttle_daily_limit < 1 || data.throttle_daily_limit > 500)
    return { error: 'Limite quotidienne : entre 1 et 500' }
  if (data.min_interval_seconds < 60 || data.min_interval_seconds > 86400)
    return { error: 'Intervalle : entre 60 s et 86 400 s (24 h)' }
  if (data.jitter_seconds < 0 || data.jitter_seconds > data.min_interval_seconds)
    return { error: 'Variation aléatoire : entre 0 et la valeur de l\'intervalle' }

  const { error } = await supabase
    .from('sender_identities')
    .update(data)
    .eq('id', identityId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/domaines')
  return {}
}
