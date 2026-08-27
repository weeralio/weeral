import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import StepsEditor from './steps-editor'
import EnrollForm from './enroll-form'
import SequenceControls from './sequence-controls'
import MailboxesPanel from './mailboxes-panel'
import EnrollmentsList from './enrollments-list'
import type { EnrollmentRow, EnrollmentContact, LastSendEvent } from '../actions'

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
  ] = await Promise.all([
    supabase.from('seq').select('*').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('seq_step').select('*').eq('seq_id', id).order('step_number'),
    supabase.from('seq_enrollment').select('id, status').eq('seq_id', id),
    supabase.from('seq_mailbox')
      .select('mailbox_id, sender_identities!mailbox_id(id, email, display_name, throttle_daily_limit, throttle_sent_today, next_available_at, min_interval_seconds)')
      .eq('seq_id', id),
    supabase.from('sender_identities').select('id, email, display_name').eq('user_id', user!.id).order('email'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('unsubscribed', false),
    supabase.from('contact_lists').select('id, name, color').eq('user_id', user!.id).order('name'),
  ])

  if (!sequence) notFound()

  const enrollmentIds = (enrollments ?? []).map(e => e.id)

  // Second parallel batch — depends on enrollmentIds
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

  // Pending sends per mailbox + initial enrollment page — in parallel
  const [
    { data: pendingSendsByMailbox },
    { data: initialEnrollmentRows, count: enrollmentTotal },
  ] = await Promise.all([
    enrollmentIds.length > 0
      ? supabase.from('sends').select('mailbox_id').in('seq_enrollment_id', enrollmentIds).eq('status', 'pending')
      : Promise.resolve({ data: [] as Array<{ mailbox_id: string }> }),
    supabase.from('seq_enrollment')
      .select(
        'id, contact_id, mailbox_id, current_step, status, stop_reason, stopped_at, enrolled_at, completed_at, contacts!contact_id(id, email, first_name, last_name, prospect_status)',
        { count: 'exact' },
      )
      .eq('seq_id', id)
      .order('enrolled_at', { ascending: false })
      .range(0, 19),
  ])

  // Last events for the first enrollment page
  const initEnrIds = (initialEnrollmentRows ?? []).map(r => r.id)
  const { data: initEvents } = initEnrIds.length > 0
    ? await supabase
        .from('sends')
        .select('seq_enrollment_id, status, opened_at, clicked_at, step_number, scheduled_at, last_error')
        .in('seq_enrollment_id', initEnrIds)
        .order('created_at', { ascending: false })
    : { data: [] as LastSendEvent[] }

  const lastEventMap: Record<string, LastSendEvent> = {}
  for (const s of initEvents ?? []) {
    const e = s as LastSendEvent
    const existing = lastEventMap[e.seq_enrollment_id]
    if (!existing) {
      lastEventMap[e.seq_enrollment_id] = e
    } else if (
      (e.clicked_at && !existing.clicked_at) ||
      (e.opened_at && !existing.clicked_at && !existing.opened_at)
    ) {
      lastEventMap[e.seq_enrollment_id] = e
    }
  }

  const initialEnrollments: EnrollmentRow[] = (initialEnrollmentRows ?? []).map(r => {
    const contact = (Array.isArray(r.contacts) ? r.contacts[0] : r.contacts) as EnrollmentContact | null
    return {
      id:           r.id,
      contact_id:   r.contact_id,
      mailbox_id:   r.mailbox_id,
      current_step: r.current_step,
      status:       r.status,
      stop_reason:  r.stop_reason,
      stopped_at:   r.stopped_at,
      enrolled_at:  r.enrolled_at,
      completed_at: r.completed_at,
      contact:      contact,
      lastEvent:    lastEventMap[r.id] ?? null,
    }
  })

  // Pending count per mailbox
  const pendingPerMailbox: Record<string, number> = {}
  for (const s of pendingSendsByMailbox ?? []) {
    if (s.mailbox_id) pendingPerMailbox[s.mailbox_id] = (pendingPerMailbox[s.mailbox_id] ?? 0) + 1
  }

  // Per-list counts via HEAD queries (bypasses PostgREST max-rows limit)
  const listIds = rawLists?.map(l => l.id) ?? []
  const countMap: Record<string, number> = {}
  if (listIds.length > 0) {
    await Promise.all(listIds.map(async (lid) => {
      const { count: c } = await supabase
        .from('contact_list_members')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', lid)
      countMap[lid] = c ?? 0
    }))
  }
  const lists = (rawLists ?? []).map(l => ({ ...l, count: countMap[l.id] ?? 0 }))

  // Enrollment stats
  const stats = {
    active:    enrollments?.filter(e => e.status === 'active').length    ?? 0,
    completed: enrollments?.filter(e => e.status === 'completed').length  ?? 0,
    replied:   enrollments?.filter(e => e.status === 'replied').length    ?? 0,
    total:     enrollments?.length ?? 0,
  }

  // Send performance
  const totalSends   = sendStats?.filter(s => s.status === 'sent' || s.opened_at !== null || s.clicked_at !== null).length ?? 0
  const totalOpened  = sendStats?.filter(s => s.opened_at !== null).length ?? 0
  const totalClicked = sendStats?.filter(s => s.clicked_at !== null).length ?? 0
  const totalBounced = sendStats?.filter(s => s.status === 'failed').length ?? 0
  const openRate     = totalSends > 0 ? Math.round((totalOpened  / totalSends) * 100) : 0
  const clickRate    = totalSends > 0 ? Math.round((totalClicked / totalSends) * 100) : 0

  // Per-step stats
  const stepStats = (steps ?? []).map(step => {
    const stepSends = (sendStats ?? []).filter(s => s.step_number === step.step_number)
    const sent    = stepSends.filter(s => ['sent', 'failed'].includes(s.status)).length
    const opened  = stepSends.filter(s => s.opened_at !== null).length
    const clicked = stepSends.filter(s => s.clicked_at !== null).length
    return { step_number: step.step_number, subject: step.subject, sent, opened, clicked }
  })

  // Normalize mailbox rows for EnrollForm and MailboxesPanel
  const assignedMailboxes = (seqMailboxRows ?? []).map(r => {
    const identity = (Array.isArray(r.sender_identities) ? r.sender_identities[0] : r.sender_identities) as Record<string, unknown> | null
    return {
      mailbox_id:   r.mailbox_id,
      email:        (identity?.email as string) ?? '',
      display_name: (identity?.display_name as string | null) ?? null,
    }
  })

  const mailboxesData = (seqMailboxRows ?? []).map(r => {
    const identity = (Array.isArray(r.sender_identities) ? r.sender_identities[0] : r.sender_identities) as Record<string, unknown> | null
    return {
      mailbox_id:           r.mailbox_id,
      email:                (identity?.email as string) ?? '',
      display_name:         (identity?.display_name as string | null) ?? null,
      throttle_daily_limit: (identity?.throttle_daily_limit as number) ?? 25,
      throttle_sent_today:  (identity?.throttle_sent_today as number) ?? 0,
      next_available_at:    (identity?.next_available_at as string | null) ?? null,
      min_interval_seconds: (identity?.min_interval_seconds as number) ?? 300,
      pendingCount:         pendingPerMailbox[r.mailbox_id] ?? 0,
    }
  })

  const assignedIds = new Set(assignedMailboxes.map(m => m.mailbox_id))
  const availableIdentities = (allIdentities ?? []).filter(i => !assignedIds.has(i.id))

  const seqStatus = ((sequence as Record<string, unknown>).status ?? 'active') as 'active' | 'paused' | 'stopped'

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

      {/* Sequence controls */}
      <Card>
        <CardContent className="p-4">
          <SequenceControls
            seqId={id}
            initialStatus={seqStatus}
            activeCount={stats.active}
          />
        </CardContent>
      </Card>

      {/* Enrollment stats */}
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

      {/* Boîtes au travail */}
      {mailboxesData.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <MailboxesPanel mailboxes={mailboxesData} />
          </CardContent>
        </Card>
      )}

      {/* Send performance */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-4">Performance des envois</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Emails envoyés', value: totalSends.toLocaleString(),    color: 'text-white' },
                { label: 'Ouvertures',     value: `${openRate}%`,                color: 'text-emerald-400', sub: `${totalOpened} emails` },
                { label: 'Clics',          value: `${clickRate}%`,               color: 'text-blue-400',    sub: `${totalClicked} emails` },
                { label: 'Bounces',        value: totalBounced.toLocaleString(),  color: totalBounced > 0 ? 'text-red-400' : 'text-[#475569]' },
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

      {/* Per-step stats */}
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

      {/* Recent send errors */}
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

      {/* Contact enrollment list */}
      <Card>
        <CardContent className="p-5">
          <EnrollmentsList
            seqId={id}
            totalSteps={steps?.length ?? 0}
            initialEnrollments={initialEnrollments}
            initialTotal={enrollmentTotal ?? 0}
          />
        </CardContent>
      </Card>

      {/* Enroll new contacts */}
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

      {/* Steps editor */}
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
