import { createClient } from '@/lib/supabase/server'
import NavClient from './nav-client'

export default async function MarketingNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <NavClient isLoggedIn={!!user} />
}
