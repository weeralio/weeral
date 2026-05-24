import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CampaignControls from './campaign-controls'
import TestEmailButton from './test-email-button'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Brouillon', className: 'bg-[#111128] text-[#94a3b8] border border-[#1e1e3f]' },
  running:   { label: 'En cours',  className: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' },
  paused:    { label: 'Pausée',    className: 'bg-amber-950/40 text-amber-400 border border-amber-800/40' },
  completed: { label: 'Terminée', className: 'bg-[#111128] text-[#475569] border border-[#1e1e3f]' },
  blocked:   { label: 'Bloquée',  className: 'bg-red-950/40 text-red-400 border border-red-800/40' },
}

const CONTACT_STATUS: Record<string, { label: string; className: string }> = {
  pending:     { label: 'En attente',  className: 'text-[#475569]' },
  sent:        { label: 'Envoyé',      className: 'text-emerald-400' },
  opened:      { label: 'Ouvert',      className: 'text-blue-400' },
  clicked:     { label: 'Cliqué',      className: 'text-violet-400' },
  bounced:     { label: 'Bounce',      className: 'text-red-400' },
  complained:  { label: 'Plainte',     className: 'text-red-400' },
  failed:      { label: 'Échoué',      className: 'text-red-400' },
  unsubscribed:{ label: 'Désabonné',   className: 'text-[#475569]' },
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: campaign }, { data: campaignContacts }, { data: emailRows }] = await Promise.all([
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
      .order('sent_at', { ascending: false })
      .limit(200),
    supabase
      .from('emails')
      .select('status')
      .eq('campaign_id', id),
  ])

  if (!campaign) notFound()

  const identity = Array.isArray(campaign.sender_identities)
    ? campaign.sender_identities[0]
    : campaign.sender_identities

  // Stats from emails table (accurate open/click)
  const emails = emailRows ?? []
  const totalSent      = emails.filter(e => ['sent','opened','clicked'].includes(e.status)).length
  const totalOpened    = emails.filter(e => ['opened','clicked'].includes(e.status)).length
  const totalClicked   = emails.filter(e => e.status === 'clicked').length
  const totalBounced   = emails.filter(e => e.status === 'bounced').length
  const openRate       = totalSent > 0 ? ((totalOpened  / totalSent) * 100).toFixed(1) : '—'
  const clickRate      = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '—'

  const totalContacts = campaignContacts?.length ?? 0
  const totalPending  = campaignContacts?.filter(c => c.status === 'pending').length ?? 0

  const badge = STATUS_LABELS[campaign.status] ?? STATUS_LABELS.draft

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/campagnes" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Campagnes
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
        </div>
        <p className="text-sm text-[#475569] mt-1">Expéditeur : {identity?.email ?? '—'}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Envoyés',   value: totalSent.toLocaleString(),    color: 'text-white' },
          { label: 'Ouverture', value: typeof openRate === 'string' && openRate !== '—' ? `${openRate}%` : openRate, color: 'text-emerald-400' },
          { label: 'Clic',      value: typeof clickRate === 'string' && clickRate !== '—' ? `${clickRate}%` : clickRate, color: 'text-blue-400' },
          { label: 'Bounces',   value: totalBounced.toLocaleString(), color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#07070f] border border-[#1e1e3f] rounded-xl p-4">
            <p className="text-xs text-[#475569] uppercase tracking-wider mb-1.5">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <CampaignControls campaignId={id} status={campaign.status} />
        <TestEmailButton campaignId={id} />
      </div>

      {/* Subject */}
      <div className="bg-[#07070f] border border-[#1e1e3f] rounded-xl p-5">
        <p className="text-xs text-[#475569] uppercase tracking-wider mb-1.5">Objet</p>
        <p className="text-sm text-white">{campaign.subject}</p>
      </div>

      {/* Contacts table */}
      <div className="bg-[#07070f] border border-[#1e1e3f] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e3f] flex items-center justify-between">
          <p className="text-sm font-medium text-white">Contacts ({totalContacts})</p>
          {totalPending > 0 && (
            <span className="text-xs text-[#475569]">{totalPending} en attente</span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e3f]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#3b3b6f] uppercase tracking-wide">Email</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#3b3b6f] uppercase tracking-wide hidden sm:table-cell">Entreprise</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#3b3b6f] uppercase tracking-wide">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111128]">
            {campaignContacts?.map((cc) => {
              const contact = Array.isArray(cc.contacts) ? cc.contacts[0] : cc.contacts
              const st = CONTACT_STATUS[cc.status] ?? { label: cc.status, className: 'text-[#475569]' }
              return (
                <tr key={cc.id} className="hover:bg-[#111128]/50 transition-colors">
                  <td className="px-5 py-3 text-[#94a3b8]">{contact?.email ?? '—'}</td>
                  <td className="px-5 py-3 text-[#475569] hidden sm:table-cell">{contact?.company ?? '—'}</td>
                  <td className={`px-5 py-3 text-xs font-medium ${st.className}`}>{st.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
