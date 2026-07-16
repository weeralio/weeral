import { createServiceClient } from '@/lib/supabase/server'
import { verifyTrackingToken } from '@/lib/tokens'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cid    = searchParams.get('cid')
  const cmpid  = searchParams.get('cmpid')
  const token  = searchParams.get('t')
  const rawUrl = searchParams.get('url')

  // Always redirect — tracking is best-effort
  const destination = rawUrl ? decodeURIComponent(rawUrl) : '/'

  if (!cid || !cmpid || !token || !rawUrl) return NextResponse.redirect(destination)
  if (!verifyTrackingToken(`${cid}:${cmpid}`, token)) return NextResponse.redirect(destination)

  try {
    const supabase = createServiceClient()
    const clickedAt = new Date().toISOString()

    // Campagnes classiques : mise à jour de la table emails
    const { data: rows } = await supabase
      .from('emails')
      .select('id, status')
      .eq('contact_id', cid)
      .eq('campaign_id', cmpid)
      .in('status', ['sent', 'opened'])
      .limit(1)

    const email = rows?.[0]
    if (email) {
      await supabase
        .from('emails')
        .update({ status: 'clicked', clicked_at: clickedAt })
        .eq('id', email.id)
    }

    // Séquences : cmpid = enrollment.id — mise à jour du dernier envoi de séquence
    if (!email) {
      const { data: seqRows } = await supabase
        .from('sequence_sends')
        .select('id')
        .eq('enrollment_id', cmpid)
        .is('clicked_at', null)
        .order('sent_at', { ascending: false })
        .limit(1)

      const seqSend = seqRows?.[0]
      if (seqSend) {
        await supabase
          .from('sequence_sends')
          .update({ clicked_at: clickedAt })
          .eq('id', seqSend.id)
      }
    }
  } catch {
    // Never block redirect on DB errors
  }

  return NextResponse.redirect(destination)
}
