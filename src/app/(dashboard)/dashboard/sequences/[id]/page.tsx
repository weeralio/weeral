import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import StepsEditor from './steps-editor'
import EnrollForm from './enroll-form'

const CONDITION_LABELS: Record<string, string> = {
  always:   'Toujours',
  no_reply: 'Si pas de réponse',
  no_open:  'Si pas d\'ouverture',
  no_click: 'Si pas de clic',
}

export default async function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: sequence },
    { data: steps },
    { data: enrollments },
    { data: identities },
    { count: totalCount },
    { data: rawLists },
    { data: members },
  ] = await Promise.all([
    supabase.from('sequences').select('*').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('sequence_steps').select('*').eq('sequence_id', id).order('step_number'),
    supabase.from('sequence_enrollments').select('status').eq('sequence_id', id),
    supabase.from('sender_identities').select('id, email, display_name').eq('user_id', user!.id),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('unsubscribed', false),
    supabase.from('contact_lists').select('id, name, color').eq('user_id', user!.id).order('name'),
    supabase.from('contact_list_members').select('list_id'),
  ])

  if (!sequence) notFound()

  const countMap: Record<string, number> = {}
  for (const m of members ?? []) {
    countMap[m.list_id] = (countMap[m.list_id] ?? 0) + 1
  }
  const lists = (rawLists ?? []).map(l => ({ ...l, count: countMap[l.id] ?? 0 }))

  const stats = {
    active:    enrollments?.filter(e => e.status === 'active').length ?? 0,
    completed: enrollments?.filter(e => e.status === 'completed').length ?? 0,
    replied:   enrollments?.filter(e => e.status === 'replied').length ?? 0,
    total:     enrollments?.length ?? 0,
  }

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

      {/* Stats */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: 'Total',     value: stats.total,    color: 'text-white' },
              { label: 'En cours',  value: stats.active,   color: 'text-violet-400' },
              { label: 'Terminés',  value: stats.completed,color: 'text-emerald-400' },
              { label: 'Réponses',  value: stats.replied,  color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[#475569] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enroll contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inscrire des contacts</CardTitle>
          <CardDescription>Sélectionne l&apos;adresse d&apos;envoi et lance la séquence sur tous tes contacts actifs.</CardDescription>
        </CardHeader>
        <CardContent>
          <EnrollForm
            sequenceId={id}
            identities={identities ?? []}
            lists={lists}
            totalCount={totalCount ?? 0}
            defaultIdentityId={sequence.sender_identity_id ?? ''}
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
              id: s.id,
              sequence_id: s.sequence_id,
              step_number: s.step_number,
              delay_days: s.delay_days,
              subject: s.subject,
              body_html: s.body_html,
              send_condition: s.send_condition,
              objective: s.objective,
              ai_tip: s.ai_tip,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
