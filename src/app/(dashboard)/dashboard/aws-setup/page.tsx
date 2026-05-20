import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AwsSetupGuide from './guide'

export default async function AwsSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creds } = await supabase
    .from('aws_credentials')
    .select('aws_region')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuration AWS SES</h1>
        <p className="text-sm text-[#475569] mt-1">
          Suis ce guide étape par étape pour connecter ton compte AWS et commencer à envoyer des emails.
        </p>
      </div>
      <AwsSetupGuide
        hasCredentials={!!creds}
        existingRegion={creds?.aws_region ?? 'eu-west-1'}
      />
    </div>
  )
}
