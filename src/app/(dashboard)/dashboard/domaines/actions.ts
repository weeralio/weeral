'use server'

import { createClient } from '@/lib/supabase/server'
import { getSESClient, initDomainDkim, getDomainTxtRecord, getDomainVerificationStatus, verifyEmailIdentity } from '@/lib/ses'
import { revalidatePath } from 'next/cache'

type State = { error: string } | { success: string } | null

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

export async function deleteDomain(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('domains').delete().eq('id', id)
  revalidatePath('/dashboard/domaines')
}

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
    return { status }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erreur SES' }
  }
}

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

  const { error } = await supabase.from('sender_identities').insert({
    user_id: user.id,
    domain_id: domainId,
    email,
    display_name: displayName || null,
    ses_verified: false,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Cette adresse existe déjà' }
    return { error: error.message }
  }

  revalidatePath(`/dashboard/domaines/${domainId}`)
  return { success: `${email} ajouté.` }
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
