import { createServiceClient } from '@/lib/supabase/server'
import { verifyTrackingToken, verifySendTrackingToken } from '@/lib/tokens'
import { NextResponse } from 'next/server'

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sid   = searchParams.get('sid')    // format unifié (sends.id)
  const cid   = searchParams.get('cid')    // format legacy (contactId)
  const cmpid = searchParams.get('cmpid')  // format legacy (campaignId)
  const token = searchParams.get('t')

  const pixel = new NextResponse(PIXEL, {
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma':        'no-cache',
    },
  })

  if (!token) return pixel

  try {
    const supabase  = createServiceClient()
    const openedAt  = new Date().toISOString()

    // ── Format unifié : ?sid=sendId ───────────────────────────────────────────
    if (sid && verifySendTrackingToken(sid, token)) {
      await supabase
        .from('sends')
        .update({ opened_at: openedAt })
        .eq('id', sid)
        .is('opened_at', null)
      return pixel
    }

    // ── Format legacy : ?cid=...&cmpid=... ────────────────────────────────────
    if (cid && cmpid && verifyTrackingToken(`${cid}:${cmpid}`, token)) {
      const { data: rows } = await supabase
        .from('emails')
        .select('id, status')
        .eq('contact_id', cid)
        .eq('campaign_id', cmpid)
        .eq('status', 'sent')
        .limit(1)

      if (rows?.[0]) {
        await supabase
          .from('emails')
          .update({ status: 'opened', opened_at: openedAt })
          .eq('id', rows[0].id)
      }
    }
  } catch {
    // Ne jamais bloquer la livraison du pixel sur une erreur DB
  }

  return pixel
}
