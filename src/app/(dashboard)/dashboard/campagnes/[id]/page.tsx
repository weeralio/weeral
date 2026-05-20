import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CampaignControls from './campaign-controls'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600' },
  running:   { label: 'En cours',  className: 'bg-green-50 text-green-700' },
  paused:    { label: 'Pausée',    className: 'bg-yellow-50 text-yellow-700' },
  completed: { label: 'Terminée', className: 'bg-gray-100 text-gray-500' },
  blocked:   { label: 'Bloquée',  className: 'bg-red-50 text-red-700' },
}

const CONTACT_STATUS_LABELS: Record<string, string> = {
  pending:    'En attente',
  sent:       'Envoyé',
  bounced:    'Bounce',
  complained: 'Plainte',
  failed:     'Échoué',
  unsubscribed: 'Désabonné',
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: campaign }, { data: campaignContacts }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('*, sender_identities(email, display_name)')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('campaign_contacts')
      .select('id, status, sent_at, contacts(email, first_name, company)')
      .eq('campaign_id', id)
      .limit(200),
  ])

  if (!campaign) notFound()

  const stats = {
    total: campaignContacts?.length ?? 0,
    sent: campaignContacts?.filter(c => c.status === 'sent').length ?? 0,
    pending: campaignContacts?.filter(c => c.status === 'pending').length ?? 0,
    bounced: campaignContacts?.filter(c => c.status === 'bounced').length ?? 0,
    failed: campaignContacts?.filter(c => c.status === 'failed').length ?? 0,
  }

  const badge = STATUS_LABELS[campaign.status] ?? STATUS_LABELS.draft
  const identity = Array.isArray(campaign.sender_identities)
    ? campaign.sender_identities[0]
    : campaign.sender_identities

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/campagnes" className="text-sm text-gray-500 hover:text-gray-900">
          ← Campagnes
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Expéditeur : {identity?.email ?? '—'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Envoyés', value: stats.sent },
          { label: 'En attente', value: stats.pending },
          { label: 'Bounces', value: stats.bounced },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <CampaignControls campaignId={id} status={campaign.status} />

      {/* Objet */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 my-6">
        <p className="text-xs text-gray-500 mb-1">Objet</p>
        <p className="text-sm text-gray-900">{campaign.subject}</p>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">Contacts ({stats.total})</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Entreprise</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campaignContacts?.map((cc) => {
              const contact = Array.isArray(cc.contacts) ? cc.contacts[0] : cc.contacts
              return (
                <tr key={cc.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{contact?.email ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{contact?.company ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      cc.status === 'sent' ? 'bg-green-50 text-green-700' :
                      cc.status === 'bounced' ? 'bg-red-50 text-red-700' :
                      cc.status === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {CONTACT_STATUS_LABELS[cc.status] ?? cc.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
