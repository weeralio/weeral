import { createServiceClient } from '@/lib/supabase/server'
import { verifyTrackingToken, verifySendTrackingToken } from '@/lib/tokens'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sid    = searchParams.get('sid')    // format unifié (sends.id)
  const cid    = searchParams.get('cid')    // format legacy
  const cmpid  = searchParams.get('cmpid')  // format legacy
  const token  = searchParams.get('t')
  const rawUrl = searchParams.get('url')

  const destination = rawUrl ? decodeURIComponent(rawUrl) : '/'

  if (!token || !rawUrl) return NextResponse.redirect(destination)

  try {
    const supabase   = createServiceClient()
    const clickedAt  = new Date().toISOString()

    // ── Format unifié : ?sid=sendId ───────────────────────────────────────────
    if (sid && verifySendTrackingToken(sid, token)) {
      await supabase
        .from('sends')
        .update({ clicked_at: clickedAt })
        .eq('id', sid)
        .is('clicked_at', null)
      return NextResponse.redirect(destination)
    }

    // ── Format legacy : ?cid=...&cmpid=... ────────────────────────────────────
    if (cid && cmpid && verifyTrackingToken(`${cid}:${cmpid}`, token)) {
      const { data: rows } = await supabase
        .from('emails')
        .select('id, status')
        .eq('contact_id', cid)
        .eq('campaign_id', cmpid)
        .in('status', ['sent', 'opened'])
        .limit(1)

      if (rows?.[0]) {
        await supabase
          .from('emails')
          .update({ status: 'clicked', clicked_at: clickedAt })
          .eq('id', rows[0].id)
      }
    }
  } catch {
    // Ne jamais bloquer la redirection sur une erreur DB
  }

  return NextResponse.redirect(destination)
}
