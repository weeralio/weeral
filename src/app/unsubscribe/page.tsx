import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken } from '@/lib/tokens'

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ cid?: string; cmpid?: string; sig?: string }>
}) {
  const { cid, cmpid, sig } = await searchParams

  if (!cid || !cmpid || !sig) {
    return <UnsubscribePage.Error message="Lien invalide." />
  }

  const valid = verifyUnsubscribeToken(cid, cmpid, sig)
  if (!valid) {
    return <UnsubscribePage.Error message="Lien invalide ou expiré." />
  }

  const supabase = createServiceClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('email, unsubscribed')
    .eq('id', cid)
    .single()

  if (!contact) {
    return <UnsubscribePage.Error message="Contact introuvable." />
  }

  if (!contact.unsubscribed) {
    await supabase
      .from('contacts')
      .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
      .eq('id', cid)

    await supabase
      .from('campaign_contacts')
      .update({ status: 'unsubscribed' })
      .eq('contact_id', cid)
      .eq('campaign_id', cmpid)
      .eq('status', 'pending')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Désinscription confirmée</h1>
        <p className="text-sm text-gray-500">
          {contact.email} a été désinscrit. Vous ne recevrez plus d&apos;emails de notre part.
        </p>
      </div>
    </div>
  )
}

UnsubscribePage.Error = function Error({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  )
}
