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

  if (!cid || !cmpid || !token || !rawUrl) {
    return NextResponse.redirect(destination)
  }

  if (!verifyTrackingToken(`${cid}:${cmpid}`, token)) {
    return NextResponse.redirect(destination)
  }

  try {
    const supabase = createServiceClient()

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
        .update({ status: 'clicked', clicked_at: new Date().toISOString() })
        .eq('id', email.id)
    }
  } catch {
    // Never block redirect on DB errors
  }

  return NextResponse.redirect(destination)
}
