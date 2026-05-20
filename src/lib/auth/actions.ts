'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

type AuthState = { error: string } | { success: string } | null

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email:    formData.get('email')    as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function signupWithProfile(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  // Create auth account
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        first_name: formData.get('firstName'),
        last_name:  formData.get('lastName'),
      },
    },
  })

  if (error) return { error: error.message }

  const userId = data.user?.id
  if (!userId) return { error: 'Erreur lors de la création du compte.' }

  // Save full profile via admin (bypasses RLS, works before email confirmation)
  const goals = formData.getAll('goals') as string[]
  await admin.from('profiles').upsert({
    id:             userId,
    first_name:     formData.get('firstName')      as string,
    last_name:      formData.get('lastName')       as string,
    phone:          formData.get('phone')          as string,
    address_line:   formData.get('addressLine')    as string,
    city:           formData.get('city')           as string,
    postal_code:    formData.get('postalCode')     as string,
    country:        formData.get('country')        as string,
    company:        formData.get('company')        as string,
    industry:       formData.get('industry')       as string,
    team_size:      formData.get('teamSize')       as string,
    goals,
    referral_source: formData.get('referralSource') as string,
    onboarding_completed: true,
  })

  return { success: 'Vérifie ton email pour confirmer ton compte.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
