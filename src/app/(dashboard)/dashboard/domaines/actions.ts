'use server'

import { createClient } from '@/lib/supabase/server'
import { getSESClient, initDomainDkim, getDomainTxtRecord, getDomainVerificationStatus, verifyEmailIdentity } from '@/lib/ses'
import { revalidatePath } from 'next/cache'

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
  await supabase.from('sender_identities').delete().eq('domain_id', id)
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
