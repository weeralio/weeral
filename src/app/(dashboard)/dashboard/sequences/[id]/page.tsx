import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import StepsEditor from './steps-editor'
import EnrollForm from './enroll-form'

export default async function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: sequence },
    { data: steps },
    { data: enrollments },
    { data: seqMailboxRows },
    { data: allIdentities },
    { count: totalCount },
    { data: rawLists },
    { data: members },
  ] = await Promise.all([
    supabase.from('seq').select('*').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('seq_step').select('*').eq('seq_id', id).order('step_number'),
    supabase.from('seq_enrollment').select('id, status').eq('seq_id', id),
    supabase.from('seq_mailbox').select('mailbox_id, sender_identities!mailbox_id(id, email, display_name)').eq('seq_id', id),
    supabase.from('sender_identities').select('id, email, display_name').eq('user_id', user!.id).order('email'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('unsubscribed', false),
    supabase.from('contact_lists').select('id, name, color').eq('user_id', user!.id).order('name'),
    supabase.from('contact_list_members').select('list_id'),
  ])

  if (!sequence) notFound()

  // Send stats from unified sends table
  const enrollmentIds = (enrollments ?? []).map(e => e.id)
  const [{ data: sendStats }, { data: failedSends }] = await (enrollmentIds.length > 0
    ? Promise.all([
        supabase.from('sends').select('status, opened_at, clicked_at, step_number').in('seq_enrollment_id', enrollmentIds),
        supabase.from('sends').select('id, step_number, last_error, contact_id, contacts!contact_id(email)').in('seq_enrollment_id', enrollmentIds).eq('status', 'failed').order('created_at', { ascending: false }).limit(20),
      ])
    : Promise.resolve([
        { data: [] as Array<{ status: string; opened_at: string | null; clicked_at: string | null; step_number: number }> },
        { data: [] as Array<{ id: string; step_number: number; last_error: string | null; contact_id: string; contacts: { email: string } | null }> },
      ])
  )

  const countMap: Record<string, number> = {}
  for (const m of members ?? []) {
    countMap[m.list_id] = (countMap[m.list_id] ?? 0) + 1
  }
  const lists = (rawLists ?? []).map(l => ({ ...l, count: countMap[l.id] ?? 0 }))

  const stats = {
    active:    enrollments?.filter(e => e.status === 'active').length    ?? 0,
    completed: enrollments?.filter(e => e.status === 'completed').length  ?? 0,
    replied:   enrollments?.filter(e => e.status === 'replied').length    ?? 0,
    total:     enrollments?.length ?? 0,
  }

  const totalSends   = sendStats?.length ?? 0
  const totalOpened  = sendStats?.filter(s => s.opened_at !== null).length ?? 0
  const totalClicked = sendStats?.filter(s => s.clicked_at !== null).length ?? 0
  const totalBounced = sendStats?.filter(s => s.status === 'failed').length ?? 0
  const openRate     = totalSends > 0 ? Math.round((totalOpened  / totalSends) * 100) : 0
  const clickRate    = totalSends > 0 ? Math.round((totalClicked / totalSends) * 100) : 0

  // Stats par étape
  const stepStats = (steps ?? []).map(step => {
    const stepSends = (sendStats ?? []).filter(s => s.step_number === step.step_number)
    const sent    = stepSends.filter(s => ['sent', 'failed'].includes(s.status)).length
    const opened  = stepSends.filter(s => s.opened_at !== null).length
    const clicked = stepSends.filter(s => s.clicked_at !== null).length
    return { step_number: step.step_number, subject: step.subject, sent, opened, clicked }
  })

  // Assigned mailboxes — normalize the join
  const assignedMailboxes = (seqMailboxRows ?? []).map(r => {
    const identity = Array.isArray(r.sender_identities) ? r.sender_identities[0] : r.sender_identities
    return {
      mailbox_id:   r.mailbox_id,
      email:        (identity as { email?: string } | null)?.email ?? '',
      display_name: (identity as { display_name?: string | null } | null)?.display_name ?? null,
    }
  })

  const assignedIds = new Set(assignedMailboxes.map(m => m.mailbox_id))
  const availableIdentities = (allIdentities ?? []).filter(i => !assignedIds.has(i.id))

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link href="/dashboard/sequences" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Séquences
        </Link>
        <h1 className="text-2xl font-bold text-white">{sequence.name}</h1>
        {sequence.description && <p className="text-sm text-[#475569] mt-1">{sequence.description}</p>}
      </div>

      {/* Stats enrollments */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: 'Total',    value: stats.total,     color: 'text-white' },
              { label: 'En cours', value: stats.active,    color: 'text-violet-400' },
              { label: 'Terminés', value: stats.completed, color: 'text-emerald-400' },
              { label: 'Réponses', value: stats.replied,   color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[#475569] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Send stats */}
      {totalSends > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-4">Performance des envois</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Emails envoyés', value: totalSends.toLocaleString(),   color: 'text-white' },
                { label: 'Ouvertures',     value: `${openRate}%`,               color: 'text-emerald-400', sub: `${totalOpened} emails` },
                { label: 'Clics',          value: `${clickRate}%`,              color: 'text-blue-400',    sub: `${totalClicked} emails` },
                { label: 'Bounces',        value: totalBounced.toLocaleString(), color: totalBounced > 0 ? 'text-red-400' : 'text-[#475569]' },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-[#475569] mt-0.5">{s.label}</p>
                  {'sub' in s && s.sub && <p className="text-[10px] text-[#3b3b6f] mt-0.5">{s.sub}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats par étape */}
      {stepStats.some(s => s.sent > 0) && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-4">Détail par étape</p>
            <div className="space-y-2">
              {stepStats.filter(s => s.sent > 0).map(s => (
                <div key={s.step_number} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-[#1e1e3f] flex items-center justify-center text-xs font-bold text-[#94a3b8] shrink-0">
                    {s.step_number}
                  </div>
                  <span className="flex-1 text-[#94a3b8] truncate text-xs">{s.subject}</span>
                  <div className="flex items-center gap-4 text-xs text-[#475569] shrink-0">
                    <span>{s.sent} envoyé{s.sent > 1 ? 's' : ''}</span>
                    <span className="text-emerald-400">{s.sent > 0 ? Math.round((s.opened / s.sent) * 100) : 0}% ouverts</span>
                    <span className="text-blue-400">{s.sent > 0 ? Math.round((s.clicked / s.sent) * 100) : 0}% clics</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sends en erreur (last_error) */}
      {(failedSends?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-4">Erreurs d&apos;envoi récentes</p>
            <div className="space-y-2">
              {(failedSends ?? []).map(s => {
                const contact = Array.isArray(s.contacts) ? s.contacts[0] : s.contacts
                return (
                  <div key={s.id} className="flex items-start gap-3 text-xs">
                    <span className="text-[#475569] shrink-0">Étape {s.step_number}</span>
                    <span className="text-[#94a3b8] flex-1 truncate">{(contact as { email?: string } | null)?.email ?? s.contact_id}</span>
                    <span className="text-red-400 shrink-0 max-w-[200px] truncate">{s.last_error ?? 'Erreur inconnue'}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enroll */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inscrire des contacts</CardTitle>
          <CardDescription>Assigne des boîtes d&apos;envoi à cette séquence, puis lance l&apos;inscription.</CardDescription>
        </CardHeader>
        <CardContent>
          <EnrollForm
            sequenceId={id}
            assignedMailboxes={assignedMailboxes}
            availableIdentities={availableIdentities}
            lists={lists}
            totalCount={totalCount ?? 0}
          />
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Étapes de la séquence</CardTitle>
          <CardDescription>{steps?.length ?? 0} email{(steps?.length ?? 1) !== 1 ? 's' : ''} · cliquer pour modifier</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <StepsEditor
            sequenceId={id}
            steps={(steps ?? []).map(s => ({
              id:             s.id,
              sequence_id:    s.seq_id,
              step_number:    s.step_number,
              delay_days:     s.delay_days,
              subject:        s.subject,
              body_html:      s.body_html,
              send_condition: s.send_condition,
              objective:      s.objective,
              ai_tip:         s.ai_tip,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
