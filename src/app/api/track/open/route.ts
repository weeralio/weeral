import { createServiceClient } from '@/lib/supabase/server'
import { verifyTrackingToken } from '@/lib/tokens'
import { NextResponse } from 'next/server'

// 1×1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cid   = searchParams.get('cid')
  const cmpid = searchParams.get('cmpid')
  const token = searchParams.get('t')

  const pixel = new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })

  if (!cid || !cmpid || !token) return pixel
  if (!verifyTrackingToken(`${cid}:${cmpid}`, token)) return pixel

  try {
    const supabase = createServiceClient()
    const openedAt = new Date().toISOString()

    // Campagnes classiques : mise à jour de la table emails
    const { data: rows } = await supabase
      .from('emails')
      .select('id, status')
      .eq('contact_id', cid)
      .eq('campaign_id', cmpid)
      .eq('status', 'sent')
      .limit(1)

    const email = rows?.[0]
    if (email) {
      await supabase
        .from('emails')
        .update({ status: 'opened', opened_at: openedAt })
        .eq('id', email.id)
    }

    // Séquences : cmpid = enrollment.id — mise à jour du dernier envoi de séquence
    if (!email) {
      const { data: seqRows } = await supabase
        .from('sequence_sends')
        .select('id')
        .eq('enrollment_id', cmpid)
        .is('opened_at', null)
        .order('sent_at', { ascending: false })
        .limit(1)

      const seqSend = seqRows?.[0]
      if (seqSend) {
        await supabase
          .from('sequence_sends')
          .update({ opened_at: openedAt })
          .eq('id', seqSend.id)
      }
    }
  } catch {
    // Never block pixel delivery on DB errors
  }

  return pixel
}
