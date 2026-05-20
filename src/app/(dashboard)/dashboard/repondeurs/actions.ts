'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAutoResponder(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('auto_responders').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    trigger_event: formData.get('trigger_event') as string,
    delay_minutes: parseInt(formData.get('delay_minutes') as string) || 0,
    sender_identity_id: (formData.get('sender_identity_id') as string) || null,
    subject: formData.get('subject') as string,
    body_html: formData.get('body_html') as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/repondeurs')
  return {}
}

export async function toggleAutoResponder(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('auto_responders')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/repondeurs')
  return {}
}

export async function deleteAutoResponder(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('auto_responders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/repondeurs')
  return {}
}
