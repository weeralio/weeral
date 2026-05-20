import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import ContentAnalyzer from '@/components/dashboard/content-analyzer'
import CampaignControls from './campaign-controls'

const PHASE_INFO = [
  null,
  { emoji: '🌙', name: 'Silence',      days: 'J1–J3',  text: 'text-slate-400',   bg: 'bg-slate-800/30',   border: 'border-slate-700/30' },
  { emoji: '💬', name: 'Échauffement', days: 'J4–J8',  text: 'text-blue-400',    bg: 'bg-blue-950/30',    border: 'border-blue-700/30' },
  { emoji: '🔗', name: 'Activation',   days: 'J9',     text: 'text-violet-400',  bg: 'bg-violet-950/30',  border: 'border-violet-700/30' },
  { emoji: '🎯', name: 'Test A/B',     days: 'J10–J11',text: 'text-amber-400',   bg: 'bg-amber-950/30',   border: 'border-amber-700/30' },
  { emoji: '🚀', name: 'Décollage',    days: 'J12+',   text: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-700/30' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:          { label: 'Active',     color: 'text-emerald-400' },
  paused:          { label: 'Pausée',     color: 'text-amber-400' },
  waiting_content: { label: 'En attente', color: 'text-violet-400' },
  completed:       { label: 'Terminée',   color: 'text-[#475569]' },
}

export default async function IACampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: campaign },
    { data: contentRequests },
    { data: contactStats },
  ] = await Promise.all([
    supabase
      .from('ia_campaigns')
      .select('*, domains(domain)')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('ia_content_requests')
      .select('*')
      .eq('campaign_id', id)
      .order('phase_id', { ascending: true }),
    supabase
      .from('ia_campaign_contacts')
      .select('status')
      .eq('campaign_id', id),
  ])

  if (!campaign) notFound()

  const domain = Array.isArray(campaign.domains) ? campaign.domains[0] : campaign.domains
  const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.active

  const contactCounts = {
    total: contactStats?.length ?? 0,
    sent: contactStats?.filter(c => c.status === 'sent').length ?? 0,
    pending: contactStats?.filter(c => c.status === 'pending').length ?? 0,
    bounced: contactStats?.filter(c => c.status === 'bounced').length ?? 0,
  }

  // Active content request = most recent pending
  const pendingRequest = contentRequests?.find(r => r.status === 'pending' || r.status === 'needs_revision')

  const progressPct = campaign.total_contacts > 0
    ? Math.round((campaign.reached_count / campaign.total_contacts) * 100)
    : 0

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link href="/dashboard/campagnes-ia" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Campagnes IA
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
              <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
            {campaign.goal && <p className="text-sm text-[#475569] mt-1">{campaign.goal}</p>}
            <p className="text-xs text-[#475569] mt-1">{domain?.domain}</p>
          </div>
          <CampaignControls campaignId={id} status={campaign.status} />
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Contacts',  value: contactCounts.total.toLocaleString(),   color: 'text-white' },
              { label: 'Atteints',  value: campaign.reached_count.toLocaleString(), color: 'text-violet-400' },
              { label: 'Envoyés',   value: contactCounts.sent.toLocaleString(),     color: 'text-emerald-400' },
              { label: 'Bounces',   value: contactCounts.bounced.toLocaleString(),  color: contactCounts.bounced > 0 ? 'text-red-400' : 'text-[#475569]' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[#475569] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {campaign.total_contacts > 0 && (
            <div className="mt-4">
              <div className="h-1.5 w-full bg-[#1e1e3f] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-[#475569] mt-1">{progressPct}% de la liste atteinte</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active content request */}
      {pendingRequest && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <CardTitle className="text-base">Contenu requis par l&apos;IA</CardTitle>
            </div>
            <CardDescription>
              Écris le message — l&apos;IA le valide et l&apos;envoie automatiquement à la bonne phase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentAnalyzer request={{
              id: pendingRequest.id,
              phase_name: pendingRequest.phase_name,
              phase_id: pendingRequest.phase_id,
              brief: pendingRequest.brief,
              requirements: pendingRequest.requirements as string[],
              status: pendingRequest.status,
              user_raw_input: pendingRequest.user_raw_input,
              ai_score: pendingRequest.ai_score,
              ai_checks: pendingRequest.ai_checks as { label: string; passed: boolean; detail: string }[] | null,
              ai_issues: pendingRequest.ai_issues as string[] | null,
              ai_improvements: pendingRequest.ai_improvements as string[] | null,
              final_subject: pendingRequest.final_subject,
              final_body: pendingRequest.final_body,
              due_date: pendingRequest.due_date,
            }} />
          </CardContent>
        </Card>
      )}

      {/* Phase timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Séquence de warmup</CardTitle>
          <CardDescription>5 phases · contenu demandé à chaque transition</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PHASE_INFO.slice(1).map((phase, idx) => {
              if (!phase) return null
              const phaseId = idx + 1
              const req = contentRequests?.find(r => r.phase_id === phaseId)
              const isCurrent = campaign.current_phase === phaseId
              const isDone = campaign.current_phase > phaseId
              const isUpcoming = campaign.current_phase < phaseId

              return (
                <div key={phaseId} className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                  isCurrent ? `${phase.bg} ${phase.border}` : 'border-[#1e1e3f] bg-transparent'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isDone ? 'bg-[#1e1e3f] text-[#475569]' : isCurrent ? `${phase.bg} ${phase.text} border ${phase.border}` : 'bg-[#07070f] border border-[#1e1e3f] text-[#3b3b6f]'
                  }`}>
                    {isDone ? '✓' : phase.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${isDone ? 'text-[#475569]' : isCurrent ? 'text-white' : 'text-[#3b3b6f]'}`}>
                        {phase.name}
                      </span>
                      <span className="text-xs text-[#3b3b6f]">{phase.days}</span>
                      {isCurrent && <span className={`text-xs font-medium ${phase.text}`}>Phase actuelle</span>}
                    </div>

                    {req && (
                      <div className={`mt-1 text-xs ${
                        req.status === 'approved' ? 'text-emerald-400' :
                        req.status === 'needs_revision' ? 'text-amber-400' :
                        req.status === 'pending' ? 'text-violet-400' :
                        'text-[#475569]'
                      }`}>
                        {req.status === 'approved' ? '✓ Contenu approuvé' :
                         req.status === 'needs_revision' ? '⚠ Révision requise' :
                         req.status === 'pending' ? '● Contenu requis' : ''}
                      </div>
                    )}
                  </div>

                  {isUpcoming && (
                    <span className="text-xs text-[#3b3b6f] shrink-0">À venir</span>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* All content requests history */}
      {(contentRequests?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historique des contenus</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#1e1e3f]">
              {contentRequests!.map(req => {
                const phase = PHASE_INFO[req.phase_id]
                return (
                  <div key={req.id} className="px-5 py-4 flex items-start gap-3">
                    <span className="text-lg shrink-0">{phase?.emoji ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{req.phase_name}</p>
                      {req.final_subject && (
                        <p className="text-xs text-[#94a3b8] mt-0.5 truncate">Objet : {req.final_subject}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-medium ${
                        req.status === 'approved' ? 'text-emerald-400' :
                        req.status === 'needs_revision' ? 'text-amber-400' :
                        req.status === 'pending' ? 'text-violet-400' :
                        'text-[#475569]'
                      }`}>
                        {req.status === 'approved' ? 'Approuvé' :
                         req.status === 'needs_revision' ? 'À réviser' :
                         req.status === 'pending' ? 'En attente' : req.status}
                      </span>
                      {req.ai_score !== null && (
                        <p className="text-xs text-[#475569] mt-0.5">Score : {req.ai_score}/100</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
