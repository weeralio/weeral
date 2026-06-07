'use server'

import { createClient } from '@/lib/supabase/server'
import { getSESClient, verifyEmailIdentity } from '@/lib/ses'
import { revalidatePath } from 'next/cache'
import { getUserLimits } from '@/lib/credits'

type State = { error: string } | { success: string } | null

// ─── Add single contact ───────────────────────────────────────────────────────

export async function addContact(prevState: State, formData: FormData): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const limits = await getUserLimits(user.id)
  if (limits.atContactsLimit) {
    return { error: 'Limite de 100 contacts atteinte. Passez à un plan payant sur /pricing.' }
  }

  const email = (formData.get('email') as string)?.toLowerCase().trim()
  if (!email) return { error: 'Email requis' }

  const { error } = await supabase.from('contacts').insert({
    user_id: user.id,
    email,
    first_name: (formData.get('first_name') as string) || null,
    last_name:  (formData.get('last_name') as string) || null,
    company:    (formData.get('company') as string) || null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Ce contact existe déjà' }
    return { error: error.message }
  }

  revalidatePath('/dashboard/contacts')
  return { success: `${email} ajouté.` }
}

// ─── Import CSV ───────────────────────────────────────────────────────────────

export async function importContacts(prevState: State, formData: FormData): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const limits = await getUserLimits(user.id)
  if (limits.atContactsLimit) {
    return { error: 'Limite de 100 contacts atteinte. Passez à un plan payant sur /pricing.' }
  }

  const file = formData.get('csv') as File
  if (!file) return { error: 'Fichier requis' }

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { error: 'CSV vide ou invalide' }

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
  const emailIdx = headers.indexOf('email')
  if (emailIdx === -1) return { error: 'Colonne "email" introuvable dans le CSV' }

  const firstNameIdx = headers.indexOf('first_name')
  const lastNameIdx  = headers.indexOf('last_name')
  const companyIdx   = headers.indexOf('company')

  const contacts = lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
    return {
      user_id:    user.id,
      email:      cols[emailIdx]?.toLowerCase(),
      first_name: firstNameIdx >= 0 ? cols[firstNameIdx] || null : null,
      last_name:  lastNameIdx  >= 0 ? cols[lastNameIdx]  || null : null,
      company:    companyIdx   >= 0 ? cols[companyIdx]   || null : null,
    }
  }).filter(c => c.email?.includes('@'))

  if (!contacts.length) return { error: 'Aucun contact valide trouvé' }

  let imported = 0
  for (let i = 0; i < contacts.length; i += 500) {
    const { error } = await supabase
      .from('contacts')
      .upsert(contacts.slice(i, i + 500), { onConflict: 'user_id,email', ignoreDuplicates: true })
    if (error) return { error: error.message }
    imported += Math.min(500, contacts.length - i)
  }

  revalidatePath('/dashboard/contacts')
  return { success: `${imported} contacts importés.` }
}

// ─── Delete contacts (single or bulk) ────────────────────────────────────────

export async function deleteContact(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('contacts').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/contacts')
}

export async function deleteContacts(ids: string[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('contacts')
    .delete()
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/contacts')
  return {}
}

// ─── Export contacts as CSV string ───────────────────────────────────────────

export async function exportContactsCSV(listId?: string): Promise<{ error?: string; csv?: string; filename?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  let query = supabase
    .from('contacts')
    .select('email, first_name, last_name, company, unsubscribed, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (listId) {
    const { data: memberIds } = await supabase
      .from('contact_list_members')
      .select('contact_id')
      .eq('list_id', listId)
    const ids = memberIds?.map(m => m.contact_id) ?? []
    if (!ids.length) return { csv: 'email,first_name,last_name,company,unsubscribed\n', filename: 'contacts.csv' }
    query = query.in('id', ids)
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  const rows = (data ?? []).map(c => [
    c.email,
    c.first_name ?? '',
    c.last_name ?? '',
    c.company ?? '',
    c.unsubscribed ? 'oui' : 'non',
    new Date(c.created_at).toLocaleDateString('fr-FR'),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const csv = ['email,first_name,last_name,company,desabonne,date_ajout', ...rows].join('\n')
  const filename = `contacts-${new Date().toISOString().split('T')[0]}.csv`
  return { csv, filename }
}

// ─── Contact lists ────────────────────────────────────────────────────────────

export async function createContactList(name: string, color = '#8b5cf6'): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase
    .from('contact_lists')
    .insert({ user_id: user.id, name, color })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'Une liste avec ce nom existe déjà' }
    return { error: error.message }
  }
  revalidatePath('/dashboard/contacts')
  return { id: data.id }
}

export async function deleteContactList(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('contact_lists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/contacts')
  return {}
}

export async function addContactsToList(listId: string, contactIds: string[]): Promise<{ error?: string; added?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase
    .from('contact_list_members')
    .upsert(
      contactIds.map(id => ({ list_id: listId, contact_id: id })),
      { onConflict: 'list_id,contact_id', ignoreDuplicates: true }
    )
    .select('contact_id')

  if (error) return { error: error.message }
  revalidatePath('/dashboard/contacts')
  return { added: data?.length ?? 0 }
}

export async function removeContactsFromList(listId: string, contactIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Verify list ownership before deleting members
  const { data: list } = await supabase.from('contact_lists').select('id').eq('id', listId).eq('user_id', user.id).single()
  if (!list) return { error: 'Liste introuvable' }

  const { error } = await supabase
    .from('contact_list_members')
    .delete()
    .eq('list_id', listId)
    .in('contact_id', contactIds)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/contacts')
  return {}
}

// ─── SES email verification ───────────────────────────────────────────────────

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
